import { describe, expect, it } from "vitest";

import {
  inferPixKeyType,
  isValidPixKey,
  normalizePixKey
} from "@/lib/utils/pix-key";

describe("pix key utils", () => {
  describe("CPF", () => {
    it("aceita CPF válido com e sem pontuação", () => {
      expect(isValidPixKey("529.982.247-25", "CPF")).toBe(true);
      expect(isValidPixKey("52998224725", "CPF")).toBe(true);
    });

    it("rejeita CPF com dígito verificador errado", () => {
      expect(isValidPixKey("529.982.247-26", "CPF")).toBe(false);
      expect(isValidPixKey("12345678900", "CPF")).toBe(false);
    });

    it("rejeita CPF com todos os dígitos iguais", () => {
      expect(isValidPixKey("111.111.111-11", "CPF")).toBe(false);
    });

    it("rejeita CPF com tamanho errado", () => {
      expect(isValidPixKey("5299822472", "CPF")).toBe(false);
    });

    it("normaliza CPF para apenas dígitos", () => {
      expect(normalizePixKey("529.982.247-25", "CPF")).toBe("52998224725");
    });
  });

  describe("CNPJ", () => {
    it("aceita CNPJ numérico válido com e sem pontuação", () => {
      expect(isValidPixKey("11.222.333/0001-81", "CNPJ")).toBe(true);
      expect(isValidPixKey("11222333000181", "CNPJ")).toBe(true);
    });

    it("aceita CNPJ alfanumérico válido (formato 2026)", () => {
      expect(isValidPixKey("12ABC34501DE35", "CNPJ")).toBe(true);
    });

    it("rejeita CNPJ com dígito verificador errado", () => {
      expect(isValidPixKey("11.222.333/0001-82", "CNPJ")).toBe(false);
      expect(isValidPixKey("12ABC34501DE36", "CNPJ")).toBe(false);
    });

    it("rejeita CNPJ com tamanho errado", () => {
      expect(isValidPixKey("1122233300018", "CNPJ")).toBe(false);
    });

    it("normaliza CNPJ removendo pontuação e usando maiúsculas", () => {
      expect(normalizePixKey("11.222.333/0001-81", "CNPJ")).toBe("11222333000181");
      expect(normalizePixKey("12abc34501de35", "CNPJ")).toBe("12ABC34501DE35");
    });
  });

  describe("E-mail", () => {
    it("aceita e-mail válido", () => {
      expect(isValidPixKey("contato@negocio.com.br", "E-mail")).toBe(true);
    });

    it("rejeita e-mail inválido", () => {
      expect(isValidPixKey("nao-e-email", "E-mail")).toBe(false);
      expect(isValidPixKey("a@b", "E-mail")).toBe(false);
    });

    it("normaliza e-mail para minúsculas", () => {
      expect(normalizePixKey("Contato@Negocio.COM", "E-mail")).toBe(
        "contato@negocio.com"
      );
    });
  });

  describe("Telefone", () => {
    it("aceita telefone brasileiro com DDD", () => {
      expect(isValidPixKey("(11) 99999-9999", "Telefone")).toBe(true);
      expect(isValidPixKey("11999999999", "Telefone")).toBe(true);
      expect(isValidPixKey("+55 11 99999-9999", "Telefone")).toBe(true);
    });

    it("rejeita telefone incompleto", () => {
      expect(isValidPixKey("9999-9999", "Telefone")).toBe(false);
    });

    it("normaliza telefone para o formato DICT (+55...)", () => {
      expect(normalizePixKey("(11) 99999-9999", "Telefone")).toBe(
        "+5511999999999"
      );
      expect(normalizePixKey("+55 11 99999-9999", "Telefone")).toBe(
        "+5511999999999"
      );
    });
  });

  describe("Chave aleatória", () => {
    it("aceita UUID válido", () => {
      expect(
        isValidPixKey("123e4567-e89b-12d3-a456-426614174000", "Chave aleatória")
      ).toBe(true);
    });

    it("rejeita valor que não é UUID", () => {
      expect(isValidPixKey("nao-e-uuid", "Chave aleatória")).toBe(false);
    });

    it("normaliza UUID para minúsculas", () => {
      expect(
        normalizePixKey("123E4567-E89B-12D3-A456-426614174000", "Chave aleatória")
      ).toBe("123e4567-e89b-12d3-a456-426614174000");
    });
  });

  describe("sem tipo informado (inferência)", () => {
    it("aceita chave que corresponde a algum formato conhecido", () => {
      expect(isValidPixKey("529.982.247-25", null)).toBe(true);
      expect(isValidPixKey("contato@negocio.com", "")).toBe(true);
    });

    it("rejeita chave que não corresponde a nenhum formato", () => {
      expect(isValidPixKey("chave-invalida", null)).toBe(false);
    });

    it("infere o tipo da chave", () => {
      expect(inferPixKeyType("52998224725")).toBe("CPF");
      expect(inferPixKeyType("11222333000181")).toBe("CNPJ");
      expect(inferPixKeyType("contato@negocio.com")).toBe("E-mail");
      expect(inferPixKeyType("123e4567-e89b-12d3-a456-426614174000")).toBe(
        "Chave aleatória"
      );
      expect(inferPixKeyType("chave-invalida")).toBeNull();
    });

    it("normaliza usando o tipo inferido", () => {
      expect(normalizePixKey("529.982.247-25", null)).toBe("52998224725");
    });
  });
});
