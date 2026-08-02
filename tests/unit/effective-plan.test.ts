import { describe, it, expect, beforeEach, vi } from "vitest";
import { makePrismaMock } from "../helpers";

vi.mock("@/lib/prisma", () => ({ prisma: {} }));

let db: ReturnType<typeof makePrismaMock>;

beforeEach(async () => {
  const prismaModule = await import("@/lib/prisma");
  db = makePrismaMock();
  Object.assign(prismaModule.prisma, db);
});

describe("resolveEffectivePlan", () => {
  it("mantém PRO quando ainda não venceu", async () => {
    const future = new Date(Date.now() + 1000 * 60 * 60 * 24);

    const { resolveEffectivePlan } = await import("@/lib/effective-plan");
    const result = await resolveEffectivePlan({
      id: "profile-1",
      plan: "PRO",
      stripeSubscriptionId: null,
      currentPeriodEnd: future
    });

    expect(result).toEqual({ plan: "PRO", currentPeriodEnd: future });
    expect(db.providerProfile.update).not.toHaveBeenCalled();
  });

  it("mantém PRO quando há assinatura Stripe, mesmo com currentPeriodEnd vencido", async () => {
    const past = new Date("2020-01-01");

    const { resolveEffectivePlan } = await import("@/lib/effective-plan");
    const result = await resolveEffectivePlan({
      id: "profile-1",
      plan: "PRO",
      stripeSubscriptionId: "sub_123",
      currentPeriodEnd: past
    });

    expect(result).toEqual({ plan: "PRO", currentPeriodEnd: past });
    expect(db.providerProfile.update).not.toHaveBeenCalled();
  });

  it("rebaixa pra FREE e persiste quando o Pix manual venceu", async () => {
    db.providerProfile.update.mockResolvedValue({});
    const past = new Date("2020-01-01");

    const { resolveEffectivePlan } = await import("@/lib/effective-plan");
    const result = await resolveEffectivePlan({
      id: "profile-1",
      plan: "PRO",
      stripeSubscriptionId: null,
      currentPeriodEnd: past
    });

    expect(result).toEqual({ plan: "FREE", currentPeriodEnd: null });
    expect(db.providerProfile.update).toHaveBeenCalledWith({
      where: { id: "profile-1" },
      data: { plan: "FREE", currentPeriodEnd: null }
    });
  });
});
