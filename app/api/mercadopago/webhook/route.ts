import {
  PreApproval,
  Payment,
  WebhookSignatureValidator,
  InvalidWebhookSignatureError
} from "mercadopago";
import { getMercadoPago } from "@/lib/mercadopago";
import { resolvePlanFromPreapproval } from "@/lib/mp-plan";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

async function syncPreapproval(preapprovalId: string, externalReference: string | null): Promise<void> {
  const preApproval = new PreApproval(getMercadoPago());
  const sub = await preApproval.get({ id: preapprovalId });
  const status = sub.status ?? "";

  if (status === "cancelled") {
    await prisma.providerProfile.updateMany({
      where: { mpPreapprovalId: preapprovalId },
      data: { cancelAtPeriodEnd: true, subscriptionStatus: "CANCELED" }
    });
    return;
  }

  const plan = resolvePlanFromPreapproval(status);
  if (plan === null) return;

  const nextPayment = sub.next_payment_date ? new Date(sub.next_payment_date) : null;
  const reference = sub.external_reference ?? externalReference;

  // Perfil já vinculado a essa preapproval (fluxo de cartão, ou Pix já
  // confirmado antes): atualiza por id, como sempre.
  const matchedById = await prisma.providerProfile.updateMany({
    where: { mpPreapprovalId: preapprovalId },
    data: {
      plan,
      subscriptionStatus: plan === "PRO" ? "ACTIVE" : "CANCELED",
      ...(plan === "FREE"
        ? { mpPreapprovalId: null, currentPeriodEnd: null }
        : { currentPeriodEnd: nextPayment }),
      cancelAtPeriodEnd: false
    }
  });

  if (matchedById.count > 0 || !reference || plan !== "PRO") return;

  // Reivindicação por external_reference. Vale para QUALQUER fluxo de
  // preapproval que carregue external_reference e ainda não esteja vinculada
  // localmente — não só o Pix por plano:
  //
  // - Pix por plano: a preapproval nasce no checkout do MP (o Vitriny só
  //   redireciona), então o external_reference do redirect é o único elo.
  // - Cartão: `createMpCardSubscription` também manda
  //   `external_reference: profile.id` na criação. Se a preapproval for
  //   autorizada no MP mas a escrita local falhar (e a compensação de
  //   cancelamento também falhar), o perfil fica sem `mpPreapprovalId` com uma
  //   assinatura viva lá. Este bloco cura esse estado no próximo evento.
  //
  // Isso é deliberado, não efeito colateral: server-to-server, sem contexto de
  // sessão, então não passa por `mpSubscriptionLockedAt` — a trava protege
  // criação concorrente de preapprovals, e aqui a preapproval já existe e já
  // foi autorizada pelo MP. Só reivindica um perfil que ainda não tem NENHUMA
  // preapproval — nunca sobrescreve uma diferente já vinculada.
  await prisma.providerProfile.updateMany({
    where: { id: reference, mpPreapprovalId: null },
    data: {
      mpPreapprovalId: preapprovalId,
      plan: "PRO",
      subscriptionStatus: "ACTIVE",
      currentPeriodEnd: nextPayment,
      cancelAtPeriodEnd: false
    }
  });
}

export async function POST(request: Request) {
  const url = new URL(request.url);
  const dataId = url.searchParams.get("data.id") ?? url.searchParams.get("id");

  try {
    WebhookSignatureValidator.validate({
      xSignature: request.headers.get("x-signature") ?? "",
      xRequestId: request.headers.get("x-request-id") ?? "",
      dataId: dataId ?? "",
      secret: process.env.MP_WEBHOOK_SECRET!
    });
  } catch (err) {
    if (err instanceof InvalidWebhookSignatureError) {
      return new Response("Invalid signature", { status: 401 });
    }
    throw err;
  }

  const body = (await request.json().catch(() => ({}))) as {
    type?: string;
    data?: { id?: string };
  };

  const eventId = body.data?.id ?? dataId;
  if (!eventId) return new Response(null, { status: 200 });

  try {
    if (body.type === "subscription_preapproval") {
      await syncPreapproval(eventId, null);
      return new Response(null, { status: 200 });
    }

    if (body.type === "subscription_authorized_payment" || body.type === "payment") {
      const payment = new Payment(getMercadoPago());
      const paymentResource = await payment.get({ id: eventId });

      const preapprovalId =
        typeof paymentResource.metadata?.preapproval_id === "string"
          ? paymentResource.metadata.preapproval_id
          : null;

      // Sem id de preapproval no pagamento, não há o que sincronizar aqui —
      // a confirmação de verdade chega pelo evento subscription_preapproval.
      if (!preapprovalId) return new Response(null, { status: 200 });

      await syncPreapproval(preapprovalId, paymentResource.external_reference ?? null);
      return new Response(null, { status: 200 });
    }

    return new Response(null, { status: 200 });
  } catch (err) {
    console.error("Erro ao processar webhook Mercado Pago:", err);
    return new Response("Internal error", { status: 500 });
  }
}
