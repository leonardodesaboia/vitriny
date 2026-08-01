"use server";

import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isOneTimeProExpired } from "@/lib/plan-limits";
import type { PlanTier } from "@prisma/client";

export async function requireAuth(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  // Sessão JWT não é invalidável; contas excluídas (soft delete) precisam
  // ser barradas aqui mesmo com token ainda válido em outro dispositivo.
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { deletedAt: true }
  });

  if (!user || user.deletedAt) redirect("/login");

  return session.user.id;
}

type EffectivePlanInput = {
  id: string;
  plan: PlanTier;
  stripeSubscriptionId: string | null;
  currentPeriodEnd: Date | null;
};

// PRO comprado via Pix manual (sem assinatura Stripe) não tem cobrança
// recorrente — vence sozinho. Corrige na leitura em vez de cron: primeiro
// acesso ao dashboard depois do vencimento já rebaixa e persiste.
export async function resolveEffectivePlan(
  profile: EffectivePlanInput
): Promise<{ plan: PlanTier; currentPeriodEnd: Date | null }> {
  if (!isOneTimeProExpired(profile)) {
    return { plan: profile.plan, currentPeriodEnd: profile.currentPeriodEnd };
  }

  await prisma.providerProfile.update({
    where: { id: profile.id },
    data: { plan: "FREE", currentPeriodEnd: null }
  });

  return { plan: "FREE", currentPeriodEnd: null };
}

export async function requireProviderProfile() {
  const userId = await requireAuth();
  const profile = await prisma.providerProfile.findUnique({
    where: { userId },
    select: {
      id: true,
      plan: true,
      businessType: true,
      stripeSubscriptionId: true,
      currentPeriodEnd: true
    }
  });

  if (!profile) return { userId, profile: null };

  const effective = await resolveEffectivePlan(profile);

  return {
    userId,
    profile: { ...profile, plan: effective.plan, currentPeriodEnd: effective.currentPeriodEnd }
  };
}
