"use client";

import { useState } from "react";

import {
  getServiceSaleMode,
  SALE_MODE_BADGE_LABEL,
} from "@/lib/service-sale-mode";
import { isPixPaymentExpired } from "@/lib/utils/date";
import {
  formatDateShort,
  getInitials,
  splitServiceFromDescription,
  statusBadge,
  statusLabels
} from "@/components/quote-request/format";
import { QuoteRequestDetails } from "@/components/quote-request/QuoteRequestDetails";
import type { SerializedQuoteRequest } from "@/components/quote-request/serialize";

export type { SerializedQuoteRequest } from "@/components/quote-request/serialize";

type Props = {
  quoteRequest: SerializedQuoteRequest;
  serviceNamesById: Record<string, string>;
  pixInfo?: { pixKey: string; pixHolderName: string } | null;
};

export function QuoteRequestCard({ quoteRequest, serviceNamesById, pixInfo = null }: Props) {
  const [expanded, setExpanded] = useState(false);

  const legacyService = splitServiceFromDescription(
    quoteRequest.description ?? "",
    serviceNamesById
  );
  // Item excluído/renomeado: o snapshot preserva o nome da época do pedido.
  const serviceLabel =
    quoteRequest.service?.name ??
    quoteRequest.serviceNameSnapshot ??
    legacyService.serviceLabel;

  return (
    <article className="overflow-hidden rounded-xl border border-paper-soft bg-white shadow-card">
      {/* Collapsed header — always visible, clickable */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="grid h-32 w-full grid-cols-[36px_minmax(0,1fr)_20px] items-start gap-3 p-4 text-left transition hover:bg-paper/50 sm:grid-cols-[40px_minmax(0,1fr)_auto] sm:gap-4 sm:p-5"
        title={`Abrir pedido de ${quoteRequest.customerName}`}
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-mint text-sm font-bold text-leaf sm:h-10 sm:w-10">
          {getInitials(quoteRequest.customerName)}
        </div>

        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-1.5 overflow-hidden">
            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${statusBadge[quoteRequest.status] ?? "bg-paper-soft text-ink-muted"}`}
            >
              {statusLabels[quoteRequest.status]}
            </span>
            <span className="shrink-0 text-xs text-ink-muted">
              {formatDateShort(quoteRequest.createdAt)}
            </span>
            {quoteRequest.service ? (
              <span className="hidden shrink-0 rounded-full border border-blue-100 bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700 sm:inline-flex">
                {quoteRequest.service.itemType === "PRODUCT" ? "Produto" : "Serviço"}
              </span>
            ) : null}
            {quoteRequest.service ? (
              (() => {
                const sm = getServiceSaleMode({
                  pricingType: quoteRequest.service.pricingType,
                  fixedServiceCheckoutMode:
                    quoteRequest.service.fixedServiceCheckoutMode,
                });
                return sm !== "CUSTOM" ? (
                  <span className="hidden shrink-0 rounded-full border border-mint bg-mint px-2 py-0.5 text-xs font-semibold text-leaf sm:inline-flex">
                    {SALE_MODE_BADGE_LABEL[sm]}
                  </span>
                ) : null;
              })()
            ) : null}
            {quoteRequest.pixReservationRequestedAt ? (
              <span
                className={`inline-flex shrink-0 rounded-full border px-2 py-0.5 text-xs font-semibold ${
                  quoteRequest.pixReservationPaidAt
                    ? "border-mint bg-mint text-leaf"
                    : quoteRequest.pixReservationClientPaidAt
                      ? "border-amber-300 bg-amber-100 text-amber-800"
                      : isPixPaymentExpired(quoteRequest.pixReservationRequestedAt)
                        ? "border-red-200 bg-red-50 text-red-700"
                        : "border-amber-200 bg-amber-50 text-amber-700"
                }`}
              >
                {quoteRequest.pixReservationPaidAt
                  ? "Pagamento Pix confirmado"
                  : quoteRequest.pixReservationClientPaidAt
                    ? "Cliente informou pagamento"
                    : isPixPaymentExpired(quoteRequest.pixReservationRequestedAt)
                      ? "Pix expirado"
                      : "Pagamento Pix pendente"}
              </span>
            ) : null}
          </div>
          <p
            className="truncate font-fraunces text-base font-bold leading-snug text-ink"
            title={quoteRequest.customerName}
          >
            {quoteRequest.customerName}
          </p>
          <p className="mt-1 line-clamp-1 text-xs text-ink-muted">
            {serviceLabel ?? "Item não informado"}
          </p>
        </div>

        <div className="flex h-full shrink-0 items-center justify-end gap-2 sm:gap-3">
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

      {/* Expanded content */}
      {expanded ? (
        <QuoteRequestDetails
          detailHref={`/dashboard/pedidos/${quoteRequest.id}`}
          pixInfo={pixInfo}
          quoteRequest={quoteRequest}
          serviceNamesById={serviceNamesById}
        />
      ) : null}
    </article>
  );
}
