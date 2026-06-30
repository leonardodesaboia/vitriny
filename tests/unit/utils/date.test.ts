import { describe, expect, it } from "vitest";

import {
  brDateDigitsToISO,
  isISODateBeforeToday,
  isValidISODate
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
});
