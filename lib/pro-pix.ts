import { prisma } from "@/lib/prisma";

export const PRO_PERIOD_DAYS = 30;
const PERIOD_MS = PRO_PERIOD_DAYS * 24 * 60 * 60 * 1000;

export function nextProPeriodEnd(currentPeriodEnd: Date | null, now: Date): Date {
  const base = currentPeriodEnd && currentPeriodEnd > now ? currentPeriodEnd : now;
  return new Date(base.getTime() + PERIOD_MS);
}

export type GrantResult = "granted" | "already" | "not_found";

export async function grantProPixPeriodFromMp(
  proPixPaymentId: string
): Promise<GrantResult> {
  return prisma.$transaction(async (tx) => {
    const payment = await tx.proPixPayment.findUnique({
      where: { id: proPixPaymentId },
      select: { id: true, providerProfileId: true, confirmedAt: true }
    });

    if (!payment) return "not_found";
    if (payment.confirmedAt) return "already";

    const now = new Date();
    const claimed = await tx.proPixPayment.updateMany({
      where: { id: payment.id, confirmedAt: null },
      data: { confirmedAt: now }
    });
    if (claimed.count === 0) return "already";

    const profile = await tx.providerProfile.findUnique({
      where: { id: payment.providerProfileId },
      select: { currentPeriodEnd: true }
    });

    await tx.providerProfile.update({
      where: { id: payment.providerProfileId },
      data: {
        plan: "PRO",
        currentPeriodEnd: nextProPeriodEnd(profile?.currentPeriodEnd ?? null, now)
      }
    });

    return "granted";
  });
}
