import type { BusinessType } from "@prisma/client";

type StorefrontSeoInput = {
  businessName: string;
  businessType: BusinessType;
  description?: string | null;
  city?: string | null;
  state?: string | null;
};

const TYPE_LABELS: Record<BusinessType, string> = {
  PRODUCTS: "Produtos",
  SERVICES: "Serviços",
  BOTH: "Produtos e serviços",
};

export function catalogTypeLabel(businessType: BusinessType): string {
  return TYPE_LABELS[businessType];
}

// Título e descrição orientados à busca local: "[negócio] — [tipo] em [cidade,
// UF]". Reflete só o que a vitrine já mostra; a descrição do dono tem prioridade
// sobre o fallback gerado.
export function buildStorefrontSeo(input: StorefrontSeoInput): {
  title: string;
  description: string;
} {
  const typeLabel = catalogTypeLabel(input.businessType);
  const location = [input.city, input.state]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(", ");

  const title = location
    ? `${input.businessName} — ${typeLabel} em ${location}`
    : `${input.businessName} — ${typeLabel}`;

  const ownerDescription = input.description?.trim();
  const description = ownerDescription
    ? ownerDescription
    : location
      ? `${typeLabel} de ${input.businessName} em ${location}. Veja os itens disponíveis e faça seu pedido de orçamento.`
      : `${typeLabel} de ${input.businessName}. Veja os itens disponíveis e faça seu pedido de orçamento.`;

  return { title, description };
}
