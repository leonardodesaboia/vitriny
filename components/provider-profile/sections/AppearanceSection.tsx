"use client";

import { useState } from "react";
import Link from "next/link";
import type {
  PlanTier,
  ProviderBrandColor,
  ProviderBrandFont,
} from "@prisma/client";

import { SectionHeader } from "@/components/provider-profile/profile-form-ui";
import {
  BRAND_COLOR_OPTIONS,
  BRAND_FONT_OPTIONS,
  isBrandColorAvailable,
  isBrandFontAvailable,
} from "@/lib/brand-appearance";
import { canUseBrandCustomization } from "@/lib/plan-limits";
import { useBrandAppearanceAutosave } from "@/components/provider-profile/useBrandAppearanceAutosave";

type AppearanceSectionProps = {
  plan: PlanTier;
  currentBrandColor: ProviderBrandColor;
  currentBrandFont: ProviderBrandFont;
};

const CARD_BASE =
  "group relative select-none rounded-xl p-3 text-left transition sm:p-4";
const CARD_AVAILABLE =
  "cursor-pointer border border-paper-soft bg-white focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-leaf has-[:checked]:border-leaf has-[:checked]:ring-2 has-[:checked]:ring-leaf/20";
const CARD_LOCKED =
  "cursor-pointer border border-dashed border-paper-soft bg-white hover:border-leaf focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf";

function LockBadge() {
  return (
    <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-leaf/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-leaf">
      <svg
        aria-hidden="true"
        className="h-2.5 w-2.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        viewBox="0 0 24 24"
      >
        <rect x="5" y="11" width="14" height="9" rx="2" />
        <path d="M8 11V8a4 4 0 0 1 8 0v3" strokeLinecap="round" />
      </svg>
      PRO
    </span>
  );
}

