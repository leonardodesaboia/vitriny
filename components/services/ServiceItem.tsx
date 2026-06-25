"use client";

import { useState } from "react";

import { toggleServiceStatus } from "@/lib/actions/services";
import { DeleteServiceButton } from "@/components/services/DeleteServiceButton";
import { ServiceForm } from "@/components/services/ServiceForm";
import type { ServiceForClient } from "@/types/service";

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

export function ServiceItem({ service }: { service: ServiceForClient }) {
  const [isEditing, setIsEditing] = useState(false);
  const formattedPrice = formatPrice(service.basePrice);

  return (
    <article className="rounded-lg border border-stone-200 bg-white">
      <div className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-bold text-ink">{service.name}</h3>
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-semibold ${pricingTypeBadge[service.pricingType]}`}
          >
            {pricingTypeLabel[service.pricingType]}
          </span>
          {formattedPrice ? (
            <span className="text-xs font-semibold text-ink">{formattedPrice}</span>
          ) : null}
          <span className={`text-xs ${service.isActive ? "text-leaf" : "text-ink-muted"}`}>
            · {service.isActive ? "Ativo" : "Inativo"}
          </span>
        </div>

        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={() => setIsEditing((v) => !v)}
            className={`inline-flex min-h-9 items-center justify-center rounded-md border px-3 text-sm font-semibold transition ${
              isEditing
                ? "border-leaf bg-leaf text-white hover:bg-leaf-hover"
                : "border-stone-300 bg-white text-ink hover:border-leaf hover:text-leaf"
            }`}
          >
            {isEditing ? "Fechar" : "Editar"}
          </button>

          <form action={toggleServiceStatus}>
            <input name="serviceId" type="hidden" value={service.id} />
            <input name="nextStatus" type="hidden" value={String(!service.isActive)} />
            <button
              className="inline-flex min-h-9 items-center justify-center rounded-md border border-stone-300 bg-white px-3 text-sm font-semibold text-ink transition hover:border-leaf hover:text-leaf"
              type="submit"
            >
              {service.isActive ? "Desativar" : "Ativar"}
            </button>
          </form>

          <DeleteServiceButton serviceId={service.id} />
        </div>
      </div>

      {isEditing ? (
        <div className="border-t border-stone-200 p-4">
          <ServiceForm service={service} onCancel={() => setIsEditing(false)} />
        </div>
      ) : null}
    </article>
  );
}
