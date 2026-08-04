import { describe, it, expect } from "vitest";
import {
  hasActiveRecurringSubscription,
  resolveReactivationMode,
  resolveSubscriptionGateway
} from "@/lib/billing-status";

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

describe("resolveSubscriptionGateway", () => {
  it("MP tem prioridade quando ambos os ids existem (nao deveria acontecer, mas MP e o caminho atual)", () => {
    expect(
      resolveSubscriptionGateway({ stripeSubscriptionId: "sub_123", mpPreapprovalId: "2c93808" })
    ).toBe("mp");
  });

  it("mp quando so ha mpPreapprovalId", () => {
    expect(
      resolveSubscriptionGateway({ stripeSubscriptionId: null, mpPreapprovalId: "2c93808" })
    ).toBe("mp");
  });

  it("stripe quando so ha stripeSubscriptionId", () => {
    expect(
      resolveSubscriptionGateway({ stripeSubscriptionId: "sub_123", mpPreapprovalId: null })
    ).toBe("stripe");
  });

  it("null quando nao ha nenhum", () => {
    expect(
      resolveSubscriptionGateway({ stripeSubscriptionId: null, mpPreapprovalId: null })
    ).toBeNull();
  });
});

describe("resolveReactivationMode", () => {
  it("mp reabre o Card Brick (preapproval cancelada e terminal, precisa de uma nova)", () => {
    expect(resolveReactivationMode("mp")).toBe("card-modal");
  });

  it("stripe usa a Server Action de reativacao", () => {
    expect(resolveReactivationMode("stripe")).toBe("stripe-action");
  });

  it("sem gateway definido cai no caminho Stripe (comportamento legado)", () => {
    expect(resolveReactivationMode(null)).toBe("stripe-action");
  });
});
