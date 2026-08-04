import {
  PreApproval,
  WebhookSignatureValidator,
  InvalidWebhookSignatureError
} from "mercadopago";
import { getMercadoPago } from "@/lib/mercadopago";
import { resolvePlanFromPreapproval } from "@/lib/mp-plan";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

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

  if (body.type !== "subscription_preapproval") {
    return new Response(null, { status: 200 });
  }

  const preapprovalId = body.data?.id ?? dataId;
  if (!preapprovalId) return new Response(null, { status: 200 });

  try {
    const preApproval = new PreApproval(getMercadoPago());
    const sub = await preApproval.get({ id: preapprovalId });
    const status = sub.status ?? "";

    // Cancelamento (nosso, via cancelMpSubscription, ou feito direto no app
    // do MP) nunca rebaixa na hora: só marca cancelAtPeriodEnd. Quem rebaixa
    // de verdade é a expiração lazy, quando currentPeriodEnd já tiver
    // passado — mesma semântica de lib/actions/mp-billing.ts.
    if (status === "cancelled") {
      await prisma.providerProfile.updateMany({
        where: { mpPreapprovalId: preapprovalId },
        data: { cancelAtPeriodEnd: true, subscriptionStatus: "CANCELED" }
      });
      return new Response(null, { status: 200 });
    }

    const plan = resolvePlanFromPreapproval(status);

    // Status sem plano resolvido (pending/desconhecido): não mexe no perfil.
    if (plan === null) {
      return new Response(null, { status: 200 });
    }

    const nextPayment = sub.next_payment_date ? new Date(sub.next_payment_date) : null;

    await prisma.providerProfile.updateMany({
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
  } catch (err) {
    console.error("Erro ao processar webhook Mercado Pago:", err);
    return new Response("Internal error", { status: 500 });
  }

  return new Response(null, { status: 200 });
}
