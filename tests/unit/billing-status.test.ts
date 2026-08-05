import { describe, it, expect } from "vitest";
import { hasActiveRecurringSubscription } from "@/lib/billing-status";

describe("hasActiveRecurringSubscription", () => {
  it("preapproval MP apenas pendente (Pix nao autorizado, plano FREE) NAO conta como ativa", () => {
    expect(
      hasActiveRecurringSubscription({
        plan: "FREE",
        mpPreapprovalId: "2c93808"
      })
    ).toBe(false);
  });

  it("cartao autorizado (plano PRO + mpPreapprovalId) conta como ativa", () => {
    expect(
      hasActiveRecurringSubscription({
        plan: "PRO",
        mpPreapprovalId: "2c93808"
      })
    ).toBe(true);
  });

  it("PRO sem preapproval (ex.: Pix avulso do MP) NAO conta como assinatura recorrente", () => {
    expect(
      hasActiveRecurringSubscription({
        plan: "PRO",
        mpPreapprovalId: null
      })
    ).toBe(false);
  });

  it("FREE sem nenhum id NAO conta como ativa", () => {
    expect(
      hasActiveRecurringSubscription({
        plan: "FREE",
        mpPreapprovalId: null
      })
    ).toBe(false);
  });
});
