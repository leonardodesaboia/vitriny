"use client";

import { useState } from "react";

import { ServiceForm } from "@/components/services/ServiceForm";
import type { CatalogItemType } from "@/types/service";

type NewServiceSectionProps = {
  allowItemTypeSelection: boolean;
  defaultItemType: CatalogItemType;
  isPro: boolean;
  label: string;
  // Sem nenhum item cadastrado, o formulário já abre para guiar o onboarding.
  defaultOpen?: boolean;
};

export function NewServiceSection({
  allowItemTypeSelection,
  defaultItemType,
  isPro,
  label,
  defaultOpen = false
}: NewServiceSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className="min-w-0">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-leaf">
          {open ? label : "Itens cadastrados"}
        </p>

        {open ? (
          <button
            className="inline-flex min-h-10 items-center justify-center rounded-lg border border-paper-soft bg-white px-4 text-sm font-semibold text-ink-muted transition hover:border-red-300 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber"
            onClick={() => setOpen(false)}
            type="button"
          >
            Cancelar
          </button>
        ) : (
          <button
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-leaf px-4 text-sm font-semibold text-white shadow-card transition hover:bg-leaf-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber focus-visible:ring-offset-2"
            onClick={() => setOpen(true)}
            type="button"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M12 4v16m8-8H4"
              />
            </svg>
            {label}
          </button>
        )}
      </div>

      {open ? (
        <div className="mt-4 min-w-0">
          <ServiceForm
            allowItemTypeSelection={allowItemTypeSelection}
            defaultItemType={defaultItemType}
            isPro={isPro}
          />
        </div>
      ) : null}
    </section>
  );
}
