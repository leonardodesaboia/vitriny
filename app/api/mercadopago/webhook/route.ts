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

  // Primeira confirmação de uma preapproval nascida no checkout do plano
  // (Pix por plano): ainda não tem mpPreapprovalId gravado, só existe o
  // external_reference que mandamos no redirect (createMpPixSubscription).
  // Só reivindica um perfil que ainda não tem NENHUMA preapproval — nunca
  // sobrescreve uma diferente já vinculada.
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
