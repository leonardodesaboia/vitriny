"use client";

import { useState } from "react";

import { DeleteServiceButton } from "@/components/services/DeleteServiceButton";
import { ServiceForm } from "@/components/services/ServiceForm";
import type { ServiceForClient } from "@/types/service";

const pricingTypeBadge: Record<"FIXED" | "CUSTOM", string> = {
  FIXED: "bg-mint text-leaf border border-mint",
  CUSTOM: "bg-paper-soft text-ink-muted border border-paper-soft"
};

const pricingTypeLabel: Record<"FIXED" | "CUSTOM", string> = {
  FIXED: "Preço fixo",
  CUSTOM: "Sob orçamento"
};

function formatPrice(price: string | null): string | null {
  if (!price) return null;
  const num = parseFloat(price);
  if (isNaN(num) || num <= 0) return null;
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(num);
}

export function ServiceItem({ service }: { service: ServiceForClient }) {
  const [expanded, setExpanded] = useState(false);
  const formattedPrice = formatPrice(service.basePrice);

  return (
    <article className="rounded-xl border border-paper-soft bg-white shadow-card">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center gap-4 p-4 text-left transition hover:bg-paper/50"
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-ink">{service.name}</span>
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${pricingTypeBadge[service.pricingType]}`}
            >
              {pricingTypeLabel[service.pricingType]}
            </span>
            {formattedPrice ? (
              <span className="text-xs text-ink-muted">{formattedPrice}</span>
            ) : null}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              service.isActive
                ? "bg-mint text-leaf border border-mint"
                : "bg-paper-soft text-ink-muted border border-paper-soft"
            }`}
          >
            {service.isActive ? "Ativo" : "Inativo"}
          </span>
          <svg
            className={`h-4 w-4 shrink-0 text-ink-muted transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {expanded ? (
        <div className="border-t border-paper-soft p-5">
          <ServiceForm service={service} onCancel={() => setExpanded(false)} />

          <div className="mt-5 border-t border-paper-soft pt-5">
            <DeleteServiceButton serviceId={service.id} />
          </div>
        </div>
      ) : null}
    </article>
  );
}
