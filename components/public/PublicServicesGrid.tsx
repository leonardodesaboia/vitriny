"use client";

import Link from "next/link";

import {
  CATALOG_ITEM_TYPE_BADGE,
  CATALOG_ITEM_TYPE_LABEL,
} from "@/lib/catalog-item-type";
import type { PublicService } from "@/types";

function formatMoney(value: string) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(Number(value));
}

export function PublicServicesGrid({
  services,
  slug
}: {
  services: PublicService[];
  slug: string;
}) {
  if (services.length === 0) {
    return (
      <div className="mt-6 rounded-xl border border-paper-soft bg-white p-8 shadow-card">
        <p className="font-fraunces text-lg font-bold text-ink">
          Catálogo em preparação
        </p>
        <p className="mt-2 text-sm leading-6 text-ink-muted">
          Este negócio ainda não publicou itens. Volte em breve ou entre em
          contato pelos canais acima.
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Sem animação de entrada: a vitrine é o conteúdo público que vende
          (e o LCP) — não pode nascer invisível esperando hidratação. Era
          também a fonte de hydration mismatch via useReducedMotion. */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {services.map((service) => {
          const isPix =
            service.pricingType === "FIXED" &&
            service.fixedServiceCheckoutMode === "REQUIRE_PIX_PAYMENT";
          const pixUnavailable = isPix && !service.pixConfigured;
          const href = `/u/${slug}/orcamento?serviceId=${service.id}`;

          // Nome + preço + ação no rótulo, para o leitor de tela distinguir os
          // itens (o preço e o CTA visíveis são aria-hidden). Ver docs P CJ-B.
          const priceLabel = service.basePrice
            ? service.pricingType === "FIXED"
              ? formatMoney(service.basePrice)
              : `a partir de ${formatMoney(service.basePrice)}`
            : "sob consulta";
          const actionLabel = pixUnavailable
            ? "pagamento indisponível"
            : isPix
              ? "pagar com Pix"
              : service.pricingType === "FIXED"
                ? "solicitar"
                : "solicitar orçamento";
          const cardAriaLabel = `${service.name}, ${priceLabel}, ${actionLabel}`;

          return (
            <article
              key={service.id}
              className="group relative flex flex-col overflow-hidden rounded-xl border border-paper-soft bg-white shadow-card transition-[border-color,box-shadow] hover:border-leaf/30 hover:shadow-card-hover"
            >
              {!pixUnavailable && (
                <Link
                  href={href}
                  aria-label={cardAriaLabel}
                  className="absolute inset-0 z-10 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber focus-visible:ring-inset"
                />
              )}

              {service.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  alt={service.name}
                  className="h-44 w-full object-cover"
                  loading="lazy"
                  src={service.imageUrl}
                />
              ) : null}

              <div className="flex flex-1 flex-col p-6">
                <span className={`mb-2 w-fit rounded-full px-2 py-0.5 text-xs font-semibold ${CATALOG_ITEM_TYPE_BADGE[service.itemType]}`}>
                  {CATALOG_ITEM_TYPE_LABEL[service.itemType]}
                </span>
                <h3 className="line-clamp-2 break-words font-jakarta text-base font-bold text-ink">
                  {service.name}
                </h3>
                {service.description ? (
                  <p className="mt-2 line-clamp-3 flex-1 break-words text-sm leading-6 text-ink-muted">
                    {service.description}
                  </p>
                ) : (
                  <div className="flex-1" />
                )}
                {service.basePrice ? (
                  service.pricingType === "FIXED" ? (
                    <p className="mt-3 font-fraunces text-lg font-bold text-ink">
                      {formatMoney(service.basePrice)}
                    </p>
                  ) : (
                    <p className="mt-3 font-fraunces text-lg font-bold text-ink">
                      A partir de {formatMoney(service.basePrice)}
                    </p>
                  )
                ) : (
                  <p className="mt-3 text-xs font-semibold uppercase tracking-widest text-ink-muted">
                    Sob consulta
                  </p>
                )}
                {pixUnavailable ? (
                  <span className="mt-4 inline-flex min-h-9 w-fit items-center justify-center rounded-md border border-paper-soft bg-paper px-4 text-xs font-semibold text-ink-muted">
                    Pagamento temporariamente indisponível
                  </span>
                ) : isPix ? (
                  <span
                    aria-hidden
                    className="mt-4 inline-flex min-h-9 w-fit flex-none items-center justify-center rounded-md bg-leaf px-4 text-xs font-semibold text-white transition-colors group-hover:bg-leaf-hover"
                  >
                    Pagar com Pix →
                  </span>
                ) : (
                  <span
                    aria-hidden
                    className="mt-4 inline-flex min-h-9 w-fit flex-none items-center justify-center rounded-md border border-paper-soft bg-paper px-4 text-xs font-semibold text-ink transition-colors group-hover:border-leaf group-hover:text-leaf"
                  >
                    {service.pricingType === "FIXED"
                      ? "Solicitar →"
                      : "Solicitar orçamento →"}
                  </span>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </>
  );
}
