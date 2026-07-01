import type { PlanTier, ProviderThemePreset } from "@prisma/client";

export type PublicThemePreset = {
  id: ProviderThemePreset;
  name: string;
  description: string;
  fontLabel: string;
  preview: {
    background: string;
    accent: string;
    surface: string;
  };
};

export const THEME_PRESETS: Record<ProviderThemePreset, PublicThemePreset> = {
  DEFAULT: {
    id: "DEFAULT",
    name: "Padrão",
    description: "Neutro e universal, combina com qualquer negócio.",
    fontLabel: "Fraunces + Plus Jakarta Sans",
    preview: {
      background: "bg-paper",
      accent: "bg-leaf",
      surface: "bg-white"
    }
  },
  CLEAN: {
    id: "CLEAN",
    name: "Clean",
    description: "Azul, claro e objetivo para uma presença mais direta.",
    fontLabel: "Plus Jakarta Sans",
    preview: {
      background: "bg-paper",
      accent: "bg-leaf",
      surface: "bg-white"
    }
  },
  BEAUTY: {
    id: "BEAUTY",
    name: "Beauty",
    description: "Tons rosados e suaves para beleza, estética e bem-estar.",
    fontLabel: "Fraunces + Plus Jakarta Sans",
    preview: {
      background: "bg-paper",
      accent: "bg-leaf",
      surface: "bg-white"
    }
  },
  CREATIVE: {
    id: "CREATIVE",
    name: "Creative",
    description: "Cores expressivas para fotografia, design e social media.",
    fontLabel: "Plus Jakarta Sans",
    preview: {
      background: "bg-paper",
      accent: "bg-leaf",
      surface: "bg-white"
    }
  },
  PREMIUM: {
    id: "PREMIUM",
    name: "Premium",
    description: "Dourado sóbrio para itens de maior valor.",
    fontLabel: "Fraunces + Plus Jakarta Sans",
    preview: {
      background: "bg-paper",
      accent: "bg-leaf",
      surface: "bg-white"
    }
  },
  BOLD: {
    id: "BOLD",
    name: "Bold",
    description: "Contraste forte e energia visual para marcas mais chamativas.",
    fontLabel: "Plus Jakarta Sans",
    preview: {
      background: "bg-paper",
      accent: "bg-leaf",
      surface: "bg-white"
    }
  }
};

export const THEME_PRESET_OPTIONS = [
  THEME_PRESETS.DEFAULT,
  THEME_PRESETS.CLEAN,
  THEME_PRESETS.BEAUTY,
  THEME_PRESETS.CREATIVE,
  THEME_PRESETS.PREMIUM,
  THEME_PRESETS.BOLD
];

export function getThemePreset(
  preset: ProviderThemePreset | null | undefined
): PublicThemePreset {
  return preset ? THEME_PRESETS[preset] ?? THEME_PRESETS.DEFAULT : THEME_PRESETS.DEFAULT;
}

export function getPublicThemePreset(
  plan: PlanTier,
  savedPreset: ProviderThemePreset | null | undefined
): PublicThemePreset {
  if (plan !== "PRO") return THEME_PRESETS.DEFAULT;
  return getThemePreset(savedPreset);
}
