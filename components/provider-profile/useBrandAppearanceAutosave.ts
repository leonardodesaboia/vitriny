"use client";

import { useEffect, useRef, useState } from "react";
import type { ProviderBrandColor, ProviderBrandFont } from "@prisma/client";

import { saveBrandAppearance } from "@/lib/actions/brand-appearance";

type Appearance = {
  brandColor: ProviderBrandColor;
  brandFont: ProviderBrandFont;
};

type Feedback = {
  message: string;
  tone: "success" | "error";
} | null;

const AUTOSAVE_DELAY_MS = 300;

function applyAppearance(appearance: Appearance) {
  const root = document.querySelector<HTMLElement>(
    "[data-brand-color][data-brand-font]",
  );
  root?.setAttribute("data-brand-color", appearance.brandColor);
  root?.setAttribute("data-brand-font", appearance.brandFont);
}

export function useBrandAppearanceAutosave(initialAppearance: Appearance) {
  const [selected, setSelected] = useState(initialAppearance);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [isSaving, setIsSaving] = useState(false);
  const currentRef = useRef(initialAppearance);
  const persistedRef = useRef(initialAppearance);
  const queuedRef = useRef<Appearance | null>(null);
  const savingRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  useEffect(
    () => () => {
      mountedRef.current = false;
      if (timerRef.current) clearTimeout(timerRef.current);
      const pendingAppearance = queuedRef.current;
      queuedRef.current = null;
      if (pendingAppearance) {
        void saveBrandAppearance(pendingAppearance);
      }
    },
    [],
  );

  async function flushQueue() {
    if (savingRef.current) return;
    savingRef.current = true;

    while (queuedRef.current) {
      const appearance = queuedRef.current;
      queuedRef.current = null;

      try {
        const result = await saveBrandAppearance(appearance);
        if ("error" in result) {
          if (!queuedRef.current) {
            currentRef.current = persistedRef.current;
            applyAppearance(persistedRef.current);
            if (mountedRef.current) setSelected(persistedRef.current);
          }
          if (mountedRef.current) {
            setFeedback({ message: result.error, tone: "error" });
          }
          continue;
        }

        persistedRef.current = appearance;
        if (mountedRef.current && !queuedRef.current) {
          setFeedback({
            message: "Aparência salva automaticamente.",
            tone: "success",
          });
        }
      } catch {
        if (!queuedRef.current) {
          currentRef.current = persistedRef.current;
          applyAppearance(persistedRef.current);
          if (mountedRef.current) setSelected(persistedRef.current);
        }
        if (mountedRef.current) {
          setFeedback({
            message: "Não foi possível salvar a aparência. Tente novamente.",
            tone: "error",
          });
        }
      }
    }

    savingRef.current = false;
    if (mountedRef.current) setIsSaving(false);
  }

  function schedule(nextAppearance: Appearance) {
    currentRef.current = nextAppearance;
    queuedRef.current = nextAppearance;
    setSelected(nextAppearance);
    setFeedback(null);
    setIsSaving(true);
    applyAppearance(nextAppearance);

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      void flushQueue();
    }, AUTOSAVE_DELAY_MS);
  }

  return {
    selected,
    feedback,
    isSaving,
    chooseColor: (brandColor: ProviderBrandColor) =>
      schedule({ ...currentRef.current, brandColor }),
    chooseFont: (brandFont: ProviderBrandFont) =>
      schedule({ ...currentRef.current, brandFont }),
  };
}
