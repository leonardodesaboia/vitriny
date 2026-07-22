import { describe, expect, it } from "vitest";

import {
  BOT_UA_PATTERN,
  isCountableView,
  toDayBucket,
} from "@/lib/storefront-views";

describe("isCountableView", () => {
  it("não conta o dono logado", () => {
    expect(
      isCountableView({ userAgent: "Mozilla/5.0", isOwner: true })
    ).toBe(false);
  });

  it("não conta User-Agents de bot/preview", () => {
    for (const ua of [
      "facebookexternalhit/1.1",
      "WhatsApp/2.23",
      "Googlebot/2.1",
      "Mozilla/5.0 (compatible; bingbot/2.0)",
      "HeadlessChrome/120",
    ]) {
      expect(isCountableView({ userAgent: ua, isOwner: false })).toBe(false);
    }
  });

  it("conta um navegador normal de visitante", () => {
    expect(
      isCountableView({
        userAgent:
          "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) AppleWebKit/605.1.15 Safari/604.1",
        isOwner: false,
      })
    ).toBe(true);
  });

  it("conta quando o User-Agent é ausente (não é sinal de bot)", () => {
    expect(isCountableView({ userAgent: null, isOwner: false })).toBe(true);
  });
});

describe("toDayBucket", () => {
  it("zera a hora (meia-noite UTC do mesmo dia)", () => {
    const bucket = toDayBucket(new Date("2026-07-22T18:45:30.000Z"));
    expect(bucket.toISOString()).toBe("2026-07-22T00:00:00.000Z");
  });

  it("dois horários do mesmo dia geram o mesmo bucket", () => {
    const a = toDayBucket(new Date("2026-07-22T01:00:00.000Z"));
    const b = toDayBucket(new Date("2026-07-22T23:00:00.000Z"));
    expect(a.getTime()).toBe(b.getTime());
  });
});

describe("BOT_UA_PATTERN", () => {
  it("é uma RegExp", () => {
    expect(BOT_UA_PATTERN).toBeInstanceOf(RegExp);
  });
});
