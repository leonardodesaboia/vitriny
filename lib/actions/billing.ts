"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { createPixPayment } from "@/lib/pix";
import { stripe } from "@/lib/stripe";

export async function cancelSubscription(): Promise<
  { success: true } | { error: string }
> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Não autenticado." };

  const profile = await prisma.providerProfile.findUnique({
    where: { userId: session.user.id },
    select: { stripeSubscriptionId: true }
  });

  if (!profile?.stripeSubscriptionId) return { error: "Assinatura não encontrada." };

  await stripe.subscriptions.update(profile.stripeSubscriptionId, {
    cancel_at_period_end: true
  });

  await prisma.providerProfile.update({
    where: { userId: session.user.id },
    data: { cancelAtPeriodEnd: true }
  });

  revalidatePath("/dashboard/billing");
  return { success: true };
}

export async function reactivateSubscription(): Promise<
  { success: true } | { error: string }
> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Não autenticado." };

  const profile = await prisma.providerProfile.findUnique({
    where: { userId: session.user.id },
    select: { stripeSubscriptionId: true }
  });

  if (!profile?.stripeSubscriptionId) return { error: "Assinatura não encontrada." };

  await stripe.subscriptions.update(profile.stripeSubscriptionId, {
    cancel_at_period_end: false
  });

  await prisma.providerProfile.update({
    where: { userId: session.user.id },
    data: { cancelAtPeriodEnd: false }
  });

  revalidatePath("/dashboard/billing");
  return { success: true };
}

export async function createSetupIntent(): Promise<
  { clientSecret: string } | { error: string }
> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Não autenticado." };

  const profile = await prisma.providerProfile.findUnique({
    where: { userId: session.user.id },
    select: { stripeCustomerId: true }
  });

  if (!profile?.stripeCustomerId) return { error: "Cliente Stripe não encontrado." };

  const setupIntent = await stripe.setupIntents.create({
    customer: profile.stripeCustomerId,
    usage: "off_session",
    payment_method_types: ["card"]
  });

  if (!setupIntent.client_secret) {
    return { error: "Erro ao criar sessão de atualização." };
  }

  return { clientSecret: setupIntent.client_secret };
}

export async function setDefaultPaymentMethod(
  paymentMethodId: string
): Promise<{ success: true } | { error: string }> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Não autenticado." };

  const profile = await prisma.providerProfile.findUnique({
    where: { userId: session.user.id },
    select: { stripeCustomerId: true, stripeSubscriptionId: true }
  });

  if (!profile?.stripeSubscriptionId) return { error: "Assinatura não encontrada." };
  if (!profile.stripeCustomerId) return { error: "Cliente Stripe não encontrado." };

  // Verifica que o paymentMethod pertence ao customer antes de aplicar
  const pm = await stripe.paymentMethods.retrieve(paymentMethodId);
  if (pm.customer !== profile.stripeCustomerId) {
    return { error: "Forma de pagamento inválida." };
  }

  await stripe.subscriptions.update(profile.stripeSubscriptionId, {
    default_payment_method: paymentMethodId
  });

  return { success: true };
}

export async function createPortalSession(): Promise<
  { url: string } | { error: string }
> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Não autenticado." };

  const profile = await prisma.providerProfile.findUnique({
    where: { userId: session.user.id },
    select: { stripeCustomerId: true }
  });

  if (!profile) return { error: "Dados do negócio não encontrados." };
  if (!profile.stripeCustomerId)
    return { error: "Nenhuma assinatura Stripe encontrada para este negócio." };

  const portalSession = await stripe.billingPortal.sessions.create({
    customer: profile.stripeCustomerId,
    return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/billing`
  });

  return { url: portalSession.url };
}

export async function createCheckoutSession(): Promise<
  { clientSecret: string } | { error: string }
> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Não autenticado." };

  const profile = await prisma.providerProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true, stripeCustomerId: true, plan: true, stripeSubscriptionId: true }
  });

  if (!profile) return { error: "Dados do negócio não encontrados." };
  if (profile.plan === "PRO") return { error: "Você já tem o plano PRO." };
  if (profile.stripeSubscriptionId) return { error: "Você já possui uma assinatura ativa." };

  let customerId = profile.stripeCustomerId;

  if (!customerId) {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { email: true, name: true }
    });
    const customer = await stripe.customers.create({
      email: user?.email ?? undefined,
      name: user?.name ?? undefined,
      metadata: { providerProfileId: profile.id }
    });
    customerId = customer.id;
    await prisma.providerProfile.update({
      where: { id: profile.id },
      data: { stripeCustomerId: customerId }
    });
  }

  const checkoutSession = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    ui_mode: "elements",
    line_items: [{ price: process.env.STRIPE_PRO_PRICE_ID!, quantity: 1 }],
    return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/billing?session_id={CHECKOUT_SESSION_ID}`
  });

  if (!checkoutSession.client_secret) {
    return { error: "Erro ao criar sessão de pagamento. Tente novamente." };
  }

  return { clientSecret: checkoutSession.client_secret };
}

export async function requestProPixPayment(): Promise<
  { copyPasteCode: string; qrCodeDataUrl: string; paymentId: string } | { error: string }
> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Não autenticado." };

  const profile = await prisma.providerProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true, plan: true }
  });

  if (!profile) return { error: "Dados do negócio não encontrados." };
  if (profile.plan === "PRO") return { error: "Você já tem o plano PRO." };

  const pixKey = process.env.VITRINY_PIX_KEY;
  const pixHolderName = process.env.VITRINY_PIX_HOLDER_NAME;
  const pixCity = process.env.VITRINY_PIX_CITY;
  if (!pixKey || !pixHolderName || !pixCity) {
    return {
      error: "Pix não está configurado no momento. Tente novamente mais tarde ou fale com o suporte."
    };
  }

  // Idempotência: evita códigos Pix duplicados vivos ao mesmo tempo pro
  // mesmo perfil — reaproveita o pendente em vez de criar outro.
  const pending = await prisma.proPixPayment.findFirst({
    where: { providerProfileId: profile.id, confirmedAt: null },
    orderBy: { requestedAt: "desc" }
  });

  let payment: { id: string };
  let amount: string;

  if (pending) {
    // Reaproveita o valor já salvo no pedido pendente: o preço do Stripe
    // pode ter mudado desde que ele foi criado, e o QR/copia-e-cola precisa
    // continuar consistente com o valor que já está no banco (e que vai
    // aparecer depois no e-mail/dashboard de confirmação).
    payment = pending;
    amount = pending.amount.toString();
  } else {
    const price = await stripe.prices.retrieve(process.env.STRIPE_PRO_PRICE_ID!);
    if (price.unit_amount == null) {
      return {
        error: "Não foi possível determinar o valor do plano PRO. Tente novamente ou fale com o suporte."
      };
    }
    amount = (price.unit_amount / 100).toFixed(2);
    payment = await prisma.proPixPayment.create({
      data: { providerProfileId: profile.id, amount }
    });
  }

  const pix = await createPixPayment({
    pixKey,
    pixHolderName,
    pixCity,
    amount,
    transactionId: payment.id,
    description: "Vitriny PRO"
  });

  return {
    copyPasteCode: pix.copyPasteCode,
    qrCodeDataUrl: pix.qrCodeDataUrl,
    paymentId: payment.id
  };
}
