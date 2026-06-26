"use client";

import { useState } from "react";

import { DeleteServiceButton } from "@/components/services/DeleteServiceButton";
import { ServiceForm } from "@/components/services/ServiceForm";
import type { ServiceForClient } from "@/types/service";

type ServiceItemProps = {
  service: ServiceForClient;
  isPro?: boolean;
};

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

export function ServiceItem({ service, isPro = false }: ServiceItemProps) {
  const [expanded, setExpanded] = useState(false);
  const formattedPrice = formatPrice(service.basePrice);

  return (
    <article
      className={`rounded-xl border bg-white shadow-card transition-opacity ${
        service.isActive ? "border-paper-soft" : "border-paper-soft opacity-60"
      }`}
    >
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center gap-3 p-4 text-left transition hover:bg-paper/50"
      >
        {/* Thumbnail */}
        {service.imageUrl ? (
          <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-paper-soft">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              alt={service.name}
              className="h-full w-full object-cover"
              loading="lazy"
              src={service.imageUrl}
            />
          </div>
        ) : null}

        {/* Name + badges */}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-ink">{service.name}</p>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-semibold ${pricingTypeBadge[service.pricingType]}`}
            >
              {pricingTypeLabel[service.pricingType]}
            </span>
            {formattedPrice ? (
              <span className="text-xs text-ink-muted">{formattedPrice}</span>
            ) : null}
            {!service.isActive ? (
              <span className="text-xs text-ink-muted">· Oculto</span>
            ) : null}
          </div>
        </div>

        {/* Chevron */}
        <svg
          className={`h-4 w-4 shrink-0 text-ink-muted transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {expanded ? (
        <div className="border-t border-paper-soft p-4 sm:p-5">
          <ServiceForm
            embedded
            isPro={isPro}
            onCancel={() => setExpanded(false)}
            service={service}
          />

          <div className="mt-5 border-t border-paper-soft pt-5">
            <DeleteServiceButton serviceId={service.id} />
          </div>
        </div>
      ) : null}
    </article>
  );
}
