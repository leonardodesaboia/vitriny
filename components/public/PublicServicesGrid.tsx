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
        <p className="text-sm text-ink-muted">
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
          className="group flex flex-col rounded-xl border border-paper-soft bg-white p-6 shadow-card transition-shadow hover:shadow-card-hover"
        >
          <h3 className="font-jakarta text-base font-bold text-ink">
            {service.name}
          </h3>
          {service.description ? (
            <p className="mt-2 flex-1 text-sm leading-6 text-ink-muted">
              {service.description}
            </p>
          ) : (
            <div className="flex-1" />
          )}
          {service.pricingType === "FIXED" && service.basePrice ? (
            <p className="mt-3 font-fraunces text-lg font-bold text-ink">
              {formatMoney(service.basePrice)}
            </p>
          ) : (
            <p className="mt-3 text-xs font-semibold uppercase tracking-widest text-ink-muted">
              Sob orçamento
            </p>
          )}
          <Link
            href={`/u/${slug}/orcamento?serviceId=${service.id}`}
            className="mt-4 inline-flex min-h-9 w-fit items-center justify-center rounded-md border border-paper-soft bg-paper px-4 text-xs font-semibold text-ink transition-colors group-hover:border-leaf group-hover:text-leaf"
          >
            {service.pricingType === "FIXED" ? "Solicitar serviço →" : "Pedir orçamento →"}
          </Link>
        </motion.article>
      ))}
    </motion.div>
  );
}
