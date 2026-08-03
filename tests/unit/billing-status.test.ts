import { describe, it, expect } from "vitest";
import { hasActiveRecurringSubscription } from "@/lib/billing-status";

describe("hasActiveRecurringSubscription", () => {
  it("preapproval MP apenas pendente (Pix nao autorizado, plano FREE) NAO conta como ativa", () => {
    expect(
      hasActiveRecurringSubscription({
        plan: "FREE",
        stripeSubscriptionId: null,
        mpPreapprovalId: "2c93808"
      })
    ).toBe(false);
  });

  it("cartao autorizado (plano PRO + mpPreapprovalId) conta como ativa", () => {
    expect(
      hasActiveRecurringSubscription({
        plan: "PRO",
        stripeSubscriptionId: null,
        mpPreapprovalId: "2c93808"
      })
    ).toBe(true);
  });

  it("assinatura Stripe ativa (plano PRO + stripeSubscriptionId) conta como ativa", () => {
    expect(
      hasActiveRecurringSubscription({
        plan: "PRO",
        stripeSubscriptionId: "sub_123",
        mpPreapprovalId: null
      })
    ).toBe(true);
  });

  it("PRO sem assinatura recorrente (ex.: Pix avulso legado) NAO conta como assinatura recorrente", () => {
    expect(
      hasActiveRecurringSubscription({
        plan: "PRO",
        stripeSubscriptionId: null,
        mpPreapprovalId: null
      })
    ).toBe(false);
  });

  it("FREE sem nenhum id NAO conta como ativa", () => {
    expect(
      hasActiveRecurringSubscription({
        plan: "FREE",
        stripeSubscriptionId: null,
        mpPreapprovalId: null
      })
    ).toBe(false);
  });
});
