"use client";

import { useState } from "react";

import { DeleteServiceButton } from "@/components/services/DeleteServiceButton";
import { ServiceForm } from "@/components/services/ServiceForm";
import {
  getServiceSaleMode,
  SALE_MODE_BADGE_LABEL,
  type ServiceSaleMode,
} from "@/lib/service-sale-mode";
import type { ServiceForClient } from "@/types/service";

type ServiceItemProps = {
  service: ServiceForClient;
  isPro?: boolean;
};

const saleModeBadge: Record<ServiceSaleMode, string> = {
  CUSTOM: "bg-paper-soft text-ink-muted border border-paper-soft",
  FIXED_REQUEST: "bg-mint text-leaf border border-mint",
  FIXED_PIX: "bg-mint text-leaf border border-mint",
};

const itemTypeLabel: Record<"SERVICE" | "PRODUCT", string> = {
  SERVICE: "Serviço",
  PRODUCT: "Produto",
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
  const saleMode = getServiceSaleMode({
    pricingType: service.pricingType,
    fixedServiceCheckoutMode: service.fixedServiceCheckoutMode,
  });

  return (
    <article
      className={`min-w-0 overflow-hidden rounded-xl border bg-white shadow-card transition-opacity ${
        service.isActive ? "border-paper-soft" : "border-paper-soft opacity-60"
      }`}
    >
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="grid w-full min-w-0 grid-cols-[minmax(0,1fr)_16px] items-center gap-3 p-4 text-left transition hover:bg-paper/50"
      >
        <div className="flex min-w-0 items-center gap-3">
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

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-ink" title={service.name}>
              {service.name}
            </p>
            <div className="mt-1 flex min-w-0 flex-wrap items-center gap-1.5">
              <span className="shrink-0 rounded-full border border-blue-100 bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700">
                {itemTypeLabel[service.itemType]}
              </span>
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${saleModeBadge[saleMode]}`}>
                {SALE_MODE_BADGE_LABEL[saleMode]}
              </span>
              {formattedPrice ? (
                <span className="min-w-0 break-words text-xs text-ink-muted">{formattedPrice}</span>
              ) : null}
              {!service.isActive ? (
                <span className="shrink-0 text-xs text-ink-muted">· Oculto</span>
              ) : null}
            </div>
          </div>
        </div>

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
        <div className="min-w-0 border-t border-paper-soft p-4 sm:p-5">
          <ServiceForm
            embedded
            isPro={isPro}
            onCancel={() => setExpanded(false)}
            service={service}
          />

          <div className="mt-5 border-t border-paper-soft pt-5">
            <DeleteServiceButton serviceId={service.id} serviceName={service.name} />
          </div>
        </div>
      ) : null}
    </article>
  );
}
