import { describe, expect, it } from "vitest";

import {
  brDateDigitsToISO,
  isISODateBeforeToday,
  isPixPaymentExpired,
  isValidISODate,
  PIX_PAYMENT_EXPIRY_HOURS
} from "@/lib/utils/date";

describe("date utils", () => {
  it("converte uma data brasileira real para ISO", () => {
    expect(brDateDigitsToISO("29022024")).toBe("2024-02-29");
  });

  it("rejeita dias inexistentes no calendário", () => {
    expect(brDateDigitsToISO("31022026")).toBe("");
    expect(isValidISODate("2026-02-31")).toBe(false);
  });

  it("compara a data com o dia local de referência", () => {
    const reference = new Date(2026, 5, 30, 12, 0, 0);

    expect(isISODateBeforeToday("2026-06-29", reference)).toBe(true);
    expect(isISODateBeforeToday("2026-06-30", reference)).toBe(false);
    expect(isISODateBeforeToday("2026-07-01", reference)).toBe(false);
  });

  describe("isPixPaymentExpired", () => {
    const EXPIRY_MS = PIX_PAYMENT_EXPIRY_HOURS * 60 * 60 * 1000;

    it("não expirado: solicitado há menos de 48h", () => {
      const requestedAt = new Date(Date.now() - EXPIRY_MS + 60_000);
      expect(isPixPaymentExpired(requestedAt)).toBe(false);
    });

    it("expirado: solicitado há exatamente 48h + 1s", () => {
      const requestedAt = new Date(Date.now() - EXPIRY_MS - 1000);
      expect(isPixPaymentExpired(requestedAt)).toBe(true);
    });

    it("não expirado quando requestedAt é now", () => {
      expect(isPixPaymentExpired(new Date())).toBe(false);
    });

    it("aceita referenceDate explícito", () => {
      const base = new Date("2026-07-01T12:00:00Z");
      const justExpired = new Date("2026-06-29T11:59:59Z");
      const notYet = new Date("2026-06-29T12:00:01Z");
      expect(isPixPaymentExpired(justExpired, base)).toBe(true);
      expect(isPixPaymentExpired(notYet, base)).toBe(false);
    });
  });
});
