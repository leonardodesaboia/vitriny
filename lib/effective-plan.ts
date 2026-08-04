import { prisma } from "@/lib/prisma";
import { isOneTimeProExpired } from "@/lib/plan-limits";
import type { PlanTier } from "@prisma/client";

export type EffectivePlanInput = {
  id: string;
  plan: PlanTier;
  stripeSubscriptionId: string | null;
  mpPreapprovalId: string | null;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
};

// PRO comprado via Pix manual (sem assinatura) ou com preapproval MP
// cancelada não tem cobrança recorrente ativa — vence sozinho. Corrige na
// leitura em vez de cron: primeiro acesso ao dashboard depois do vencimento
// já rebaixa e persiste, limpando qualquer resquício de assinatura MP.
export async function resolveEffectivePlan(
  profile: EffectivePlanInput
): Promise<{ plan: PlanTier; currentPeriodEnd: Date | null }> {
  if (!isOneTimeProExpired(profile)) {
    return { plan: profile.plan, currentPeriodEnd: profile.currentPeriodEnd };
  }

  await prisma.providerProfile.update({
    where: { id: profile.id },
    data: {
      plan: "FREE",
      currentPeriodEnd: null,
      mpPreapprovalId: null,
      cancelAtPeriodEnd: false,
      subscriptionStatus: null
    }
  });

  return { plan: "FREE", currentPeriodEnd: null };
}
