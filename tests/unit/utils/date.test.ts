import { describe, expect, it } from "vitest";

import {
  brDateDigitsToISO,
  isISODateBeforeToday,
  isPixPaymentExpired,
  isProposalExpired,
  isValidISODate,
  PIX_PAYMENT_EXPIRY_HOURS,
  pixPaymentExpiryCutoff,
  startOfLocalDay,
  todayISOInTimeZone
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

  describe("isProposalExpired", () => {
    it("proposta sem validade nunca expira", () => {
      expect(isProposalExpired(null)).toBe(false);
    });

    it("proposta válida até hoje continua válida durante todo o dia", () => {
      // validUntil salvo como meia-noite local do dia escolhido (formato legado)
      const validUntil = new Date(2026, 6, 2, 0, 0, 0);
      const noonSameDay = new Date(2026, 6, 2, 12, 0, 0);
      const almostMidnight = new Date(2026, 6, 2, 23, 59, 59);

      expect(isProposalExpired(validUntil, noonSameDay)).toBe(false);
      expect(isProposalExpired(validUntil, almostMidnight)).toBe(false);
    });

    it("proposta expira somente após o fim do dia de validade", () => {
      const validUntil = new Date(2026, 6, 2, 0, 0, 0);
      const nextDay = new Date(2026, 6, 3, 0, 0, 1);

      expect(isProposalExpired(validUntil, nextDay)).toBe(true);
    });

    it("proposta com validade em dia futuro não está expirada", () => {
      const validUntil = new Date(2026, 6, 10, 0, 0, 0);
      const now = new Date(2026, 6, 2, 12, 0, 0);

      expect(isProposalExpired(validUntil, now)).toBe(false);
    });
  });

  describe("pixPaymentExpiryCutoff", () => {
    it("retorna o instante de 48h atrás", () => {
      const now = new Date("2026-07-03T12:00:00Z");
      expect(pixPaymentExpiryCutoff(now).toISOString()).toBe(
        "2026-07-01T12:00:00.000Z"
      );
    });
  });

  describe("todayISOInTimeZone", () => {
    it("retorna a data do fuso mesmo quando o UTC já virou o dia", () => {
      // 01:00 UTC de 03/07 ainda é 22:00 de 02/07 em São Paulo (UTC-3)
      const now = new Date("2026-07-03T01:00:00Z");
      expect(todayISOInTimeZone("America/Sao_Paulo", now)).toBe("2026-07-02");
    });

    it("retorna a data UTC quando o fuso é UTC", () => {
      const now = new Date("2026-07-03T01:00:00Z");
      expect(todayISOInTimeZone("UTC", now)).toBe("2026-07-03");
    });
  });

  describe("startOfLocalDay", () => {
    it("zera horas, minutos, segundos e milissegundos no fuso local", () => {
      const date = new Date(2026, 6, 2, 15, 30, 45, 123);
      const start = startOfLocalDay(date);

      expect(start.getFullYear()).toBe(2026);
      expect(start.getMonth()).toBe(6);
      expect(start.getDate()).toBe(2);
      expect(start.getHours()).toBe(0);
      expect(start.getMinutes()).toBe(0);
      expect(start.getSeconds()).toBe(0);
      expect(start.getMilliseconds()).toBe(0);
    });
  });
});
