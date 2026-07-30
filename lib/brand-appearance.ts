import type {
  PlanTier,
  ProviderBrandColor,
  ProviderBrandFont,
} from "@prisma/client";

import { canUseBrandCustomization } from "@/lib/plan-limits";

export type BrandAppearance = {
  color: ProviderBrandColor;
  font: ProviderBrandFont;
};

export type BrandColorOption = {
  id: ProviderBrandColor;
  name: string;
  description: string;
};

export type BrandFontOption = {
  id: ProviderBrandFont;
  name: string;
  description: string;
  sample: string;
};

export const DEFAULT_BRAND_APPEARANCE: BrandAppearance = {
  color: "FOREST",
  font: "CLASSIC",
};

export const BRAND_COLOR_OPTIONS: readonly BrandColorOption[] = [
  {
    id: "FOREST",
    name: "Verde",
    description: "Natural, confiável e acolhedor.",
  },
  {
    id: "OCEAN",
    name: "Azul",
    description: "Claro, profissional e objetivo.",
  },
  {
    id: "ROSE",
    name: "Rosa",
    description: "Delicado, próximo e expressivo.",
  },
  {
    id: "GOLD",
    name: "Dourado",
    description: "Sóbrio, artesanal e sofisticado.",
  },
  {
    id: "SLATE",
    name: "Grafite",
    description: "Minimalista, neutro e seguro.",
  },
  {
    id: "LAVENDER",
    name: "Lavanda",
    description: "Criativo com equilíbrio e suavidade.",
  },
  {
    id: "TERRACOTTA",
    name: "Terracota",
    description: "Quente, humano e cheio de presença.",
  },
  {
    id: "TEAL",
    name: "Turquesa",
    description: "Fresco, equilibrado e versátil.",
  },
];

export const BRAND_FONT_OPTIONS: readonly BrandFontOption[] = [
  {
    id: "CLASSIC",
    name: "Clássica",
    description: "Fraunces nos títulos e Jakarta nos textos.",
    sample: "Personalidade com elegância",
  },
  {
    id: "MODERN",
    name: "Moderna",
    description: "Jakarta em toda a experiência.",
    sample: "Clareza para todos os negócios",
  },
  {
    id: "ELEGANT",
    name: "Elegante",
    description: "Playfair Display nos títulos e Jakarta nos textos.",
    sample: "Detalhes que valorizam sua marca",
  },
  {
    id: "GEOMETRIC",
    name: "Geométrica",
    description: "Space Grotesk em toda a experiência.",
    sample: "Presença direta e contemporânea",
  },
  {
    id: "FRIENDLY",
    name: "Amigável",
    description: "Nunito Sans em toda a experiência.",
    sample: "Uma marca próxima e acolhedora",
  },
  {
    id: "EDITORIAL",
    name: "Editorial",
    description: "Lora nos títulos e Jakarta nos textos.",
    sample: "Histórias que merecem destaque",
  },
];

const BRAND_COLORS = new Set(BRAND_COLOR_OPTIONS.map((option) => option.id));
const BRAND_FONTS = new Set(BRAND_FONT_OPTIONS.map((option) => option.id));

// Kit inicial do FREE: 3 cores + 2 fontes selecionáveis. Prioriza adoção e a
// diversidade das vitrines FREE (não parecer fazenda de templates) sem entregar
// o sistema completo. As demais opções aparecem bloqueadas (upsell PRO); o PRO
// libera todas.
export const FREE_BRAND_COLORS: readonly ProviderBrandColor[] = [
  "FOREST",
  "OCEAN",
  "TERRACOTTA",
];

export const FREE_BRAND_FONTS: readonly ProviderBrandFont[] = [
  "CLASSIC",
  "MODERN",
];

// Uma opção está disponível para o plano quando é PRO (todas) ou quando é uma
// das liberadas no FREE.
export function isBrandColorAvailable(
  plan: PlanTier,
  color: ProviderBrandColor,
): boolean {
  return canUseBrandCustomization(plan) || FREE_BRAND_COLORS.includes(color);
}

export function isBrandFontAvailable(
  plan: PlanTier,
  font: ProviderBrandFont,
): boolean {
  return canUseBrandCustomization(plan) || FREE_BRAND_FONTS.includes(font);
}

export function getBrandAppearance(
  plan: PlanTier,
  savedColor: ProviderBrandColor | null | undefined,
  savedFont: ProviderBrandFont | null | undefined,
): BrandAppearance {
  return {
    color:
      savedColor &&
      BRAND_COLORS.has(savedColor) &&
      isBrandColorAvailable(plan, savedColor)
        ? savedColor
        : DEFAULT_BRAND_APPEARANCE.color,
    font:
      savedFont &&
      BRAND_FONTS.has(savedFont) &&
      isBrandFontAvailable(plan, savedFont)
        ? savedFont
        : DEFAULT_BRAND_APPEARANCE.font,
  };
}
