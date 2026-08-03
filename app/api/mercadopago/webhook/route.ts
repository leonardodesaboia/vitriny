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

    const plan = resolvePlanFromPreapproval(sub.status ?? "");

    // Status sem plano resolvido (pending/desconhecido): não mexe no perfil —
    // evitar apagar um cancelamento agendado ou sobrescrever o período.
    if (plan === null) {
      return new Response(null, { status: 200 });
    }

    const nextPayment = sub.next_payment_date ? new Date(sub.next_payment_date) : null;

    await prisma.providerProfile.updateMany({
      where: { mpPreapprovalId: preapprovalId },
      data: {
        plan,
        ...(plan === "FREE" ? { mpPreapprovalId: null, currentPeriodEnd: null } : { currentPeriodEnd: nextPayment }),
        cancelAtPeriodEnd: false
      }
    });
  } catch (err) {
    console.error("Erro ao processar webhook Mercado Pago:", err);
    return new Response("Internal error", { status: 500 });
  }

  return new Response(null, { status: 200 });
}
