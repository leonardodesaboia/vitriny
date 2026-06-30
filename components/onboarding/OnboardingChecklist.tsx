"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";

import {
  markPublicLinkUsed,
  ONBOARDING_PUBLIC_LINK_KEY,
  onboardingStorageKey,
} from "@/components/onboarding/onboarding-storage";

export type OnboardingStep = {
  id: string;
  label: string;
  description: string;
  done: boolean;
  href?: string;
  actionLabel?: string;
  isCopyStep?: boolean;
};

interface OnboardingChecklistProps {
  steps: OnboardingStep[];
  slug?: string;
  storageScope?: string;
}

const STORAGE_KEY = "vitriny-onboarding-dismissed";

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener("vitriny:onboarding-updated", callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("vitriny:onboarding-updated", callback);
  };
}
function getStoredFlag(key: string, storageScope: string) {
  return localStorage.getItem(onboardingStorageKey(key, storageScope)) === "1";
}
function getServerSnapshot() {
  return false;
}

export function OnboardingChecklist({
  steps,
  slug,
  storageScope = "default",
}: OnboardingChecklistProps) {
  const storedDismissed = useSyncExternalStore(
    subscribe,
    () => getStoredFlag(STORAGE_KEY, storageScope),
    getServerSnapshot,
  );
  const publicLinkUsed = useSyncExternalStore(
    subscribe,
    () => getStoredFlag(ONBOARDING_PUBLIC_LINK_KEY, storageScope),
    getServerSnapshot,
  );
  const [localDismissed, setLocalDismissed] = useState(false);
  const [copied, setCopied] = useState(false);

  const dismissed = storedDismissed || localDismissed;
  const displaySteps = useMemo(
    () =>
      steps.map((step) =>
        step.isCopyStep ? { ...step, done: step.done || publicLinkUsed } : step,
      ),
    [publicLinkUsed, steps],
  );
  const completedCount = displaySteps.filter((s) => s.done).length;
  const allDone = completedCount === displaySteps.length;
  const nextStep = displaySteps.find((s) => !s.done);
  const progressPercent = Math.round(
    (completedCount / displaySteps.length) * 100,
  );

  function handleDismiss() {
    localStorage.setItem(onboardingStorageKey(STORAGE_KEY, storageScope), "1");
    window.dispatchEvent(new Event("vitriny:onboarding-updated"));
    setLocalDismissed(true);
  }

  async function handleCopy() {
    if (!slug) return;
    const url = `${window.location.origin}/u/${slug}`;
    await navigator.clipboard.writeText(url);
    markPublicLinkUsed(storageScope);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleOpenPublicLink() {
    markPublicLinkUsed(storageScope);
  }

  if (dismissed || allDone) return null;

  return (
    <section className="mt-8 rounded-xl border border-paper-soft bg-white shadow-card">
      <div className="flex items-center justify-between border-b border-paper-soft px-6 py-4">
        <div>
          <h2 className="font-fraunces text-lg font-bold text-ink">
            Primeiros passos
          </h2>
          <p className="text-xs text-ink-muted">
            {completedCount} de {displaySteps.length} concluídos
          </p>
        </div>
        <button
          onClick={handleDismiss}
          className="rounded-md p-1.5 text-ink-muted transition hover:bg-paper hover:text-ink"
          title="Ocultar guia"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M12 4L4 12M4 4l8 8"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>

      <div className="px-6 pt-4">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-paper-soft">
          <div
            className="h-full rounded-full bg-leaf transition-all duration-700"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      <ul className="divide-y divide-paper-soft px-6 pb-2 pt-2">
        {displaySteps.map((step) => {
          const isNext = step.id === nextStep?.id;

          return (
            <li key={step.id} className="flex items-start gap-4 py-4">
              <div className="mt-0.5 shrink-0">
                {step.done ? (
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 20 20"
                    fill="none"
                    aria-label="Concluído"
                  >
                    <circle cx="10" cy="10" r="10" fill="#1B5E3B" />
                    <path
                      d="M6 10.5l3 3 5-5.5"
                      stroke="white"
                      strokeWidth="1.75"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                ) : isNext ? (
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 20 20"
                    fill="none"
                    aria-label="Próximo passo"
                  >
                    <circle
                      cx="10"
                      cy="10"
                      r="9.5"
                      stroke="#1B5E3B"
                      strokeWidth="1"
                    />
                    <circle cx="10" cy="10" r="4" fill="#1B5E3B" />
                  </svg>
                ) : (
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 20 20"
                    fill="none"
                    aria-label="Pendente"
                  >
                    <circle
                      cx="10"
                      cy="10"
                      r="9.5"
                      stroke="#EDE8DE"
                      strokeWidth="1"
                    />
                  </svg>
                )}
              </div>

              <div className="flex flex-1 flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-sm font-semibold ${
                        step.done ? "text-ink-muted line-through" : "text-ink"
                      }`}
                    >
                      {step.label}
                    </span>
                    {isNext && (
                      <span className="rounded-full bg-mint px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-leaf">
                        Próximo
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-ink-muted">
                    {step.description}
                  </p>
                </div>

                {!step.done && (
                  <div className="flex shrink-0 items-center gap-2">
                    {step.isCopyStep && slug ? (
                      <>
                        <button
                          onClick={handleCopy}
                          className={`inline-flex min-h-8 items-center justify-center rounded-md px-3 text-xs font-semibold transition ${
                            isNext
                              ? "bg-leaf text-white hover:bg-leaf-hover"
                              : "border border-paper-soft text-ink hover:border-leaf hover:text-leaf"
                          }`}
                        >
                          {copied ? "Copiado!" : "Copiar link"}
                        </button>
                        <a
                          href={`/u/${slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={handleOpenPublicLink}
                          className="inline-flex min-h-8 items-center justify-center rounded-md border border-paper-soft px-3 text-xs font-semibold text-ink transition hover:border-leaf hover:text-leaf"
                        >
                          Abrir
                        </a>
                      </>
                    ) : step.href ? (
                      <Link
                        href={step.href}
                        className={`inline-flex min-h-8 items-center justify-center rounded-md px-3 text-xs font-semibold transition ${
                          isNext
                            ? "bg-leaf text-white hover:bg-leaf-hover"
                            : "border border-paper-soft text-ink hover:border-leaf hover:text-leaf"
                        }`}
                      >
                        {step.actionLabel ?? "Acessar"}
                      </Link>
                    ) : null}
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
