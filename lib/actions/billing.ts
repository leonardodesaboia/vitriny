"use server";

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";

export async function createCheckoutSession(): Promise<{ error: string }> {
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

  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  const checkoutSession = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    line_items: [
      {
        price: process.env.STRIPE_PRO_PRICE_ID!,
        quantity: 1
      }
    ],
    success_url: `${appUrl}/dashboard/billing?success=1`,
    cancel_url: `${appUrl}/dashboard/billing?canceled=1`
  });

  if (!checkoutSession.url) {
    return { error: "Erro ao criar sessão de checkout. Tente novamente." };
  }

  redirect(checkoutSession.url);
}
