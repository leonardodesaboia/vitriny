"use client";

import Link from "next/link";
import { motion } from "framer-motion";

import type { PublicService } from "@/types";
import type { PublicThemePreset } from "@/lib/theme-presets";

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
  slug,
  theme
}: {
  services: PublicService[];
  slug: string;
  theme: PublicThemePreset;
}) {
  if (services.length === 0) {
    return (
      <div className={`${theme.contactCard} mt-6 p-8 text-center`}>
        <p className={theme.serviceDescription}>
          Este prestador ainda não possui serviços publicados.
        </p>
      </div>
    );
  }

  return (
    <motion.div
      className={theme.serviceGrid}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.1 }}
      variants={container}
    >
      {services.map((service) => (
        <motion.article
          key={service.id}
          variants={item}
          className={theme.serviceCard}
        >
          {service.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              alt={service.name}
              className={theme.serviceImage}
              loading="lazy"
              src={service.imageUrl}
            />
          ) : null}

          <div className="flex flex-1 flex-col p-6">
            <h3 className={theme.serviceTitle}>
              {service.name}
            </h3>
            {service.description ? (
              <p className={theme.serviceDescription}>
                {service.description}
              </p>
            ) : (
              <div className="flex-1" />
            )}
            {service.basePrice ? (
              service.pricingType === "FIXED" ? (
                <p className={theme.servicePrice}>
                  {formatMoney(service.basePrice)}
                </p>
              ) : (
                <p className={theme.servicePrice}>
                  A partir de {formatMoney(service.basePrice)}
                </p>
              )
            ) : (
              <p className={theme.badge}>
                Sob orçamento
              </p>
            )}
            {service.pricingType === "FIXED" &&
            service.fixedServiceCheckoutMode === "ALLOW_PIX_RESERVATION" &&
            service.pixConfigured ? (
              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <Link
                  href={`/u/${slug}/orcamento?serviceId=${service.id}&modo=reserva`}
                  className={theme.primaryButton}
                >
                  Reservar com Pix →
                </Link>
                <Link
                  href={`/u/${slug}/orcamento?serviceId=${service.id}`}
                  className={theme.secondaryButton}
                >
                  Apenas solicitar
                </Link>
              </div>
            ) : (
              <Link
                href={`/u/${slug}/orcamento?serviceId=${service.id}`}
                className={`${theme.secondaryButton} mt-4 w-fit flex-none`}
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
