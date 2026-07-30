import { describe, expect, it } from "vitest";

import {
  buildStorefrontSeo,
  catalogTypeLabel,
} from "@/lib/seo/storefront-metadata";

describe("catalogTypeLabel", () => {
  it("mapeia businessType para rótulo pt-BR", () => {
    expect(catalogTypeLabel("PRODUCTS")).toBe("Produtos");
    expect(catalogTypeLabel("SERVICES")).toBe("Serviços");
    expect(catalogTypeLabel("BOTH")).toBe("Produtos e serviços");
  });
});

describe("buildStorefrontSeo", () => {
  const base = {
    businessName: "Estúdio Aurora",
    businessType: "SERVICES" as const,
    description: null,
    city: null,
    state: null,
  };

  it("inclui tipo e localização no título quando há cidade/estado", () => {
    const { title } = buildStorefrontSeo({
      ...base,
      city: "Fortaleza",
      state: "CE",
    });
    expect(title).toBe("Estúdio Aurora — Serviços em Fortaleza, CE");
  });

  it("omite localização quando ausente", () => {
    expect(buildStorefrontSeo(base).title).toBe("Estúdio Aurora — Serviços");
  });

  it("usa a descrição do dono (trimada) quando existe", () => {
    const { description } = buildStorefrontSeo({
      ...base,
      description: "  Design floral sob medida.  ",
    });
    expect(description).toBe("Design floral sob medida.");
  });

  it("gera fallback com tipo e localização quando não há descrição", () => {
    const { description } = buildStorefrontSeo({
      ...base,
      city: "Fortaleza",
      state: "CE",
    });
    expect(description).toContain("Serviços de Estúdio Aurora em Fortaleza, CE");
    expect(description).toContain("orçamento");
  });
});
