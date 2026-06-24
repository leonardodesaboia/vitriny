import { describe, it, expect } from "vitest";
import { proposalTemplateSchema, proposalTemplateItemSchema } from "@/lib/validations/proposal-template";

const validItem = { description: "Mão de obra", quantity: "1", unitPrice: "200.00" };

describe("proposalTemplateItemSchema", () => {
  it("aceita item válido", () => {
    expect(proposalTemplateItemSchema.safeParse(validItem).success).toBe(true);
  });

  it("rejeita descrição com menos de 2 caracteres", () => {
    expect(proposalTemplateItemSchema.safeParse({ ...validItem, description: "A" }).success).toBe(false);
  });

  it("rejeita quantidade menor que 1", () => {
    expect(proposalTemplateItemSchema.safeParse({ ...validItem, quantity: "0" }).success).toBe(false);
  });

  it("aceita valor com vírgula decimal", () => {
    const result = proposalTemplateItemSchema.safeParse({ ...validItem, unitPrice: "200,50" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.unitPrice).toBe("200.50");
  });
});

describe("proposalTemplateSchema", () => {
  const valid = {
    name: "Template Padrão",
    title: "Proposta de Serviço",
    description: "",
    items: [validItem]
  };

  it("aceita template válido sem templateId (criação)", () => {
    expect(proposalTemplateSchema.safeParse(valid).success).toBe(true);
  });

  it("aceita template válido com templateId (atualização)", () => {
    const result = proposalTemplateSchema.safeParse({
      ...valid,
      templateId: "cm000000000000000000000000"
    });
    expect(result.success).toBe(true);
  });

  it("rejeita nome com menos de 2 caracteres", () => {
    expect(proposalTemplateSchema.safeParse({ ...valid, name: "A" }).success).toBe(false);
  });

  it("rejeita título com menos de 2 caracteres", () => {
    expect(proposalTemplateSchema.safeParse({ ...valid, title: "A" }).success).toBe(false);
  });

  it("rejeita template sem itens", () => {
    expect(proposalTemplateSchema.safeParse({ ...valid, items: [] }).success).toBe(false);
  });

  it("rejeita templateId inválido (não é cuid)", () => {
    expect(
      proposalTemplateSchema.safeParse({ ...valid, templateId: "nao-é-cuid" }).success
    ).toBe(false);
  });

  it("descrição vazia torna-se null", () => {
    const result = proposalTemplateSchema.safeParse(valid);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.description).toBeNull();
  });
});
