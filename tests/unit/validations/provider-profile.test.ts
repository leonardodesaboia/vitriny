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
