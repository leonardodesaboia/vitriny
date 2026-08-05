"use server";

import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { resolveEffectivePlan } from "@/lib/effective-plan";

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

export async function requireProviderProfile() {
  const userId = await requireAuth();
  const profile = await prisma.providerProfile.findUnique({
    where: { userId },
    select: {
      id: true,
      plan: true,
      businessType: true,
      mpPreapprovalId: true,
      currentPeriodEnd: true,
      cancelAtPeriodEnd: true
    }
  });

  if (!profile) return { userId, profile: null };

  const effective = await resolveEffectivePlan(profile);

  return {
    userId,
    profile: { ...profile, plan: effective.plan, currentPeriodEnd: effective.currentPeriodEnd }
  };
}
