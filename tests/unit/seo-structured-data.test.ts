import { describe, expect, it } from "vitest";

import {
  buildBreadcrumbJsonLd,
  buildStorefrontJsonLd,
  serializeJsonLd,
  storefrontSchemaType,
} from "@/lib/seo/structured-data";

describe("storefrontSchemaType (varia por businessType)", () => {
  it("usa ProfessionalService para serviços", () => {
    expect(storefrontSchemaType("SERVICES")).toBe("ProfessionalService");
  });
  it("usa LocalBusiness para produtos e para ambos", () => {
    expect(storefrontSchemaType("PRODUCTS")).toBe("LocalBusiness");
    expect(storefrontSchemaType("BOTH")).toBe("LocalBusiness");
  });
});

describe("buildStorefrontJsonLd", () => {
  const base = {
    businessName: "Estúdio Aurora",
    businessType: "SERVICES" as const,
    url: "https://vitriny.example/u/estudio-aurora",
    description: null,
    city: null,
    state: null,
    address: null,
    phone: null,
    sameAs: [] as string[],
    items: [] as { name: string; itemType: "PRODUCT" | "SERVICE" }[],
    image: null,
  };

  it("emite o mínimo obrigatório", () => {
    const node = buildStorefrontJsonLd(base);
    expect(node["@context"]).toBe("https://schema.org");
    expect(node["@type"]).toBe("ProfessionalService");
    expect(node.name).toBe("Estúdio Aurora");
    expect(node.url).toBe(base.url);
  });

  it("NÃO expõe telefone, endereço ou redes quando não publicados", () => {
    const node = buildStorefrontJsonLd(base);
    expect(node.telephone).toBeUndefined();
    expect(node.address).toBeUndefined();
    expect(node.sameAs).toBeUndefined();
    expect(node.hasOfferCatalog).toBeUndefined();
    expect(node.description).toBeUndefined();
  });

  it("inclui telefone, endereço e redes SOMENTE quando publicados", () => {
    const node = buildStorefrontJsonLd({
      ...base,
      description: "  Design floral.  ",
      phone: "+55 85 99999-0000",
      city: "Fortaleza",
      state: "CE",
      address: "Rua das Flores, 10",
      sameAs: ["https://instagram.com/aurora"],
    });
    expect(node.telephone).toBe("+55 85 99999-0000");
    expect(node.description).toBe("Design floral.");
    expect(node.sameAs).toEqual(["https://instagram.com/aurora"]);
    expect(node.address).toEqual({
      "@type": "PostalAddress",
      streetAddress: "Rua das Flores, 10",
      addressLocality: "Fortaleza",
      addressRegion: "CE",
      addressCountry: "BR",
    });
    expect(node.areaServed).toBe("Fortaleza, CE");
  });

  it("monta o catálogo de ofertas mapeando item para Product/Service", () => {
    const node = buildStorefrontJsonLd({
      ...base,
      items: [
        { name: "Buquê", itemType: "PRODUCT" },
        { name: "Consultoria", itemType: "SERVICE" },
      ],
    });
    const catalog = node.hasOfferCatalog as Record<string, unknown>;
    expect(catalog["@type"]).toBe("OfferCatalog");
    const elements = catalog.itemListElement as Array<Record<string, unknown>>;
    expect(elements).toHaveLength(2);
    expect(elements[0]).toMatchObject({
      "@type": "Offer",
      itemOffered: { "@type": "Product", name: "Buquê" },
    });
    expect(elements[1]).toMatchObject({
      "@type": "Offer",
      itemOffered: { "@type": "Service", name: "Consultoria" },
    });
  });
});

describe("serializeJsonLd (XSS-safe)", () => {
  it("escapa `<` para não fechar a tag <script>", () => {
    const out = serializeJsonLd({ name: "Loja </script><script>alert(1)" });
    expect(out).not.toContain("</script>");
    expect(out).toContain("\\u003c");
    // Continua sendo JSON válido.
    expect(JSON.parse(out).name).toBe("Loja </script><script>alert(1)");
  });
});

describe("buildBreadcrumbJsonLd", () => {
  it("gera trilha Vitriny > negócio", () => {
    const node = buildBreadcrumbJsonLd({
      businessName: "Estúdio Aurora",
      url: "https://vitriny.example/u/estudio-aurora",
      baseUrl: "https://vitriny.example",
    });
    expect(node["@type"]).toBe("BreadcrumbList");
    const items = node.itemListElement as Array<Record<string, unknown>>;
    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({ position: 1, name: "Vitriny" });
    expect(items[1]).toMatchObject({ position: 2, name: "Estúdio Aurora" });
  });
});
