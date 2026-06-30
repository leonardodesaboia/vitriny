"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
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

  if (!profile) return { error: "Perfil não encontrado." };
  if (!profile.stripeCustomerId)
    return { error: "Nenhuma assinatura Stripe encontrada para este perfil." };

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
    select: { id: true, stripeCustomerId: true, plan: true }
  });

  if (!profile) return { error: "Perfil não encontrado." };
  if (profile.plan === "PRO") return { error: "Você já tem o plano PRO." };

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
