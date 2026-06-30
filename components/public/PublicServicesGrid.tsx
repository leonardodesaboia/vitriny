"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";

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
  const reducedMotion = useReducedMotion();

  const container = reducedMotion
    ? undefined
    : {
        hidden: {},
        show: { transition: { staggerChildren: 0.09 } }
      };

  const item = reducedMotion
    ? undefined
    : {
        hidden: { opacity: 0, y: 20 },
        show: {
          opacity: 1,
          y: 0,
          transition: { type: "spring" as const, stiffness: 280, damping: 28 }
        }
      };

  if (services.length === 0) {
    return (
      <div className="mt-6 rounded-xl border border-paper-soft bg-white p-8 shadow-card">
        <p className="font-fraunces text-lg font-bold text-ink">
          Serviços personalizados
        </p>
        <p className="mt-2 text-sm leading-6 text-ink-muted">
          Este prestador aceita solicitações personalizadas. Descreva o que você
          precisa e ele entrará em contato com uma proposta.
        </p>
        <Link
          href={`/u/${slug}/orcamento`}
          className="mt-4 inline-flex min-h-9 items-center justify-center rounded-md bg-leaf px-4 text-xs font-semibold text-white transition hover:bg-leaf-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber focus-visible:ring-offset-2"
        >
          Solicitar orçamento →
        </Link>
      </div>
    );
  }

  return (
    <>
      <motion.div
        className="mt-6 grid gap-4 sm:grid-cols-2"
        initial={reducedMotion ? undefined : "hidden"}
        whileInView={reducedMotion ? undefined : "show"}
        viewport={{ once: true, amount: 0.1 }}
        variants={container}
      >
        {services.map((service) => (
          <motion.article
            key={service.id}
            variants={item}
            className="group flex flex-col overflow-hidden rounded-xl border border-paper-soft bg-white shadow-card transition-shadow hover:shadow-card-hover"
          >
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
                  Sob orçamento
                </p>
              )}
              {service.pricingType === "FIXED" &&
              service.fixedServiceCheckoutMode === "ALLOW_PIX_RESERVATION" ? (
                service.pixConfigured ? (
                  <Link
                    href={`/u/${slug}/orcamento?serviceId=${service.id}&modo=pagamento`}
                    className="mt-4 inline-flex min-h-9 w-fit flex-none items-center justify-center rounded-md bg-leaf px-4 text-xs font-semibold text-white transition-colors hover:bg-leaf-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber focus-visible:ring-offset-2"
                  >
                    Pagar com Pix →
                  </Link>
                ) : (
                  <span className="mt-4 inline-flex min-h-9 w-fit items-center justify-center rounded-md border border-paper-soft bg-paper px-4 text-xs font-semibold text-ink-muted">
                    Pagamento temporariamente indisponível
                  </span>
                )
              ) : (
                <Link
                  href={`/u/${slug}/orcamento?serviceId=${service.id}`}
                  className="mt-4 inline-flex min-h-9 w-fit flex-none items-center justify-center rounded-md border border-paper-soft bg-paper px-4 text-xs font-semibold text-ink transition-colors hover:border-leaf hover:text-leaf focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber focus-visible:ring-offset-2"
                >
                  {service.pricingType === "FIXED"
                    ? "Solicitar serviço →"
                    : "Pedir orçamento →"}
                </Link>
              )}
            </div>
          </motion.article>
        ))}
      </motion.div>

      <p className="mt-6 text-center text-sm text-ink-muted">
        Não encontrou o que procura?{" "}
        <Link
          href={`/u/${slug}/orcamento`}
          className="font-semibold text-leaf transition hover:underline focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber"
        >
          Envie sua solicitação →
        </Link>
      </p>
    </>
  );
}
