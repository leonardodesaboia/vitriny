"use client";

import Link from "next/link";

import type { PublicService } from "@/types";

function formatMoney(value: string) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(Number(value));
}

function ServiceCard({
  service,
  slug
}: {
  service: PublicService;
  slug: string;
}) {
  const href = `/u/${slug}/orcamento?serviceId=${service.id}`;

  // Nome + preço + ação no rótulo, para o leitor de tela distinguir os
  // itens (o preço e o CTA visíveis são aria-hidden). Ver docs P CJ-B.
  const priceLabel = service.basePrice
    ? service.pricingType === "FIXED"
      ? formatMoney(service.basePrice)
      : `a partir de ${formatMoney(service.basePrice)}`
    : "sob consulta";
  const actionLabel =
    service.pricingType === "FIXED" ? "solicitar" : "solicitar orçamento";
  const cardAriaLabel = `${service.name}, ${priceLabel}, ${actionLabel}`;

  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-xl border border-paper-soft bg-white shadow-card transition-[border-color,box-shadow] hover:border-leaf/30 hover:shadow-card-hover">
      <Link
        href={href}
        aria-label={cardAriaLabel}
        className="absolute inset-0 z-10 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber focus-visible:ring-inset"
      />

      {service.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          alt={service.name}
          className="h-32 w-full object-cover sm:h-44"
          loading="lazy"
          src={service.imageUrl}
        />
      ) : null}

      <div className="flex flex-1 flex-col p-4 sm:p-6">
        <h3 className="line-clamp-2 break-words font-jakarta text-sm font-bold text-ink sm:text-base">
          {service.name}
        </h3>
        {service.description ? (
          <p className="mt-2 line-clamp-2 flex-1 break-words text-xs leading-5 text-ink-muted sm:line-clamp-3 sm:text-sm sm:leading-6">
            {service.description}
          </p>
        ) : (
          <div className="flex-1" />
        )}
        {service.basePrice ? (
          service.pricingType === "FIXED" ? (
            <p className="mt-3 font-fraunces text-base font-bold text-ink sm:text-lg">
              {formatMoney(service.basePrice)}
            </p>
          ) : (
            <p className="mt-3 font-fraunces text-base font-bold text-ink sm:text-lg">
              A partir de {formatMoney(service.basePrice)}
            </p>
          )
        ) : (
          <p className="mt-3 text-xs font-semibold uppercase tracking-widest text-ink-muted">
            Sob consulta
          </p>
        )}
        <span
          aria-hidden
          className="mt-4 hidden min-h-9 w-fit flex-none items-center justify-center rounded-md border border-paper-soft bg-paper px-4 text-xs font-semibold text-ink transition-colors group-hover:border-leaf group-hover:text-leaf sm:inline-flex"
        >
          {service.pricingType === "FIXED"
            ? "Solicitar →"
            : "Solicitar orçamento →"}
        </span>
      </div>
    </article>
  );
}

// Sem animação de entrada: a vitrine é o conteúdo público que vende (e o LCP)
// — não pode nascer invisível esperando hidratação.
function ServiceCardGrid({
  services,
  slug
}: {
  services: PublicService[];
  slug: string;
}) {
  return (
    <div className="grid auto-rows-fr grid-cols-2 gap-3 sm:gap-4">
      {services.map((service) => (
        <ServiceCard key={service.id} service={service} slug={slug} />
      ))}
    </div>
  );
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

  // itemType organiza a vitrine em vez de virar um badge por card: só agrupa
  // quando os DOIS tipos estão presentes (negócio que vende ambos). Negócio de
  // um tipo só cai no grid plano — todo item é igual, o rótulo seria ruído.
  const products = services.filter((s) => s.itemType === "PRODUCT");
  const serviceItems = services.filter((s) => s.itemType === "SERVICE");
  const shouldGroup = products.length > 0 && serviceItems.length > 0;

  if (shouldGroup) {
    return (
      <div className="mt-6 grid gap-8">
        <section>
          <p className="text-xs font-semibold uppercase tracking-widest text-ink-muted">
            Produtos
          </p>
          <div className="mt-3">
            <ServiceCardGrid services={products} slug={slug} />
          </div>
        </section>
        <section>
          <p className="text-xs font-semibold uppercase tracking-widest text-ink-muted">
            Serviços
          </p>
          <div className="mt-3">
            <ServiceCardGrid services={serviceItems} slug={slug} />
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="mt-6">
      <ServiceCardGrid services={services} slug={slug} />
    </div>
  );
}
