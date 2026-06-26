"use client";

import Link from "next/link";
import { motion } from "framer-motion";

import type { PublicService } from "@/types";

function formatMoney(value: string) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(Number(value));
}

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09 } }
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring" as const, stiffness: 280, damping: 28 }
  }
};

export function PublicServicesGrid({
  services,
  slug
}: {
  services: PublicService[];
  slug: string;
}) {
  if (services.length === 0) {
    return (
      <div className="mt-6 rounded-xl border border-paper-soft bg-white p-8 text-center shadow-card">
        <p className="text-sm leading-6 text-ink-muted">
          Este prestador ainda não possui serviços publicados.
        </p>
      </div>
    );
  }

  return (
    <motion.div
      className="mt-6 grid gap-4 sm:grid-cols-2"
      initial="hidden"
      whileInView="show"
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
            service.fixedServiceCheckoutMode === "ALLOW_PIX_RESERVATION" &&
            service.pixConfigured ? (
              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <Link
                  href={`/u/${slug}/orcamento?serviceId=${service.id}&modo=reserva`}
                  className="inline-flex min-h-9 flex-1 items-center justify-center rounded-md bg-leaf px-4 text-xs font-semibold text-white transition-colors hover:bg-leaf-hover"
                >
                  Reservar com Pix →
                </Link>
                <Link
                  href={`/u/${slug}/orcamento?serviceId=${service.id}`}
                  className="inline-flex min-h-9 flex-1 items-center justify-center rounded-md border border-paper-soft bg-paper px-4 text-xs font-semibold text-ink transition-colors hover:border-leaf hover:text-leaf"
                >
                  Apenas solicitar
                </Link>
              </div>
            ) : (
              <Link
                href={`/u/${slug}/orcamento?serviceId=${service.id}`}
                className="mt-4 inline-flex min-h-9 w-fit flex-none items-center justify-center rounded-md border border-paper-soft bg-paper px-4 text-xs font-semibold text-ink transition-colors hover:border-leaf hover:text-leaf"
              >
                {service.pricingType === "FIXED" ? "Solicitar serviço →" : "Pedir orçamento →"}
              </Link>
            )}
          </div>
        </motion.article>
      ))}
    </motion.div>
  );
}
