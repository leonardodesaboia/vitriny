"use server";

import { PreApproval } from "mercadopago";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getMercadoPago } from "@/lib/mercadopago";

const cardSubscriptionSchema = z.object({
  cardToken: z.string().trim().min(1).max(500),
  payerEmail: z.string().trim().toLowerCase().email().max(254)
});

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

  const parsedInput = cardSubscriptionSchema.safeParse({ cardToken, payerEmail });
  if (!parsedInput.success) {
    return { error: "Confira os dados do cartão e do pagador." };
  }
  const { cardToken: normalizedCardToken, payerEmail: normalizedPayerEmail } =
    parsedInput.data;

  let preApproval: PreApproval;
  let result;

  try {
    preApproval = new PreApproval(getMercadoPago());
    result = await preApproval.create({
      body: {
        reason: "Vitriny PRO",
        external_reference: profile.id,
        payer_email: normalizedPayerEmail,
        card_token_id: normalizedCardToken,
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
  } catch (error) {
    console.error("Erro ao criar assinatura Mercado Pago por cartão.", {
      profileId: profile.id,
      errorName: error instanceof Error ? error.name : "UnknownError",
      errorMessage: error instanceof Error ? error.message : "Erro desconhecido"
    });

    return { error: "Não foi possível processar o cartão agora. Tente novamente." };
  }

  if (!result.id || result.status !== "authorized") {
    return { error: "Não foi possível confirmar o cartão. Verifique os dados e tente novamente." };
  }

  try {
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
  } catch (error) {
    console.error("Erro ao persistir assinatura Mercado Pago autorizada.", {
      profileId: profile.id,
      preapprovalId: result.id,
      errorName: error instanceof Error ? error.name : "UnknownError",
      errorMessage: error instanceof Error ? error.message : "Erro desconhecido"
    });

    try {
      await preApproval.update({
        id: result.id,
        body: { status: "cancelled" }
      });
    } catch (compensationError) {
      console.error("Falha ao compensar assinatura Mercado Pago não persistida.", {
        profileId: profile.id,
        preapprovalId: result.id,
        errorName:
          compensationError instanceof Error ? compensationError.name : "UnknownError",
        errorMessage:
          compensationError instanceof Error
            ? compensationError.message
            : "Erro desconhecido"
      });
    }

    return {
      error:
        "A assinatura foi autorizada, mas não conseguimos atualizar seu plano. Não tente novamente agora; entre em contato com o suporte."
    };
  }

  return { success: true };
}

export async function createMpPixSubscription(
  _payerEmail: string
): Promise<{ initPoint: string } | { error: string }> {
  void _payerEmail;
  return { error: "Pix Automático ainda não está disponível para esta assinatura." };
}

export async function cancelMpSubscription(): Promise<
  { success: true } | { error: string }
> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Não autenticado." };

  const profile = await prisma.providerProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true, mpPreapprovalId: true }
  });

  if (!profile?.mpPreapprovalId) return { error: "Assinatura não encontrada." };

  const preApproval = new PreApproval(getMercadoPago());
  await preApproval.update({
    id: profile.mpPreapprovalId,
    body: { status: "cancelled" }
  });

  // Cancelamento no MP é imediato e irreversível (não dá pra "descancelar"
  // uma preapproval lá). O acesso PRO continua até currentPeriodEnd — quem
  // rebaixa de verdade é a expiração lazy (lib/plan-limits.ts).
  await prisma.providerProfile.update({
    where: { id: profile.id },
    data: { cancelAtPeriodEnd: true, subscriptionStatus: "CANCELED" }
  });

  return { success: true };
}
