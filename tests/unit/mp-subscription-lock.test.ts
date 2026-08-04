import { describe, it, expect, vi, beforeEach } from "vitest";
import { makePrismaMock } from "../helpers";

vi.mock("@/lib/prisma", () => ({ prisma: {} }));

let db: ReturnType<typeof makePrismaMock>;

beforeEach(async () => {
  const prismaModule = await import("@/lib/prisma");
  db = makePrismaMock();
  Object.assign(prismaModule.prisma, db);
});

describe("acquireSubscriptionLock", () => {
  it("reivindica a trava quando nenhuma outra tentativa esta em andamento", async () => {
    db.providerProfile.updateMany.mockResolvedValue({ count: 1 });

    const { acquireSubscriptionLock } = await import("@/lib/mp-subscription-lock");
    const result = await acquireSubscriptionLock("profile-1");

    expect(result).toBe(true);
    expect(db.providerProfile.updateMany).toHaveBeenCalledWith({
      where: {
        id: "profile-1",
        OR: [
          { mpSubscriptionLockedAt: null },
          { mpSubscriptionLockedAt: { lt: expect.any(Date) } }
        ]
      },
      data: { mpSubscriptionLockedAt: expect.any(Date) }
    });
  });

  it("nao reivindica quando ja existe uma trava ativa (0 linhas afetadas)", async () => {
    db.providerProfile.updateMany.mockResolvedValue({ count: 0 });

    const { acquireSubscriptionLock } = await import("@/lib/mp-subscription-lock");
    const result = await acquireSubscriptionLock("profile-1");

    expect(result).toBe(false);
  });
});

describe("releaseSubscriptionLock", () => {
  it("limpa mpSubscriptionLockedAt", async () => {
    db.providerProfile.update.mockResolvedValue({});

    const { releaseSubscriptionLock } = await import("@/lib/mp-subscription-lock");
    await releaseSubscriptionLock("profile-1");

    expect(db.providerProfile.update).toHaveBeenCalledWith({
      where: { id: "profile-1" },
      data: { mpSubscriptionLockedAt: null }
    });
  });
});

describe("isSubscriptionLockActive", () => {
  it("null nao esta ativa", async () => {
    const { isSubscriptionLockActive } = await import("@/lib/mp-subscription-lock");
    expect(isSubscriptionLockActive(null)).toBe(false);
  });

  it("trava recente esta ativa", async () => {
    const { isSubscriptionLockActive } = await import("@/lib/mp-subscription-lock");
    expect(isSubscriptionLockActive(new Date())).toBe(true);
  });

  it("trava com mais de 2 minutos nao esta mais ativa", async () => {
    const { isSubscriptionLockActive } = await import("@/lib/mp-subscription-lock");
    const staleDate = new Date(Date.now() - 3 * 60 * 1000);
    expect(isSubscriptionLockActive(staleDate)).toBe(false);
  });
});
