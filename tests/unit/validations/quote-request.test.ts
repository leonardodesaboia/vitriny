import { describe, it, expect } from "vitest";
import { quoteRequestSchema } from "@/lib/validations/quote-request";

describe("quoteRequestSchema", () => {
  const valid = {
    customerName: "Maria Oliveira",
    customerEmail: "maria@example.com",
    customerPhone: "",
    serviceId: "",
    description: "Preciso de pintura no quarto e sala da minha casa."
  };

  it("exige pelo menos e-mail ou telefone", () => {
    const result = quoteRequestSchema.safeParse({
      ...valid,
      customerEmail: "",
      customerPhone: ""
    });

    expect(result.success).toBe(false);
  });

  it("aceita dados válidos somente com e-mail como contato", () => {
    const result = quoteRequestSchema.safeParse(valid);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.customerEmail).toBe("maria@example.com");
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

  it("normaliza telefone do cliente para o padrão brasileiro", () => {
    const result = quoteRequestSchema.safeParse({
      ...valid,
      customerPhone: "11999999999"
    });

    expect(result.success).toBe(true);
    if (result.success) expect(result.data.customerPhone).toBe("(11) 99999-9999");
  });

  it("rejeita telefone do cliente incompleto", () => {
    expect(
      quoteRequestSchema.safeParse({ ...valid, customerPhone: "11999" }).success
    ).toBe(false);
  });

  it("rejeita nome com menos de 2 caracteres", () => {
    expect(quoteRequestSchema.safeParse({ ...valid, customerName: "M" }).success).toBe(false);
  });

  it("rejeita e-mail inválido quando preenchido", () => {
    expect(
      quoteRequestSchema.safeParse({ ...valid, customerEmail: "invalido" }).success
    ).toBe(false);
  });

  it("rejeita data inexistente no calendário", () => {
    expect(
      quoteRequestSchema.safeParse({ ...valid, desiredDate: "2026-02-31" })
        .success
    ).toBe(false);
  });

  it("aceita data real em ano bissexto", () => {
    expect(
      quoteRequestSchema.safeParse({ ...valid, desiredDate: "2028-02-29" })
        .success
    ).toBe(true);
  });

  it("aceita descrição curta (ex: observação em pagamento Pix)", () => {
    expect(quoteRequestSchema.safeParse({ ...valid, description: "Curto" }).success).toBe(true);
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

  it("aceita description nula (pedido de serviço com preço fixo)", () => {
    const result = quoteRequestSchema.safeParse({ ...valid, description: "" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.description).toBeNull();
  });

  it("aceita description curta quando preenchida (observações opcionais em pagamento Pix)", () => {
    const result = quoteRequestSchema.safeParse({ ...valid, description: "Curta" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.description).toBe("Curta");
  });
});
