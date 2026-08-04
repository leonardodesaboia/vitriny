import { prisma } from "@/lib/prisma";

export const SUBSCRIPTION_LOCK_TTL_MS = 2 * 60 * 1000;

// Trava otimista com TTL: evita duas preapprovals criadas em paralelo pro
// mesmo perfil (clique duplo, duas abas). Sem cron — uma trava órfã (processo
// caiu no meio) se autocura sozinha depois de 2 minutos, mesmo padrão de
// "corrige na leitura/escrita seguinte" usado no resto do projeto.
export async function acquireSubscriptionLock(profileId: string): Promise<boolean> {
  const staleBefore = new Date(Date.now() - SUBSCRIPTION_LOCK_TTL_MS);
  const claimed = await prisma.providerProfile.updateMany({
    where: {
      id: profileId,
      OR: [{ mpSubscriptionLockedAt: null }, { mpSubscriptionLockedAt: { lt: staleBefore } }]
    },
    data: { mpSubscriptionLockedAt: new Date() }
  });
  return claimed.count === 1;
}

export async function releaseSubscriptionLock(profileId: string): Promise<void> {
  await prisma.providerProfile.update({
    where: { id: profileId },
    data: { mpSubscriptionLockedAt: null }
  });
}

export function isSubscriptionLockActive(lockedAt: Date | null): boolean {
  if (!lockedAt) return false;
  return lockedAt.getTime() > Date.now() - SUBSCRIPTION_LOCK_TTL_MS;
}
