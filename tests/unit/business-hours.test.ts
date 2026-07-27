import { describe, expect, it } from "vitest";

import {
  DAY_LABELS,
  formatWeek,
  getTodayLabel,
  isOpenAt,
  parseBusinessHours,
  type BusinessHours,
  type DayHours,
} from "@/lib/business-hours";

const CLOSED_WEEK: DayHours[] = [null, null, null, null, null, null, null];

function week(overrides: Record<number, DayHours>): BusinessHours {
  const days = [...CLOSED_WEEK];
  for (const [index, value] of Object.entries(overrides)) {
    days[Number(index)] = value;
  }
  return days as BusinessHours;
}

// Segunda com horário comercial (1 = segunda-feira)
const commercialMonday = week({ 1: { open: "08:00", close: "18:00" } });
// Sábado virando a madrugada (6 = sábado)
const lateSaturday = week({ 6: { open: "18:00", close: "02:00" } });

describe("parseBusinessHours", () => {
  it("aceita semana válida", () => {
    expect(parseBusinessHours(commercialMonday)).toEqual(commercialMonday);
  });

  it("rejeita array com menos de 7 posições", () => {
    expect(parseBusinessHours([null, null, null])).toBeNull();
  });

  it("rejeita horário malformado", () => {
    expect(
      parseBusinessHours(week({ 1: { open: "25:00", close: "18:00" } }))
    ).toBeNull();
  });

  it("rejeita open igual a close (janela vazia)", () => {
    expect(
      parseBusinessHours(week({ 1: { open: "08:00", close: "08:00" } }))
    ).toBeNull();
  });

  it("retorna null para semana toda fechada", () => {
    expect(parseBusinessHours(CLOSED_WEEK)).toBeNull();
  });

  it("retorna null para valores não-array", () => {
    expect(parseBusinessHours(null)).toBeNull();
    expect(parseBusinessHours("seg a sex")).toBeNull();
    expect(parseBusinessHours({ monday: "08:00" })).toBeNull();
  });
});

describe("isOpenAt", () => {
  it("aberto dentro do horário do dia", () => {
    expect(isOpenAt(commercialMonday, new Date("2026-01-05T10:00:00"))).toBe(true);
  });

  it("fechado antes de abrir", () => {
    expect(isOpenAt(commercialMonday, new Date("2026-01-05T07:59:00"))).toBe(false);
  });

  it("fechado depois de fechar", () => {
    expect(isOpenAt(commercialMonday, new Date("2026-01-05T18:00:00"))).toBe(false);
  });

  it("fechado em dia sem horário", () => {
    expect(isOpenAt(commercialMonday, new Date("2026-01-04T10:00:00"))).toBe(false);
  });

  it("virada de meia-noite: aberto no fim do sábado", () => {
    expect(isOpenAt(lateSaturday, new Date("2026-01-10T23:30:00"))).toBe(true);
  });

  it("virada de meia-noite: ainda aberto na madrugada de domingo", () => {
    expect(isOpenAt(lateSaturday, new Date("2026-01-11T01:30:00"))).toBe(true);
  });

  it("virada de meia-noite: fechado após o close da madrugada", () => {
    expect(isOpenAt(lateSaturday, new Date("2026-01-11T02:30:00"))).toBe(false);
  });
});

describe("getTodayLabel", () => {
  it("aberto → informa o horário de fechar", () => {
    expect(getTodayLabel(commercialMonday, new Date("2026-01-05T10:00:00"))).toBe(
      "fecha às 18:00"
    );
  });

  it("antes de abrir → informa o horário de abrir", () => {
    expect(getTodayLabel(commercialMonday, new Date("2026-01-05T07:00:00"))).toBe(
      "abre às 08:00"
    );
  });

  it("dia fechado → fechado hoje", () => {
    expect(getTodayLabel(commercialMonday, new Date("2026-01-04T10:00:00"))).toBe(
      "fechado hoje"
    );
  });

  it("madrugada da virada → fecha às do dia anterior", () => {
    expect(getTodayLabel(lateSaturday, new Date("2026-01-11T01:00:00"))).toBe(
      "fecha às 02:00"
    );
  });
});

describe("formatWeek", () => {
  it("lista de segunda a domingo com labels", () => {
    const result = formatWeek(commercialMonday);
    expect(result).toHaveLength(7);
    expect(result[0]).toEqual({ day: "Seg", label: "08:00–18:00" });
    expect(result[6]).toEqual({ day: "Dom", label: "Fechado" });
  });
});

describe("DAY_LABELS", () => {
  it("índice 0 é domingo", () => {
    expect(DAY_LABELS[0]).toBe("Dom");
    expect(DAY_LABELS[6]).toBe("Sáb");
  });
});
