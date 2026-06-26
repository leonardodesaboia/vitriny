import type { PlanTier, ProviderThemePreset } from "@prisma/client";

export type PublicThemePreset = {
  id: ProviderThemePreset;
  name: string;
  description: string;
  preview: {
    background: string;
    accent: string;
    surface: string;
  };
  page: string;
  hero: string;
  heroEyebrow: string;
  heroTitle: string;
  heroDescription: string;
  sectionEyebrow: string;
  sectionTitle: string;
  contactCard: string;
  contactLabel: string;
  contactValue: string;
  serviceGrid: string;
  serviceCard: string;
  serviceImage: string;
  serviceTitle: string;
  serviceDescription: string;
  servicePrice: string;
  primaryButton: string;
  secondaryButton: string;
  badge: string;
  stepCard: string;
  stepMarker: string;
  poweredBy: string;
};

export const THEME_PRESETS: Record<ProviderThemePreset, PublicThemePreset> = {
  DEFAULT: {
    id: "DEFAULT",
    name: "Padrão",
    description: "Neutro e universal, combina com qualquer prestador.",
    preview: {
      background: "bg-paper",
      accent: "bg-leaf",
      surface: "bg-white"
    },
    page: "bg-paper text-ink font-jakarta",
    hero: "grain relative bg-leaf px-6 pb-16 pt-14",
    heroEyebrow: "text-xs font-semibold uppercase tracking-[0.2em] text-white/60",
    heroTitle: "mt-3 font-fraunces text-5xl font-bold leading-tight text-white md:text-6xl",
    heroDescription: "mt-5 max-w-2xl text-base leading-7 text-white/80",
    sectionEyebrow: "text-xs font-semibold uppercase tracking-[0.2em] text-leaf",
    sectionTitle: "mt-2 font-fraunces text-3xl font-bold text-ink",
    contactCard: "rounded-xl border border-paper-soft bg-white p-4 shadow-card",
    contactLabel: "text-xs font-semibold uppercase tracking-widest text-ink-muted",
    contactValue: "mt-1 text-sm font-semibold text-leaf transition hover:underline",
    serviceGrid: "mt-6 grid gap-4 sm:grid-cols-2",
    serviceCard:
      "group flex flex-col overflow-hidden rounded-xl border border-paper-soft bg-white shadow-card transition-shadow hover:shadow-card-hover",
    serviceImage: "h-44 w-full object-cover",
    serviceTitle: "font-jakarta text-base font-bold text-ink",
    serviceDescription: "mt-2 flex-1 text-sm leading-6 text-ink-muted",
    servicePrice: "mt-3 font-fraunces text-lg font-bold text-ink",
    primaryButton:
      "inline-flex min-h-9 flex-1 items-center justify-center rounded-md bg-leaf px-4 text-xs font-semibold text-white transition-colors hover:bg-leaf-hover",
    secondaryButton:
      "inline-flex min-h-9 flex-1 items-center justify-center rounded-md border border-paper-soft bg-paper px-4 text-xs font-semibold text-ink transition-colors hover:border-leaf hover:text-leaf",
    badge: "mt-3 text-xs font-semibold uppercase tracking-widest text-ink-muted",
    stepCard: "rounded-xl border border-paper-soft bg-white p-5 shadow-card",
    stepMarker:
      "inline-flex h-8 w-8 items-center justify-center rounded-full bg-mint text-sm font-bold text-leaf",
    poweredBy: "mt-8 text-center text-xs text-ink-muted/60"
  },
  CLEAN: {
    id: "CLEAN",
    name: "Clean",
    description: "Claro, simples e arejado para uma página bem objetiva.",
    preview: {
      background: "bg-slate-50",
      accent: "bg-sky-600",
      surface: "bg-white"
    },
    page: "bg-slate-50 text-slate-950 font-jakarta",
    hero: "relative bg-white px-6 pb-16 pt-14 border-b border-slate-200",
    heroEyebrow: "text-xs font-semibold uppercase tracking-[0.2em] text-sky-700",
    heroTitle: "mt-3 font-jakarta text-5xl font-extrabold leading-tight text-slate-950 md:text-6xl",
    heroDescription: "mt-5 max-w-2xl text-base leading-7 text-slate-600",
    sectionEyebrow: "text-xs font-semibold uppercase tracking-[0.2em] text-sky-700",
    sectionTitle: "mt-2 font-jakarta text-3xl font-extrabold text-slate-950",
    contactCard: "rounded-xl border border-slate-200 bg-white p-4 shadow-sm",
    contactLabel: "text-xs font-semibold uppercase tracking-widest text-slate-500",
    contactValue: "mt-1 text-sm font-semibold text-sky-700 transition hover:underline",
    serviceGrid: "mt-6 grid gap-4 sm:grid-cols-2",
    serviceCard:
      "group flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md",
    serviceImage: "h-44 w-full object-cover",
    serviceTitle: "font-jakarta text-base font-bold text-slate-950",
    serviceDescription: "mt-2 flex-1 text-sm leading-6 text-slate-600",
    servicePrice: "mt-3 font-jakarta text-lg font-extrabold text-slate-950",
    primaryButton:
      "inline-flex min-h-9 flex-1 items-center justify-center rounded-md bg-sky-700 px-4 text-xs font-semibold text-white transition-colors hover:bg-sky-800",
    secondaryButton:
      "inline-flex min-h-9 flex-1 items-center justify-center rounded-md border border-slate-200 bg-slate-50 px-4 text-xs font-semibold text-slate-900 transition-colors hover:border-sky-600 hover:text-sky-700",
    badge: "mt-3 text-xs font-semibold uppercase tracking-widest text-slate-500",
    stepCard: "rounded-xl border border-slate-200 bg-white p-5 shadow-sm",
    stepMarker:
      "inline-flex h-8 w-8 items-center justify-center rounded-full bg-sky-100 text-sm font-bold text-sky-700",
    poweredBy: "mt-8 text-center text-xs text-slate-500"
  },
  BEAUTY: {
    id: "BEAUTY",
    name: "Beauty",
    description: "Suave e acolhedor, ideal para beleza, estética e bem-estar.",
    preview: {
      background: "bg-rose-50",
      accent: "bg-rose-500",
      surface: "bg-white"
    },
    page: "bg-rose-50 text-stone-950 font-jakarta",
    hero: "relative bg-rose-600 px-6 pb-16 pt-14",
    heroEyebrow: "text-xs font-semibold uppercase tracking-[0.2em] text-rose-100",
    heroTitle: "mt-3 font-fraunces text-5xl font-bold italic leading-tight text-white md:text-6xl",
    heroDescription: "mt-5 max-w-2xl text-base leading-7 text-rose-50",
    sectionEyebrow: "text-xs font-semibold uppercase tracking-[0.2em] text-rose-700",
    sectionTitle: "mt-2 font-fraunces text-3xl font-bold italic text-stone-950",
    contactCard: "rounded-xl border border-rose-100 bg-white p-4 shadow-sm",
    contactLabel: "text-xs font-semibold uppercase tracking-widest text-stone-500",
    contactValue: "mt-1 text-sm font-semibold text-rose-700 transition hover:underline",
    serviceGrid: "mt-6 grid gap-4 sm:grid-cols-2",
    serviceCard:
      "group flex flex-col overflow-hidden rounded-xl border border-rose-100 bg-white shadow-sm transition-shadow hover:shadow-md",
    serviceImage: "h-44 w-full object-cover",
    serviceTitle: "font-fraunces text-lg font-bold text-stone-950",
    serviceDescription: "mt-2 flex-1 text-sm leading-6 text-stone-600",
    servicePrice: "mt-3 font-fraunces text-lg font-bold text-stone-950",
    primaryButton:
      "inline-flex min-h-9 flex-1 items-center justify-center rounded-md bg-rose-600 px-4 text-xs font-semibold text-white transition-colors hover:bg-rose-700",
    secondaryButton:
      "inline-flex min-h-9 flex-1 items-center justify-center rounded-md border border-rose-100 bg-rose-50 px-4 text-xs font-semibold text-stone-900 transition-colors hover:border-rose-500 hover:text-rose-700",
    badge: "mt-3 text-xs font-semibold uppercase tracking-widest text-stone-500",
    stepCard: "rounded-xl border border-rose-100 bg-white p-5 shadow-sm",
    stepMarker:
      "inline-flex h-8 w-8 items-center justify-center rounded-full bg-rose-100 text-sm font-bold text-rose-700",
    poweredBy: "mt-8 text-center text-xs text-stone-500"
  },
  CREATIVE: {
    id: "CREATIVE",
    name: "Creative",
    description: "Marcante e expressivo para fotografia, design e social media.",
    preview: {
      background: "bg-cyan-50",
      accent: "bg-fuchsia-600",
      surface: "bg-white"
    },
    page: "bg-cyan-50 text-slate-950 font-jakarta",
    hero: "relative bg-fuchsia-700 px-6 pb-16 pt-14",
    heroEyebrow: "font-mono text-xs font-semibold uppercase tracking-[0.2em] text-fuchsia-100",
    heroTitle: "mt-3 font-jakarta text-5xl font-black leading-tight text-white md:text-6xl",
    heroDescription: "mt-5 max-w-2xl text-base leading-7 text-fuchsia-50",
    sectionEyebrow: "font-mono text-xs font-semibold uppercase tracking-[0.2em] text-fuchsia-700",
    sectionTitle: "mt-2 font-jakarta text-3xl font-black text-slate-950",
    contactCard: "rounded-xl border border-cyan-100 bg-white p-4 shadow-sm",
    contactLabel: "font-mono text-xs font-semibold uppercase tracking-widest text-slate-500",
    contactValue: "mt-1 text-sm font-semibold text-fuchsia-700 transition hover:underline",
    serviceGrid: "mt-6 grid gap-4 sm:grid-cols-2",
    serviceCard:
      "group flex flex-col overflow-hidden rounded-xl border border-cyan-100 bg-white shadow-sm transition-shadow hover:shadow-md",
    serviceImage: "h-44 w-full object-cover",
    serviceTitle: "font-jakarta text-base font-black text-slate-950",
    serviceDescription: "mt-2 flex-1 text-sm leading-6 text-slate-600",
    servicePrice: "mt-3 font-jakarta text-lg font-black text-slate-950",
    primaryButton:
      "inline-flex min-h-9 flex-1 items-center justify-center rounded-md bg-fuchsia-700 px-4 font-mono text-xs font-semibold uppercase tracking-wider text-white transition-colors hover:bg-fuchsia-800",
    secondaryButton:
      "inline-flex min-h-9 flex-1 items-center justify-center rounded-md border border-cyan-100 bg-cyan-50 px-4 font-mono text-xs font-semibold uppercase tracking-wider text-slate-900 transition-colors hover:border-fuchsia-500 hover:text-fuchsia-700",
    badge: "mt-3 font-mono text-xs font-semibold uppercase tracking-widest text-slate-500",
    stepCard: "rounded-xl border border-cyan-100 bg-white p-5 shadow-sm",
    stepMarker:
      "inline-flex h-8 w-8 items-center justify-center rounded-full bg-cyan-100 text-sm font-bold text-fuchsia-700",
    poweredBy: "mt-8 text-center text-xs text-slate-500"
  },
  PREMIUM: {
    id: "PREMIUM",
    name: "Premium",
    description: "Sóbrio e elegante para serviços de maior valor.",
    preview: {
      background: "bg-zinc-950",
      accent: "bg-amber-500",
      surface: "bg-zinc-900"
    },
    page: "bg-zinc-950 text-zinc-50 font-jakarta",
    hero: "relative bg-zinc-950 px-6 pb-16 pt-14 border-b border-zinc-800",
    heroEyebrow: "font-mono text-xs font-semibold uppercase tracking-[0.2em] text-amber-400",
    heroTitle: "mt-3 font-fraunces text-5xl font-bold leading-tight text-white md:text-6xl",
    heroDescription: "mt-5 max-w-2xl text-base leading-7 text-zinc-300",
    sectionEyebrow: "font-mono text-xs font-semibold uppercase tracking-[0.2em] text-amber-400",
    sectionTitle: "mt-2 font-fraunces text-3xl font-bold text-white",
    contactCard: "rounded-xl border border-zinc-800 bg-zinc-900 p-4 shadow-sm",
    contactLabel: "font-mono text-xs font-semibold uppercase tracking-widest text-zinc-400",
    contactValue: "mt-1 text-sm font-semibold text-amber-300 transition hover:underline",
    serviceGrid: "mt-6 grid gap-4 sm:grid-cols-2",
    serviceCard:
      "group flex flex-col overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900 shadow-sm transition-shadow hover:shadow-md",
    serviceImage: "h-44 w-full object-cover",
    serviceTitle: "font-fraunces text-lg font-bold text-white",
    serviceDescription: "mt-2 flex-1 text-sm leading-6 text-zinc-300",
    servicePrice: "mt-3 font-fraunces text-lg font-bold text-white",
    primaryButton:
      "inline-flex min-h-9 flex-1 items-center justify-center rounded-md bg-amber-500 px-4 text-xs font-semibold text-zinc-950 transition-colors hover:bg-amber-400",
    secondaryButton:
      "inline-flex min-h-9 flex-1 items-center justify-center rounded-md border border-zinc-700 bg-zinc-950 px-4 text-xs font-semibold text-zinc-100 transition-colors hover:border-amber-400 hover:text-amber-300",
    badge: "mt-3 font-mono text-xs font-semibold uppercase tracking-widest text-zinc-400",
    stepCard: "rounded-xl border border-zinc-800 bg-zinc-900 p-5 shadow-sm",
    stepMarker:
      "inline-flex h-8 w-8 items-center justify-center rounded-full bg-amber-500 text-sm font-bold text-zinc-950",
    poweredBy: "mt-8 text-center text-xs text-zinc-500"
  }
};

export const THEME_PRESET_OPTIONS = [
  THEME_PRESETS.DEFAULT,
  THEME_PRESETS.CLEAN,
  THEME_PRESETS.BEAUTY,
  THEME_PRESETS.CREATIVE,
  THEME_PRESETS.PREMIUM
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
