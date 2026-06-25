"use client";

import { useActionState, useState } from "react";

import { createService, updateService } from "@/lib/actions/services";
import { CurrencyInput } from "@/components/ui/CurrencyInput";
import type { ActionResult } from "@/types";
import type { ServiceForClient } from "@/types/service";

type ServiceFormProps = {
  service?: ServiceForClient;
};

export function ServiceForm({ service }: ServiceFormProps) {
  const action = service ? updateService : createService;
  const [state, formAction, isPending] = useActionState<ActionResult, FormData>(
    action,
    undefined
  );
  const [pricingType, setPricingType] = useState<"FIXED" | "CUSTOM">(
    service?.pricingType ?? "CUSTOM"
  );

  return (
    <form
      action={formAction}
      className="grid gap-4 rounded-lg border border-stone-200 bg-white p-5"
    >
      {service ? <input name="serviceId" type="hidden" value={service.id} /> : null}
      <input name="pricingType" type="hidden" value={pricingType} />

      {state?.error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {state.error}
        </p>
      ) : null}

      {/* Tipo de precificação */}
      <div>
        <p className="text-sm font-semibold text-ink">Tipo de precificação</p>
        <div className="mt-2 flex rounded-xl border border-paper-soft bg-paper p-1">
          <button
            type="button"
            onClick={() => setPricingType("CUSTOM")}
            className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold transition ${
              pricingType === "CUSTOM"
                ? "bg-white shadow-sm text-ink"
                : "text-ink-muted hover:text-ink"
            }`}
          >
            Sob orçamento
          </button>
          <button
            type="button"
            onClick={() => setPricingType("FIXED")}
            className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold transition ${
              pricingType === "FIXED"
                ? "bg-white shadow-sm text-ink"
                : "text-ink-muted hover:text-ink"
            }`}
          >
            Preço fixo
          </button>
        </div>
        <p className="mt-1.5 text-xs text-ink-muted">
          {pricingType === "FIXED"
            ? "O preço é exibido publicamente e o cliente solicita diretamente."
            : "O cliente envia um pedido e você cria uma proposta com o valor."}
        </p>
      </div>

      <div className="grid gap-2">
        <label
          className="text-sm font-semibold text-ink"
          htmlFor={`name-${service?.id ?? "new"}`}
        >
          Nome do serviço
        </label>
        <input
          className="min-h-11 rounded-md border border-paper-soft bg-white px-3 text-sm outline-none focus:border-leaf"
          defaultValue={service?.name ?? ""}
          id={`name-${service?.id ?? "new"}`}
          name="name"
          required
          type="text"
        />
      </div>

      <div className="grid gap-2">
        <label
          className="text-sm font-semibold text-ink"
          htmlFor={`description-${service?.id ?? "new"}`}
        >
          Descrição <span className="font-normal text-ink-muted">(opcional)</span>
        </label>
        <textarea
          className="min-h-24 rounded-md border border-paper-soft bg-white px-3 py-3 text-sm outline-none focus:border-leaf"
          defaultValue={service?.description ?? ""}
          id={`description-${service?.id ?? "new"}`}
          name="description"
        />
      </div>

      <div className="grid gap-5 md:grid-cols-[1fr_auto]">
        <div className="grid gap-2">
          <label
            className="text-sm font-semibold text-ink"
            htmlFor={`basePrice-${service?.id ?? "new"}`}
          >
            Preço
            {pricingType === "FIXED" ? (
              <span className="ml-1 text-red-500">*</span>
            ) : (
              <span className="ml-1 font-normal text-ink-muted">(opcional)</span>
            )}
          </label>
          <CurrencyInput
            className="min-h-11 rounded-md border border-paper-soft bg-white px-3 text-sm outline-none focus:border-leaf"
            defaultValue={service?.basePrice ?? ""}
            id={`basePrice-${service?.id ?? "new"}`}
            name="basePrice"
          />
          {pricingType === "FIXED" ? (
            <p className="text-xs text-ink-muted">
              Valor exibido publicamente na página do prestador.
            </p>
          ) : null}
        </div>

        <label className="flex min-h-11 items-center gap-3 text-sm font-semibold text-ink md:mt-7">
          <input
            className="h-4 w-4 accent-leaf"
            defaultChecked={service?.isActive ?? true}
            name="isActive"
            type="checkbox"
          />
          Ativo
        </label>
      </div>

      <button
        className="inline-flex min-h-11 w-full items-center justify-center rounded-md bg-leaf px-5 text-sm font-semibold text-white transition hover:bg-leaf-hover disabled:opacity-50 md:w-fit"
        disabled={isPending}
        type="submit"
      >
        {isPending ? "Salvando..." : service ? "Salvar serviço" : "Cadastrar serviço"}
      </button>
    </form>
  );
}
