import { describe, it, expect } from "vitest";
import { providerProfileSchema } from "@/lib/validations/provider-profile";

describe("providerProfileSchema", () => {
  const valid = {
    businessName: "Pinturas Silva",
    slug: "pinturas-silva",
    description: "",
    phone: "",
    email: "",
    city: "",
    state: "",
    isPublished: false
  };

  it("aceita dados válidos mínimos", () => {
    expect(providerProfileSchema.safeParse(valid).success).toBe(true);
  });

  it("aceita dados completos válidos", () => {
    const result = providerProfileSchema.safeParse({
      ...valid,
      description: "Especialista em pintura",
      phone: "(11) 99999-9999",
      email: "contato@pinturas.com",
      city: "São Paulo",
      state: "SP",
      isPublished: true
    });
    expect(result.success).toBe(true);
  });

  it("normaliza telefone para o padrão brasileiro", () => {
    const result = providerProfileSchema.safeParse({
      ...valid,
      phone: "+55 11 99999-9999"
    });

    expect(result.success).toBe(true);
    if (result.success) expect(result.data.phone).toBe("(11) 99999-9999");
  });

  it("rejeita telefone incompleto", () => {
    expect(
      providerProfileSchema.safeParse({ ...valid, phone: "9999" }).success
    ).toBe(false);
  });

  it("rejeita businessName com menos de 2 caracteres", () => {
    expect(providerProfileSchema.safeParse({ ...valid, businessName: "A" }).success).toBe(false);
  });

  it("rejeita businessName com mais de 120 caracteres", () => {
    expect(
      providerProfileSchema.safeParse({ ...valid, businessName: "A".repeat(121) }).success
    ).toBe(false);
  });

  describe("slug", () => {
    it("aceita slug com letras minúsculas e hífens", () => {
      expect(providerProfileSchema.safeParse({ ...valid, slug: "joao-silva-93" }).success).toBe(true);
    });

    it("aceita slug apenas com letras", () => {
      expect(providerProfileSchema.safeParse({ ...valid, slug: "pinturas" }).success).toBe(true);
    });

    it("converte slug para minúsculas automaticamente", () => {
      const result = providerProfileSchema.safeParse({ ...valid, slug: "Pinturas-Silva" });
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.slug).toBe("pinturas-silva");
    });

    it("rejeita slug com menos de 3 caracteres", () => {
      expect(providerProfileSchema.safeParse({ ...valid, slug: "ab" }).success).toBe(false);
    });

    it("rejeita slug com espaços", () => {
      expect(providerProfileSchema.safeParse({ ...valid, slug: "joao silva" }).success).toBe(false);
    });

    it("rejeita slug que começa com hífen", () => {
      expect(providerProfileSchema.safeParse({ ...valid, slug: "-joao" }).success).toBe(false);
    });

    it("rejeita slug que termina com hífen", () => {
      expect(providerProfileSchema.safeParse({ ...valid, slug: "joao-" }).success).toBe(false);
    });

    it("rejeita slug com hífens duplos", () => {
      expect(providerProfileSchema.safeParse({ ...valid, slug: "joao--silva" }).success).toBe(false);
    });

    it("rejeita slug com caracteres especiais", () => {
      expect(providerProfileSchema.safeParse({ ...valid, slug: "joao_silva" }).success).toBe(false);
      expect(providerProfileSchema.safeParse({ ...valid, slug: "joão" }).success).toBe(false);
    });
  });

  it("rejeita e-mail de contato inválido", () => {
    expect(
      providerProfileSchema.safeParse({ ...valid, email: "nao-é-email" }).success
    ).toBe(false);
  });

  describe("chave Pix", () => {
    const withPix = {
      ...valid,
      pixHolderName: "João Silva",
      pixCity: "São Paulo"
    };

    it("aceita CPF válido e normaliza para o formato do DICT", () => {
      const result = providerProfileSchema.safeParse({
        ...withPix,
        pixKey: "529.982.247-25",
        pixKeyType: "CPF"
      });

      expect(result.success).toBe(true);
      if (result.success) expect(result.data.pixKey).toBe("52998224725");
    });

    it("normaliza telefone para +55...", () => {
      const result = providerProfileSchema.safeParse({
        ...withPix,
        pixKey: "(11) 99999-9999",
        pixKeyType: "Telefone"
      });

      expect(result.success).toBe(true);
      if (result.success) expect(result.data.pixKey).toBe("+5511999999999");
    });

    it("rejeita chave inválida para o tipo selecionado", () => {
      const result = providerProfileSchema.safeParse({
        ...withPix,
        pixKey: "529.982.247-26",
        pixKeyType: "CPF"
      });

      expect(result.success).toBe(false);
    });

    it("aceita chave sem tipo quando o formato é reconhecido", () => {
      const result = providerProfileSchema.safeParse({
        ...withPix,
        pixKey: "contato@negocio.com",
        pixKeyType: ""
      });

      expect(result.success).toBe(true);
    });

    it("rejeita chave sem tipo com formato desconhecido", () => {
      const result = providerProfileSchema.safeParse({
        ...withPix,
        pixKey: "chave-qualquer",
        pixKeyType: ""
      });

      expect(result.success).toBe(false);
    });

    it("perfil sem chave Pix continua válido", () => {
      expect(providerProfileSchema.safeParse(valid).success).toBe(true);
    });
  });

  it("campos opcionais vazios tornam-se null", () => {
    const result = providerProfileSchema.safeParse(valid);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.description).toBeNull();
      expect(result.data.phone).toBeNull();
      expect(result.data.email).toBeNull();
    }
  });
});
