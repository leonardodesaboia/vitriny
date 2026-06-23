"use server";

import type { Stripe } from "stripe";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";

async function getClientSecretFromInvoice(invoiceId: string): Promise<string | null> {
  const payments = await stripe.invoicePayments.list({
    invoice: invoiceId,
    expand: ["data.payment.payment_intent"]
  });

  const defaultPayment = payments.data.find((p) => p.is_default) ?? payments.data[0];
  if (!defaultPayment) return null;

  const { payment } = defaultPayment;
  if (payment.type !== "payment_intent") return null;

  const raw = payment.payment_intent as Stripe.PaymentIntent | string | undefined;
  if (!raw) return null;

  const piObj =
    typeof raw === "object" ? raw : await stripe.paymentIntents.retrieve(raw as string);

  // If the PaymentIntent was created before pix was added, update it now
  if (piObj.payment_method_types && !piObj.payment_method_types.includes("pix")) {
    try {
      const updated = await stripe.paymentIntents.update(piObj.id, {
        payment_method_types: [...piObj.payment_method_types, "pix"]
      });
      return updated.client_secret ?? null;
    } catch {
      // PI might use automatic_payment_methods — pix will show if enabled in Dashboard
    }
  }

  return piObj.client_secret ?? null;
}

export async function createSubscriptionIntent(): Promise<
  { clientSecret: string } | { error: string }
> {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Não autenticado." };
  }

  const profile = await prisma.providerProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true, stripeCustomerId: true, plan: true, stripeSubscriptionId: true }
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

  // Reuse existing incomplete subscription to avoid orphaned subscriptions on retry
  if (profile.stripeSubscriptionId) {
    const existing = await stripe.subscriptions.retrieve(profile.stripeSubscriptionId);
    if (existing.status === "incomplete") {
      const existingInvoiceId =
        typeof existing.latest_invoice === "string"
          ? existing.latest_invoice
          : (existing.latest_invoice as Stripe.Invoice | null)?.id;

      if (existingInvoiceId) {
        const existingSecret = await getClientSecretFromInvoice(existingInvoiceId);
        if (existingSecret) {
          return { clientSecret: existingSecret };
        }
      }
    }
  }

  const subscription = await stripe.subscriptions.create({
    customer: customerId,
    items: [{ price: process.env.STRIPE_PRO_PRICE_ID! }],
    payment_behavior: "default_incomplete",
    payment_settings: {
      save_default_payment_method: "on_subscription",
      payment_method_types: ["card", "pix"]
    }
  });

  await prisma.providerProfile.update({
    where: { id: profile.id },
    data: { stripeSubscriptionId: subscription.id }
  });

  const invoiceId =
    typeof subscription.latest_invoice === "string"
      ? subscription.latest_invoice
      : (subscription.latest_invoice as Stripe.Invoice | null)?.id;

  if (!invoiceId) {
    return { error: "Erro ao criar intenção de pagamento. Tente novamente." };
  }

  const clientSecret = await getClientSecretFromInvoice(invoiceId);

  if (!clientSecret) {
    return { error: "Erro ao criar intenção de pagamento. Tente novamente." };
  }

  return { clientSecret };
}
