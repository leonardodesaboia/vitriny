import { describe, expect, it } from "vitest";
import {
  getServiceSaleMode,
  getTechnicalSaleMode,
  SALE_MODE_OPTIONS,
  SALE_MODE_BADGE_LABEL,
} from "@/lib/service-sale-mode";

describe("getServiceSaleMode", () => {
  it("CUSTOM + REQUEST_ONLY → CUSTOM", () => {
    expect(
      getServiceSaleMode({ pricingType: "CUSTOM", fixedServiceCheckoutMode: "REQUEST_ONLY" })
    ).toBe("CUSTOM");
  });

  it("CUSTOM + REQUIRE_PIX_PAYMENT → CUSTOM (normalização defensiva)", () => {
    expect(
      getServiceSaleMode({ pricingType: "CUSTOM", fixedServiceCheckoutMode: "REQUIRE_PIX_PAYMENT" })
    ).toBe("CUSTOM");
  });

  it("FIXED + REQUEST_ONLY → FIXED_REQUEST", () => {
    expect(
      getServiceSaleMode({ pricingType: "FIXED", fixedServiceCheckoutMode: "REQUEST_ONLY" })
    ).toBe("FIXED_REQUEST");
  });

  it("FIXED + REQUIRE_PIX_PAYMENT → FIXED_PIX", () => {
    expect(
      getServiceSaleMode({ pricingType: "FIXED", fixedServiceCheckoutMode: "REQUIRE_PIX_PAYMENT" })
    ).toBe("FIXED_PIX");
  });
});

describe("getTechnicalSaleMode", () => {
  it("CUSTOM → CUSTOM + REQUEST_ONLY", () => {
    expect(getTechnicalSaleMode("CUSTOM")).toEqual({
      pricingType: "CUSTOM",
      fixedServiceCheckoutMode: "REQUEST_ONLY",
    });
  });

  it("FIXED_REQUEST → FIXED + REQUEST_ONLY", () => {
    expect(getTechnicalSaleMode("FIXED_REQUEST")).toEqual({
      pricingType: "FIXED",
      fixedServiceCheckoutMode: "REQUEST_ONLY",
    });
  });

  it("FIXED_PIX → FIXED + REQUIRE_PIX_PAYMENT", () => {
    expect(getTechnicalSaleMode("FIXED_PIX")).toEqual({
      pricingType: "FIXED",
      fixedServiceCheckoutMode: "REQUIRE_PIX_PAYMENT",
    });
  });
});

describe("labels aprovados", () => {
  it("CUSTOM tem label 'Sob consulta'", () => {
    const opt = SALE_MODE_OPTIONS.find((o) => o.value === "CUSTOM");
    expect(opt?.label).toBe("Sob consulta");
  });

  it("FIXED_REQUEST tem label 'Preço fixo, solicitar primeiro'", () => {
    const opt = SALE_MODE_OPTIONS.find((o) => o.value === "FIXED_REQUEST");
    expect(opt?.label).toBe("Preço fixo, solicitar primeiro");
  });

  it("FIXED_PIX tem label 'Preço fixo, pagar via Pix'", () => {
    const opt = SALE_MODE_OPTIONS.find((o) => o.value === "FIXED_PIX");
    expect(opt?.label).toBe("Preço fixo, pagar via Pix");
  });

  it("badge CUSTOM → 'Sob consulta'", () => {
    expect(SALE_MODE_BADGE_LABEL["CUSTOM"]).toBe("Sob consulta");
  });

  it("badge FIXED_REQUEST → 'Preço fixo · Solicitação'", () => {
    expect(SALE_MODE_BADGE_LABEL["FIXED_REQUEST"]).toBe("Preço fixo · Solicitação");
  });

  it("badge FIXED_PIX → 'Preço fixo · Pix'", () => {
    expect(SALE_MODE_BADGE_LABEL["FIXED_PIX"]).toBe("Preço fixo · Pix");
  });
});
