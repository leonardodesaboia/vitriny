import { describe, it, expect } from "vitest";
import {
  getPlanLimits,
  getPlanLimit,
  hasReachedLimit,
  isNearLimit,
  formatUsage,
  getCurrentMonthRange,
  PLAN_LIMITS,
  PLAN_LIMIT_ERROR_CODES
} from "@/lib/plan-limits";

describe("PLAN_LIMITS", () => {
  describe("FREE plan", () => {
    it("limita serviços ativos a 3", () => {
      expect(PLAN_LIMITS.FREE.activeServices).toBe(3);
    });

    it("limita pedidos mensais a 10", () => {
      expect(PLAN_LIMITS.FREE.monthlyQuoteRequests).toBe(10);
    });

    it("limita propostas mensais a 5", () => {
      expect(PLAN_LIMITS.FREE.monthlyProposals).toBe(5);
    });

    it("limita templates de proposta a 1", () => {
      expect(PLAN_LIMITS.FREE.proposalTemplates).toBe(1);
    });
  });

  describe("PRO plan", () => {
    it("não tem limite de serviços ativos", () => {
      expect(PLAN_LIMITS.PRO.activeServices).toBeNull();
    });

    it("não tem limite de pedidos mensais", () => {
      expect(PLAN_LIMITS.PRO.monthlyQuoteRequests).toBeNull();
    });

    it("não tem limite de propostas mensais", () => {
      expect(PLAN_LIMITS.PRO.monthlyProposals).toBeNull();
    });

    it("não tem limite de templates", () => {
      expect(PLAN_LIMITS.PRO.proposalTemplates).toBeNull();
    });
  });
});

describe("getPlanLimits", () => {
  it("retorna os limites corretos para FREE", () => {
    expect(getPlanLimits("FREE")).toEqual(PLAN_LIMITS.FREE);
  });

  it("retorna os limites corretos para PRO", () => {
    expect(getPlanLimits("PRO")).toEqual(PLAN_LIMITS.PRO);
  });
});

describe("getPlanLimit", () => {
  it("retorna o limite específico do recurso para FREE", () => {
    expect(getPlanLimit("FREE", "activeServices")).toBe(3);
    expect(getPlanLimit("FREE", "monthlyProposals")).toBe(5);
  });

  it("retorna null para recursos ilimitados no PRO", () => {
    expect(getPlanLimit("PRO", "activeServices")).toBeNull();
    expect(getPlanLimit("PRO", "proposalTemplates")).toBeNull();
  });
});

describe("hasReachedLimit", () => {
  it("retorna false quando abaixo do limite", () => {
    expect(hasReachedLimit(2, 3)).toBe(false);
  });

  it("retorna true quando exatamente no limite", () => {
    expect(hasReachedLimit(3, 3)).toBe(true);
  });

  it("retorna true quando acima do limite", () => {
    expect(hasReachedLimit(4, 3)).toBe(true);
  });

  it("retorna false quando limite é null (ilimitado)", () => {
    expect(hasReachedLimit(9999, null)).toBe(false);
  });

  it("retorna false com zero registros e limite positivo", () => {
    expect(hasReachedLimit(0, 3)).toBe(false);
  });
});

describe("isNearLimit", () => {
  it("retorna true quando está a 80% ou mais do limite", () => {
    expect(isNearLimit(8, 10)).toBe(true);
    expect(isNearLimit(9, 10)).toBe(true);
  });

  it("retorna false quando está abaixo de 80% do limite", () => {
    expect(isNearLimit(7, 10)).toBe(false);
    expect(isNearLimit(0, 10)).toBe(false);
  });

  it("retorna false quando já atingiu o limite", () => {
    expect(isNearLimit(10, 10)).toBe(false);
    expect(isNearLimit(11, 10)).toBe(false);
  });

  it("retorna false para limite null (ilimitado)", () => {
    expect(isNearLimit(9999, null)).toBe(false);
  });
});

describe("formatUsage", () => {
  it("formata uso com limite numérico", () => {
    expect(formatUsage(3, 10)).toBe("3 / 10");
    expect(formatUsage(0, 5)).toBe("0 / 5");
  });

  it("formata uso como ilimitado quando limite é null", () => {
    expect(formatUsage(42, null)).toBe("42 / ilimitado");
  });
});

describe("getCurrentMonthRange", () => {
  it("começa no primeiro dia do mês às meia-noite", () => {
    const ref = new Date("2024-06-15T12:00:00");
    const { start } = getCurrentMonthRange(ref);
    expect(start).toEqual(new Date("2024-06-01T00:00:00"));
  });

  it("termina no primeiro dia do mês seguinte", () => {
    const ref = new Date("2024-06-15T12:00:00");
    const { end } = getCurrentMonthRange(ref);
    expect(end).toEqual(new Date("2024-07-01T00:00:00"));
  });

  it("funciona corretamente em dezembro (virada de ano)", () => {
    const ref = new Date("2024-12-20T00:00:00");
    const { start, end } = getCurrentMonthRange(ref);
    expect(start).toEqual(new Date("2024-12-01T00:00:00"));
    expect(end).toEqual(new Date("2025-01-01T00:00:00"));
  });

  it("start deve ser anterior a end", () => {
    const { start, end } = getCurrentMonthRange();
    expect(start.getTime()).toBeLessThan(end.getTime());
  });
});

describe("PLAN_LIMIT_ERROR_CODES", () => {
  it("mapeia corretamente cada recurso para seu código de erro", () => {
    expect(PLAN_LIMIT_ERROR_CODES.activeServices).toBe("limit-active-services");
    expect(PLAN_LIMIT_ERROR_CODES.monthlyQuoteRequests).toBe("limit-monthly-quote-requests");
    expect(PLAN_LIMIT_ERROR_CODES.monthlyProposals).toBe("limit-monthly-proposals");
    expect(PLAN_LIMIT_ERROR_CODES.proposalTemplates).toBe("limit-proposal-templates");
  });
});