export function AppearanceSection({
  plan,
  currentBrandColor,
  currentBrandFont,
}: AppearanceSectionProps) {
  const { selected, feedback, isSaving, chooseColor, chooseFont } =
    useBrandAppearanceAutosave({
      brandColor: currentBrandColor,
      brandFont: currentBrandFont,
    });
  const [showLockHint, setShowLockHint] = useState(false);

  const isPro = canUseBrandCustomization(plan);

  function pickColor(id: ProviderBrandColor) {
    setShowLockHint(false);
    chooseColor(id);
  }
  function pickFont(id: ProviderBrandFont) {
    setShowLockHint(false);
    chooseFont(id);
  }

  return (
    <div className="grid gap-5">
      <SectionHeader
        label="Aparência da página"
        description="Clique em uma paleta ou tipografia para aplicar e salvar automaticamente."
        divider={false}
      />

      {!isPro ? (
        <div className="rounded-lg border border-paper-soft bg-white px-4 py-3">
          <p className="text-xs leading-5 text-ink-muted">
            No plano <span className="font-semibold text-ink">FREE</span> você
            usa 3 cores e 2 tipografias. Desbloqueie{" "}
            <span className="font-semibold text-ink">
              todas as cores e fontes
            </span>{" "}
            no{" "}
            <Link
              className="font-bold text-leaf underline underline-offset-2 transition hover:text-leaf-hover"
              href="/dashboard/billing"
            >
              plano PRO
            </Link>
            .
          </p>
        </div>
      ) : null}

      <div className="grid gap-6 rounded-xl border border-paper-soft bg-paper p-5">
        <fieldset className="grid gap-3">
              <legend className="text-sm font-bold text-ink">
                Cor da marca
              </legend>
              <p className="text-xs leading-5 text-ink-muted">
                A paleta define fundos, destaques, botões e estados de interação.
              </p>
              <div className="grid grid-cols-2 gap-3">
                {BRAND_COLOR_OPTIONS.map((option) => {
                  const available = isBrandColorAvailable(plan, option.id);
                  const swatch = (
                    <span className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
                      <span className="flex h-11 w-16 shrink-0 overflow-hidden rounded-lg border border-paper-soft">
                        <span className="flex-1 bg-paper" />
                        <span className="flex-1 bg-leaf" />
                        <span className="flex-1 bg-mint" />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold text-ink">
                          {option.name}
                        </span>
                        <span className="mt-1 block break-words text-xs leading-5 text-ink-muted">
                          {option.description}
                        </span>
                      </span>
                    </span>
                  );

                  if (!available) {
                    return (
                      <button
                        aria-label={`${option.name} — disponível no plano PRO`}
                        className={`${CARD_BASE} ${CARD_LOCKED}`}
                        data-brand-color={option.id}
                        key={option.id}
                        onClick={() => setShowLockHint(true)}
                        type="button"
                      >
                        <LockBadge />
                        {swatch}
                      </button>
                    );
                  }

                  return (
                    <label
                      className={`${CARD_BASE} ${CARD_AVAILABLE}`}
                      data-brand-color={option.id}
                      key={option.id}
                    >
                      <input
                        className="sr-only"
                        checked={selected.brandColor === option.id}
                        name="brandColor"
                        onChange={() => pickColor(option.id)}
                        type="radio"
                        value={option.id}
                      />
                      {swatch}
                    </label>
                  );
                })}
              </div>
        </fieldset>

        <fieldset className="grid gap-3 border-t border-paper-soft pt-6">
              <legend className="text-sm font-bold text-ink">Tipografia</legend>
              <p className="text-xs leading-5 text-ink-muted">
                Cada opção abaixo é renderizada com a fonte que será aplicada.
              </p>
              <div className="grid grid-cols-2 gap-3">
                {BRAND_FONT_OPTIONS.map((option) => {
                  const available = isBrandFontAvailable(plan, option.id);
                  const sample = (
                    <>
                      <span className="block min-w-0 break-words text-sm font-semibold text-ink">
                        {option.name}
                      </span>
                      <span className="mt-3 block min-w-0 break-words font-fraunces text-base font-bold leading-snug text-ink [overflow-wrap:anywhere] sm:text-xl sm:leading-tight">
                        {option.sample}
                      </span>
                      <span className="mt-2 block min-w-0 break-words font-jakarta text-xs leading-5 text-ink-muted [overflow-wrap:anywhere]">
                        {option.description}
                      </span>
                    </>
                  );

                  if (!available) {
                    return (
                      <button
                        aria-label={`${option.name} — disponível no plano PRO`}
                        className={`${CARD_BASE} ${CARD_LOCKED}`}
                        data-brand-font={option.id}
                        key={option.id}
                        onClick={() => setShowLockHint(true)}
                        type="button"
                      >
                        <LockBadge />
                        {sample}
                      </button>
                    );
                  }

                  return (
                    <label
                      className={`${CARD_BASE} ${CARD_AVAILABLE}`}
                      data-brand-font={option.id}
                      key={option.id}
                    >
                      <input
                        className="sr-only"
                        checked={selected.brandFont === option.id}
                        name="brandFont"
                        onChange={() => pickFont(option.id)}
                        type="radio"
                        value={option.id}
                      />
                      {sample}
                    </label>
                  );
                })}
              </div>
        </fieldset>

        <div aria-live="polite" className="min-h-4">
          {showLockHint ? (
            <p className="text-xs font-semibold text-ink-muted">
              Essa opção faz parte do plano PRO.{" "}
              <Link
                className="font-bold text-leaf underline underline-offset-2 transition hover:text-leaf-hover"
                href="/dashboard/billing"
              >
                Conhecer o PRO
              </Link>
            </p>
          ) : (
            <p
              className={`text-xs font-semibold ${
                feedback?.tone === "error" ? "text-red-700" : "text-ink-muted"
              }`}
            >
              {isSaving ? "Salvando automaticamente..." : feedback?.message}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
