import { describe, it, expect, beforeEach, vi } from "vitest";
import { makePrismaMock } from "../helpers";
import { isOneTimeProExpired } from "@/lib/plan-limits";

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
      mpPreapprovalId: null,
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
      mpPreapprovalId: null,
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
      mpPreapprovalId: null,
      currentPeriodEnd: past
    });

    expect(result).toEqual({ plan: "FREE", currentPeriodEnd: null });
    expect(db.providerProfile.update).toHaveBeenCalledWith({
      where: { id: "profile-1" },
      data: { plan: "FREE", currentPeriodEnd: null }
    });
  });
});

describe("isOneTimeProExpired com assinatura MP", () => {
  const past = new Date(Date.now() - 86_400_000);
  const future = new Date(Date.now() + 86_400_000);

  it("PRO com preapproval MP ativa NAO expira mesmo com data passada", () => {
    expect(
      isOneTimeProExpired({
        plan: "PRO",
        stripeSubscriptionId: null,
        mpPreapprovalId: "2c93808",
        currentPeriodEnd: past
      })
    ).toBe(false);
  });

  it("PRO avulso (sem assinatura) e vencido expira", () => {
    expect(
      isOneTimeProExpired({
        plan: "PRO",
        stripeSubscriptionId: null,
        mpPreapprovalId: null,
        currentPeriodEnd: past
      })
    ).toBe(true);
  });

  it("PRO avulso ainda dentro do prazo NAO expira", () => {
    expect(
      isOneTimeProExpired({
        plan: "PRO",
        stripeSubscriptionId: null,
        mpPreapprovalId: null,
        currentPeriodEnd: future
      })
    ).toBe(false);
  });
});
