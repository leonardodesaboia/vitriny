"use client";

import { useState } from "react";

import { DeleteServiceButton } from "@/components/services/DeleteServiceButton";
import { ServiceForm } from "@/components/services/ServiceForm";
import { CopyButton } from "@/components/ui/CopyButton";
import {
  CATALOG_ITEM_TYPE_BADGE,
  CATALOG_ITEM_TYPE_LABEL,
} from "@/lib/catalog-item-type";
import { itemShareMessage } from "@/lib/whatsapp-messages";
import {
  getServiceSaleMode,
  SALE_MODE_BADGE_LABEL,
  type ServiceSaleMode,
} from "@/lib/service-sale-mode";
import type { ServiceForClient } from "@/types/service";

type ServiceItemProps = {
  service: ServiceForClient;
  isPro?: boolean;
  allowItemTypeSelection?: boolean;
  slug?: string | null;
};

const saleModeBadge: Record<ServiceSaleMode, string> = {
  CUSTOM: "bg-paper-soft text-ink-muted border border-paper-soft",
  FIXED_REQUEST: "bg-mint text-leaf border border-mint",
  FIXED_PIX: "bg-mint text-leaf border border-mint",
};

function formatPrice(price: string | null): string | null {
  if (!price) return null;
  const num = parseFloat(price);
  if (isNaN(num) || num <= 0) return null;
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(num);
}

export function ServiceItem({
  service,
  isPro = false,
  allowItemTypeSelection = false,
  slug = null
}: ServiceItemProps) {
  const [expanded, setExpanded] = useState(false);
  const formattedPrice = formatPrice(service.basePrice);
  // Link de venda por item: a página de orçamento pré-seleciona via serviceId.
  const shareUrl = slug
    ? `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/u/${slug}/orcamento?serviceId=${service.id}`
    : null;
  const saleMode = getServiceSaleMode({
    pricingType: service.pricingType,
    fixedServiceCheckoutMode: service.fixedServiceCheckoutMode,
  });

  return (
    <article
      className={`min-w-0 overflow-hidden rounded-xl border bg-white shadow-card transition-colors ${
        expanded ? "border-leaf/40" : "border-paper-soft hover:border-leaf/30"
      }`}
    >
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="grid w-full min-w-0 grid-cols-[auto_minmax(0,1fr)_auto_16px] items-center gap-3 p-4 text-left transition hover:bg-paper/50 sm:gap-4"
      >
        {/* Miniatura sempre presente para manter o alinhamento da lista */}
        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-paper-soft bg-paper ${
            service.isActive ? "" : "opacity-50"
          }`}
        >
          {service.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              alt={service.name}
              className="h-full w-full object-cover"
              loading="lazy"
              src={service.imageUrl}
            />
          ) : (
            <svg
              className="h-5 w-5 text-ink-muted/50"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.8}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          )}
        </div>

        <div className="min-w-0">
          <p
            className={`truncate text-sm font-semibold ${
              service.isActive ? "text-ink" : "text-ink-muted"
            }`}
            title={service.name}
          >
            {service.name}
          </p>
          <div className="mt-1.5 flex min-w-0 flex-wrap items-center gap-1.5">
            <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${CATALOG_ITEM_TYPE_BADGE[service.itemType]}`}>
              {CATALOG_ITEM_TYPE_LABEL[service.itemType]}
            </span>
            <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${saleModeBadge[saleMode]}`}>
              {SALE_MODE_BADGE_LABEL[saleMode]}
            </span>
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-1">
          {formattedPrice ? (
            <span
              className={`whitespace-nowrap font-fraunces text-base font-bold ${
                service.isActive ? "text-ink" : "text-ink-muted"
              }`}
            >
              {formattedPrice}
            </span>
          ) : null}
          {!service.isActive ? (
            <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[11px] font-semibold text-stone-500">
              Oculto
            </span>
          ) : null}
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
          {shareUrl && service.isActive ? (
            <div className="mb-5 rounded-lg border border-paper-soft bg-paper px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-ink-muted">
                Divulgar
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <a
                  className="inline-flex min-h-8 items-center justify-center rounded-md bg-leaf px-3 text-xs font-semibold text-white transition hover:bg-leaf-hover"
                  href={`https://wa.me/?text=${encodeURIComponent(itemShareMessage(service.name, formattedPrice, shareUrl))}`}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  Compartilhar no WhatsApp
                </a>
                <CopyButton label="Copiar link" text={shareUrl} />
              </div>
            </div>
          ) : null}

          <ServiceForm
            allowItemTypeSelection={allowItemTypeSelection}
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
