import type { BusinessType } from "@prisma/client";

// Regra central: os dados estruturados refletem SÓ o que a vitrine mostra. Cada
// campo (telefone, endereço, redes, catálogo) só entra quando o prestador o
// publicou. Nada é inferido além do país (produto brasileiro).

// O tipo Schema.org varia por businessType (ProfessionalService não serve para
// quem vende produtos): serviços → ProfessionalService; produtos/ambos →
// LocalBusiness com catálogo de ofertas.
export function storefrontSchemaType(
  businessType: BusinessType,
): "ProfessionalService" | "LocalBusiness" {
  return businessType === "SERVICES" ? "ProfessionalService" : "LocalBusiness";
}

type StorefrontJsonLdInput = {
  businessName: string;
  businessType: BusinessType;
  url: string;
  description?: string | null;
  city?: string | null;
  state?: string | null;
  address?: string | null;
  phone?: string | null;
  sameAs?: string[];
  items?: { name: string; itemType: "PRODUCT" | "SERVICE" }[];
  image?: string | null;
};

function buildPostalAddress(input: StorefrontJsonLdInput) {
  const street = input.address?.trim();
  const city = input.city?.trim();
  const state = input.state?.trim();
  if (!street && !city && !state) return undefined;

  const address: Record<string, unknown> = { "@type": "PostalAddress" };
  if (street) address.streetAddress = street;
  if (city) address.addressLocality = city;
  if (state) address.addressRegion = state;
  address.addressCountry = "BR";
  return address;
}

export function buildStorefrontJsonLd(
  input: StorefrontJsonLdInput,
): Record<string, unknown> {
  const node: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": storefrontSchemaType(input.businessType),
    name: input.businessName,
    url: input.url,
  };

  const description = input.description?.trim();
  if (description) node.description = description;
  if (input.image) node.image = input.image;
  if (input.phone?.trim()) node.telephone = input.phone.trim();

  const address = buildPostalAddress(input);
  if (address) node.address = address;

  const areaServed = [input.city, input.state]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(", ");
  if (areaServed) node.areaServed = areaServed;

  if (input.sameAs && input.sameAs.length > 0) node.sameAs = input.sameAs;

  if (input.items && input.items.length > 0) {
    node.hasOfferCatalog = {
      "@type": "OfferCatalog",
      name: `Itens de ${input.businessName}`,
      itemListElement: input.items.map((item) => ({
        "@type": "Offer",
        itemOffered: {
          "@type": item.itemType === "PRODUCT" ? "Product" : "Service",
          name: item.name,
        },
      })),
    };
  }

  return node;
}

export function buildBreadcrumbJsonLd(input: {
  businessName: string;
  url: string;
  baseUrl: string;
}): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Vitriny",
        item: input.baseUrl,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: input.businessName,
        item: input.url,
      },
    ],
  };
}

// Landing: Organization + WebSite (sem SearchAction — não há busca no site).
export function buildOrganizationJsonLd(
  baseUrl: string,
): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Vitriny",
    url: baseUrl,
    description:
      "Vitrine online para pequenos negócios apresentarem produtos e serviços, receberem pedidos e enviarem propostas.",
  };
}

export function buildWebSiteJsonLd(baseUrl: string): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Vitriny",
    url: baseUrl,
    inLanguage: "pt-BR",
  };
}

// Serializa para injeção em <script>. Escapa `<` para impedir que conteúdo do
// dono (nome, descrição) feche a tag <script> e injete markup.
export function serializeJsonLd(
  data: Record<string, unknown> | Record<string, unknown>[],
): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
