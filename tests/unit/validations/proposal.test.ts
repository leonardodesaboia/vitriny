import { describe, it, expect } from "vitest";
import { proposalSchema, proposalItemSchema } from "@/lib/validations/proposal";

const validItem = { description: "Mão de obra", quantity: "2", unitPrice: "150.00" };
const validRequestId = "cm000000000000000000000000";

describe("proposalItemSchema", () => {
  it("aceita item válido", () => {
    expect(proposalItemSchema.safeParse(validItem).success).toBe(true);
  });

  it("rejeita descrição com menos de 2 caracteres", () => {
    expect(proposalItemSchema.safeParse({ ...validItem, description: "A" }).success).toBe(false);
  });

  it("rejeita quantidade menor que 1", () => {
    expect(proposalItemSchema.safeParse({ ...validItem, quantity: "0" }).success).toBe(false);
  });

  it("rejeita quantidade maior que 999", () => {
    expect(proposalItemSchema.safeParse({ ...validItem, quantity: "1000" }).success).toBe(false);
  });

  it("rejeita quantidade não inteira", () => {
    expect(proposalItemSchema.safeParse({ ...validItem, quantity: "1.5" }).success).toBe(false);
  });

  it("rejeita valor em formato inválido", () => {
    expect(proposalItemSchema.safeParse({ ...validItem, unitPrice: "abc" }).success).toBe(false);
  });

  it("aceita valor com vírgula decimal", () => {
    const result = proposalItemSchema.safeParse({ ...validItem, unitPrice: "150,50" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.unitPrice).toBe("150.50");
  });
});

describe("proposalSchema", () => {
  const valid = {
    pricingMode: "ITEMIZED" as const,
    requestId: validRequestId,
    title: "Proposta de Pintura Residencial",
    description: "",
    validUntil: "",
    items: [validItem]
  };

  it("aceita proposta válida", () => {
    expect(proposalSchema.safeParse(valid).success).toBe(true);
  });

  it("aceita proposta com múltiplos itens", () => {
    const result = proposalSchema.safeParse({
      ...valid,
      items: [validItem, { description: "Tinta", quantity: "10", unitPrice: "80.00" }]
    });
    expect(result.success).toBe(true);
  });

  it("rejeita proposta sem itens", () => {
    expect(proposalSchema.safeParse({ ...valid, items: [] }).success).toBe(false);
  });

  it("rejeita requestId que não é cuid", () => {
    expect(proposalSchema.safeParse({ ...valid, requestId: "nao-é-cuid" }).success).toBe(false);
  });

  it("rejeita título com menos de 2 caracteres", () => {
    expect(proposalSchema.safeParse({ ...valid, title: "A" }).success).toBe(false);
  });

  it("rejeita título com mais de 120 caracteres", () => {
    expect(proposalSchema.safeParse({ ...valid, title: "A".repeat(121) }).success).toBe(false);
  });

  it("campo validUntil vazio torna-se null", () => {
    const result = proposalSchema.safeParse({ ...valid, validUntil: "" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.validUntil).toBeNull();
  });

  it("rejeita validUntil com formato de data inválido", () => {
    expect(proposalSchema.safeParse({ ...valid, validUntil: "31/12/2025" }).success).toBe(false);
  });

  it("aceita validUntil em formato ISO (YYYY-MM-DD)", () => {
    const result = proposalSchema.safeParse({ ...valid, validUntil: "2027-12-31" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.validUntil).toBe("2027-12-31");
  });
});
