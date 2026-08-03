"use server";

import { PreApproval } from "mercadopago";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getMercadoPago } from "@/lib/mercadopago";

type ProfileResult =
  | { error: string }
  | { profile: { id: string; plan: string; mpPreapprovalId: string | null; stripeSubscriptionId: string | null } };

async function loadSubscribableProfile(): Promise<ProfileResult> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Não autenticado." };

  const profile = await prisma.providerProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true, plan: true, mpPreapprovalId: true, stripeSubscriptionId: true }
  });

  if (!profile) return { error: "Dados do negócio não encontrados." };
  if (profile.plan === "PRO" && (profile.mpPreapprovalId || profile.stripeSubscriptionId)) {
    return { error: "Você já tem uma assinatura PRO ativa." };
  }
  return { profile };
}

function proAmount(): number | null {
  const amount = Number(process.env.MP_PRO_AMOUNT);
  return Number.isFinite(amount) && amount > 0 ? amount : null;
}

export async function createMpCardSubscription(
  cardToken: string,
  payerEmail: string
): Promise<{ success: true } | { error: string }> {
  const loaded = await loadSubscribableProfile();
  if ("error" in loaded) return loaded;
  const { profile } = loaded;

  const amount = proAmount();
  if (amount === null) return { error: "Valor do plano não configurado." };

  const preApproval = new PreApproval(getMercadoPago());
  const result = await preApproval.create({
    body: {
      reason: "Vitriny PRO",
      external_reference: profile.id,
      payer_email: payerEmail,
      card_token_id: cardToken,
      auto_recurring: {
        frequency: 1,
        frequency_type: "months",
        transaction_amount: amount,
        currency_id: "BRL"
      },
      back_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/billing`,
      status: "authorized"
    }
  });

  if (!result.id || result.status !== "authorized") {
    return { error: "Não foi possível confirmar o cartão. Verifique os dados e tente novamente." };
  }

  await prisma.providerProfile.update({
    where: { id: profile.id },
    data: {
      mpPreapprovalId: result.id,
      plan: "PRO",
      subscriptionStatus: "ACTIVE",
      currentPeriodEnd: result.next_payment_date
        ? new Date(result.next_payment_date)
        : null
    }
  });

  return { success: true };
}

export async function createMpPixSubscription(
  payerEmail: string
): Promise<{ initPoint: string } | { error: string }> {
  const loaded = await loadSubscribableProfile();
  if ("error" in loaded) return loaded;
  const { profile } = loaded;

  const amount = proAmount();
  if (amount === null) return { error: "Valor do plano não configurado." };

  const preApproval = new PreApproval(getMercadoPago());
  const result = await preApproval.create({
    body: {
      reason: "Vitriny PRO",
      external_reference: profile.id,
      payer_email: payerEmail,
      auto_recurring: {
        frequency: 1,
        frequency_type: "months",
        transaction_amount: amount,
        currency_id: "BRL"
      },
      back_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/billing?mp=return`,
      status: "pending"
    }
  });

  if (!result.id || !result.init_point) {
    return { error: "Não foi possível iniciar a assinatura. Tente novamente." };
  }

  await prisma.providerProfile.update({
    where: { id: profile.id },
    data: { mpPreapprovalId: result.id }
  });

  return { initPoint: result.init_point };
}
