import { describe, it, expect } from "vitest";
import { serviceSchema } from "@/lib/validations/service";

describe("serviceSchema", () => {
  // fixture base agora inclui pricingType
  const valid = {
    name: "Pintura residencial",
    description: "",
    basePrice: "",
    pricingType: "CUSTOM",
    isActive: true
  };

  it("aceita dados válidos sem preço e sem descrição (CUSTOM)", () => {
    const result = serviceSchema.safeParse(valid);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.basePrice).toBeNull();
      expect(result.data.description).toBeNull();
    }
  });

  it("aceita dados válidos com preço e descrição (CUSTOM)", () => {
    const result = serviceSchema.safeParse({
      ...valid,
      description: "Pintura interna e externa",
      basePrice: "350.00"
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.basePrice).toBe("350.00");
      expect(result.data.description).toBe("Pintura interna e externa");
    }
  });

  it("rejeita nome com menos de 2 caracteres", () => {
    expect(serviceSchema.safeParse({ ...valid, name: "A" }).success).toBe(false);
  });

  it("rejeita nome com mais de 120 caracteres", () => {
    expect(serviceSchema.safeParse({ ...valid, name: "A".repeat(121) }).success).toBe(false);
  });

  it("rejeita descrição com mais de 600 caracteres", () => {
    expect(
      serviceSchema.safeParse({ ...valid, description: "A".repeat(601) }).success
    ).toBe(false);
  });

  it("rejeita preço em formato inválido", () => {
    expect(serviceSchema.safeParse({ ...valid, basePrice: "abc" }).success).toBe(false);
    expect(serviceSchema.safeParse({ ...valid, basePrice: "-10" }).success).toBe(false);
  });

  it("aceita preço com vírgula como separador decimal", () => {
    const result = serviceSchema.safeParse({ ...valid, basePrice: "350,50" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.basePrice).toBe("350.50");
  });

  it("aceita preço inteiro sem decimais", () => {
    const result = serviceSchema.safeParse({ ...valid, basePrice: "100" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.basePrice).toBe("100");
  });

  it("rejeita preço com mais de 2 casas decimais", () => {
    expect(serviceSchema.safeParse({ ...valid, basePrice: "100.123" }).success).toBe(false);
  });

  // Novos casos — pricingType FIXED
  it("FIXED aceita basePrice > 0", () => {
    const result = serviceSchema.safeParse({
      ...valid,
      pricingType: "FIXED",
      basePrice: "200.00"
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.pricingType).toBe("FIXED");
      expect(result.data.basePrice).toBe("200.00");
    }
  });

  it("aceita pagamento Pix obrigatório para serviço FIXED", () => {
    const result = serviceSchema.safeParse({
      ...valid,
      pricingType: "FIXED",
      fixedServiceCheckoutMode: "REQUIRE_PIX_PAYMENT",
      basePrice: "200.00"
    });

    expect(result.success).toBe(true);
  });

  it("rejeita o modo legado de reserva Pix", () => {
    expect(
      serviceSchema.safeParse({
        ...valid,
        pricingType: "FIXED",
        fixedServiceCheckoutMode: "ALLOW_PIX_RESERVATION",
        basePrice: "200.00"
      }).success
    ).toBe(false);
  });

  it("FIXED rejeita quando basePrice está vazio", () => {
    const result = serviceSchema.safeParse({
      ...valid,
      pricingType: "FIXED",
      basePrice: ""
    });
    expect(result.success).toBe(false);
  });

  it("FIXED rejeita quando basePrice é zero", () => {
    const result = serviceSchema.safeParse({
      ...valid,
      pricingType: "FIXED",
      basePrice: "0"
    });
    expect(result.success).toBe(false);
  });

  it("FIXED rejeita quando basePrice é nulo", () => {
    const result = serviceSchema.safeParse({
      ...valid,
      pricingType: "FIXED",
      basePrice: null
    });
    expect(result.success).toBe(false);
  });

  it("CUSTOM aceita basePrice vazio", () => {
    const result = serviceSchema.safeParse({
      ...valid,
      pricingType: "CUSTOM",
      basePrice: ""
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.basePrice).toBeNull();
  });

  it("rejeita pricingType inválido", () => {
    expect(
      serviceSchema.safeParse({ ...valid, pricingType: "HORA" }).success
    ).toBe(false);
  });
});
