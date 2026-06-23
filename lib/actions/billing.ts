"use server";

import type { Stripe } from "stripe";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";

export async function createSubscriptionIntent(): Promise<
  { clientSecret: string } | { error: string }
> {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Não autenticado." };
  }

  const profile = await prisma.providerProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true, stripeCustomerId: true, plan: true }
  });

  if (!profile) {
    return { error: "Perfil não encontrado." };
  }

  if (profile.plan === "PRO") {
    return { error: "Você já tem o plano PRO." };
  }

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

  const subscription = await stripe.subscriptions.create({
    customer: customerId,
    items: [{ price: process.env.STRIPE_PRO_PRICE_ID! }],
    payment_behavior: "default_incomplete",
    payment_settings: { save_default_payment_method: "on_subscription" },
    expand: ["latest_invoice.payment_intent"]
  });

  await prisma.providerProfile.updateMany({
    where: { id: profile.id },
    data: { stripeSubscriptionId: subscription.id }
  });

  const invoice = subscription.latest_invoice as Stripe.Invoice;
  const paymentIntent = invoice.payment_intent as Stripe.PaymentIntent;

  if (!paymentIntent?.client_secret) {
    return { error: "Erro ao criar intenção de pagamento. Tente novamente." };
  }

  return { clientSecret: paymentIntent.client_secret };
}
