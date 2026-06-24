import { describe, it, expect } from "vitest";
import { quoteRequestSchema } from "@/lib/validations/quote-request";

describe("quoteRequestSchema", () => {
  const valid = {
    customerName: "Maria Oliveira",
    customerEmail: "",
    customerPhone: "",
    serviceId: "",
    description: "Preciso de pintura no quarto e sala da minha casa."
  };

  it("aceita dados válidos sem campos opcionais", () => {
    const result = quoteRequestSchema.safeParse(valid);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.customerEmail).toBeNull();
      expect(result.data.customerPhone).toBeNull();
      expect(result.data.serviceId).toBeNull();
    }
  });

  it("aceita dados completos válidos", () => {
    const result = quoteRequestSchema.safeParse({
      ...valid,
      customerEmail: "maria@example.com",
      customerPhone: "(11) 99999-9999",
      serviceId: "cm000000000000000000000000"
    });
    expect(result.success).toBe(true);
  });

  it("rejeita nome com menos de 2 caracteres", () => {
    expect(quoteRequestSchema.safeParse({ ...valid, customerName: "M" }).success).toBe(false);
  });

  it("rejeita e-mail inválido quando preenchido", () => {
    expect(
      quoteRequestSchema.safeParse({ ...valid, customerEmail: "invalido" }).success
    ).toBe(false);
  });

  it("rejeita descrição com menos de 10 caracteres", () => {
    expect(quoteRequestSchema.safeParse({ ...valid, description: "Curto" }).success).toBe(false);
  });

  it("rejeita descrição com mais de 1200 caracteres", () => {
    expect(
      quoteRequestSchema.safeParse({ ...valid, description: "A".repeat(1201) }).success
    ).toBe(false);
  });

  it("rejeita serviceId que não é cuid quando preenchido", () => {
    expect(
      quoteRequestSchema.safeParse({ ...valid, serviceId: "nao-é-cuid" }).success
    ).toBe(false);
  });

  it("serviceId válido (cuid) é aceito", () => {
    const result = quoteRequestSchema.safeParse({
      ...valid,
      serviceId: "cm000000000000000000000000"
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.serviceId).toBe("cm000000000000000000000000");
  });
});
