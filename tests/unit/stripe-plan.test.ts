import { describe, expect, it } from "vitest";

import { resolvePlanFromSubscription } from "@/lib/stripe-plan";

describe("resolvePlanFromSubscription", () => {
  const env = { proPriceId: "price_pro" };

  it("status ativo com priceId do PRO vira PRO", () => {
    expect(resolvePlanFromSubscription("active", "price_pro", env)).toBe("PRO");
    expect(resolvePlanFromSubscription("trialing", "price_pro", env)).toBe("PRO");
  });

  it("priceId desconhecido cai no fallback PRO (único plano pago hoje)", () => {
    expect(resolvePlanFromSubscription("active", "price_outro", env)).toBe("PRO");
    expect(resolvePlanFromSubscription("active", null, env)).toBe("PRO");
  });

  it("status terminal derruba para FREE independente do preço", () => {
    expect(resolvePlanFromSubscription("canceled", "price_pro", env)).toBe("FREE");
    expect(resolvePlanFromSubscription("unpaid", null, env)).toBe("FREE");
    expect(resolvePlanFromSubscription("incomplete_expired", null, env)).toBe("FREE");
    expect(resolvePlanFromSubscription("paused", null, env)).toBe("FREE");
  });

  it("status intermediário não mexe no plano", () => {
    expect(resolvePlanFromSubscription("past_due", "price_pro", env)).toBeNull();
    expect(resolvePlanFromSubscription("incomplete", null, env)).toBeNull();
  });
});
