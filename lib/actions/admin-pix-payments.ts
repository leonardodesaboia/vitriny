"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isAdminEmail } from "@/lib/admin";

const PRO_PERIOD_DAYS = 30;

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.email || !isAdminEmail(session.user.email)) {
    redirect("/login");
  }
}

export async function confirmProPixPayment(
  paymentId: string
): Promise<{ success: true } | { error: string }> {
  const session = await auth();
  if (!session?.user?.email || !isAdminEmail(session.user.email)) {
    return { error: "Não autorizado." };
  }

  const payment = await prisma.proPixPayment.findFirst({
    where: { id: paymentId }
  });

  if (!payment) return { error: "Pagamento não encontrado." };

  // Idempotente: segundo clique não estende currentPeriodEnd de novo.
  if (payment.confirmedAt) return { success: true };

  const profile = await prisma.providerProfile.findUnique({
    where: { id: payment.providerProfileId },
    select: { id: true, currentPeriodEnd: true }
  });

  if (!profile) return { error: "Perfil do negócio não encontrado." };

  const now = new Date();
  // Renovar antes de vencer não perde os dias que já restavam.
  const base = profile.currentPeriodEnd && profile.currentPeriodEnd > now
    ? profile.currentPeriodEnd
    : now;
  const currentPeriodEnd = new Date(base.getTime() + PRO_PERIOD_DAYS * 24 * 60 * 60 * 1000);

  await prisma.proPixPayment.update({
    where: { id: payment.id },
    data: { confirmedAt: now }
  });

  await prisma.providerProfile.update({
    where: { id: profile.id },
    data: { plan: "PRO", currentPeriodEnd }
  });

  revalidatePath("/admin/pix-payments");
  return { success: true };
}

export type PendingProPixPayment = {
  id: string;
  businessName: string;
  amount: string;
  requestedAt: Date;
  clientPaidAt: Date;
};

export async function listPendingProPixPayments(): Promise<PendingProPixPayment[]> {
  await requireAdmin();

  const payments = await prisma.proPixPayment.findMany({
    where: { clientPaidAt: { not: null }, confirmedAt: null },
    orderBy: { clientPaidAt: "asc" },
    select: {
      id: true,
      amount: true,
      requestedAt: true,
      clientPaidAt: true,
      providerProfile: { select: { businessName: true } }
    }
  });

  return payments.map((p) => ({
    id: p.id,
    businessName: p.providerProfile.businessName,
    amount: p.amount.toString(),
    requestedAt: p.requestedAt,
    clientPaidAt: p.clientPaidAt!
  }));
}
