"use client";

import { useActionState } from "react";

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

  return (
    <form
      action={formAction}
      className="grid gap-4 rounded-lg border border-stone-200 bg-white p-5"
    >
      {service ? <input name="serviceId" type="hidden" value={service.id} /> : null}

      {state?.error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {state.error}
        </p>
      ) : null}

      <div className="grid gap-2">
        <label
          className="text-sm font-semibold text-ink"
          htmlFor={`name-${service?.id ?? "new"}`}
        >
          Nome do serviço
        </label>
        <input
          className="min-h-11 rounded-md border border-stone-300 bg-white px-3 text-sm outline-none focus:border-leaf"
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
          Descrição
        </label>
        <textarea
          className="min-h-24 rounded-md border border-stone-300 bg-white px-3 py-3 text-sm outline-none focus:border-leaf"
          defaultValue={service?.description ?? ""}
          id={`description-${service?.id ?? "new"}`}
          name="description"
        />
      </div>

      <div className="grid gap-5 md:grid-cols-[1fr_auto] md:items-end">
        <div className="grid gap-2">
          <label
            className="text-sm font-semibold text-ink"
            htmlFor={`basePrice-${service?.id ?? "new"}`}
          >
            Preço base
          </label>
          <CurrencyInput
            className="min-h-11 rounded-md border border-stone-300 bg-white px-3 text-sm outline-none focus:border-leaf"
            defaultValue={service?.basePrice ?? ""}
            id={`basePrice-${service?.id ?? "new"}`}
            name="basePrice"
          />
        </div>

        <label className="flex min-h-11 items-center gap-3 text-sm font-semibold text-ink">
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
        className="inline-flex min-h-11 w-full items-center justify-center rounded-md bg-leaf px-5 text-sm font-semibold text-white transition hover:bg-[#1d6443] disabled:opacity-50 md:w-fit"
        disabled={isPending}
        type="submit"
      >
        {isPending ? "Salvando..." : service ? "Salvar serviço" : "Cadastrar serviço"}
      </button>
    </form>
  );
}
