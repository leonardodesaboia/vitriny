import { describe, expect, it } from "vitest";

import {
  formatPhoneBR,
  isValidPhoneBR,
  normalizePhoneBR,
  onlyPhoneDigits,
  phoneToTelHref,
  phoneToWhatsAppNumber
} from "@/lib/utils/phone";

describe("phone utils", () => {
  it("mantém apenas dígitos", () => {
    expect(onlyPhoneDigits("(11) 99999-9999")).toBe("11999999999");
  });

  it("formata celular brasileiro com nono dígito", () => {
    expect(formatPhoneBR("11999999999")).toBe("(11) 99999-9999");
  });

  it("formata telefone fixo brasileiro", () => {
    expect(formatPhoneBR("1133334444")).toBe("(11) 3333-4444");
  });

  it("remove código do Brasil antes de formatar", () => {
    expect(formatPhoneBR("+55 11 99999-9999")).toBe("(11) 99999-9999");
  });

  it("normaliza vazio para null", () => {
    expect(normalizePhoneBR("")).toBeNull();
  });

  it("valida telefones brasileiros com 10 ou 11 dígitos locais", () => {
    expect(isValidPhoneBR("(11) 99999-9999")).toBe(true);
    expect(isValidPhoneBR("+55 11 3333-4444")).toBe(true);
    expect(isValidPhoneBR("123")).toBe(false);
  });

  it("gera href tel com código do Brasil", () => {
    expect(phoneToTelHref("(11) 99999-9999")).toBe("tel:+5511999999999");
  });

  it("gera número de WhatsApp com código do Brasil", () => {
    expect(phoneToWhatsAppNumber("(11) 99999-9999")).toBe("5511999999999");
  });
});
