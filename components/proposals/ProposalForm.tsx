"use client";

import { useActionState, useState } from "react";

import { ProposalItemsFields } from "@/components/proposals/ProposalItemsFields";
import { CurrencyInput } from "@/components/ui/CurrencyInput";
import { createProposal, type ProposalFormState } from "@/lib/actions/proposals";

type PricingMode = "SIMPLE" | "ITEMIZED";

type ProposalFormProps = {
  requestId: string;
  initialValues?: {
    title?: string | null;
    description?: string | null;
    items?: Array<{
      description: string;
      quantity: number;
      unitPrice: { toString: () => string };
    }>;
  };
};

export function ProposalForm({ requestId, initialValues }: ProposalFormProps) {
  const hasInitialItems = (initialValues?.items?.length ?? 0) > 0;
  const [mode, setMode] = useState<PricingMode>(hasInitialItems ? "ITEMIZED" : "SIMPLE");
  const [state, formAction, isPending] = useActionState<ProposalFormState, FormData>(
    createProposal,
    undefined
  );
  const today = new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD no timezone do navegador

  const initialItems = initialValues?.items?.map((item) => ({
    description: item.description,
    quantity: item.quantity,
    unitPrice: item.unitPrice.toString()
  }));

  return (
    <form action={formAction} className="mt-8 grid gap-6">
      {state?.error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {state.error}
        </p>
      ) : null}
      <input name="requestId" type="hidden" value={requestId} />
      <input name="pricingMode" type="hidden" value={mode} />

      {/* Mode toggle */}
      <div className="flex rounded-xl border border-paper-soft bg-paper p-1">
        <button
          type="button"
          onClick={() => setMode("SIMPLE")}
          className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold transition ${
            mode === "SIMPLE"
              ? "bg-white shadow-sm text-ink"
              : "text-ink-muted hover:text-ink"
          }`}
        >
          Proposta simples
        </button>
        <button
          type="button"
          onClick={() => setMode("ITEMIZED")}
          className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold transition ${
            mode === "ITEMIZED"
              ? "bg-white shadow-sm text-ink"
              : "text-ink-muted hover:text-ink"
          }`}
        >
          Proposta detalhada
        </button>
      </div>

      {mode === "SIMPLE" ? (
        <div className="grid gap-5">
          <div className="grid gap-1.5">
            <label className="text-sm font-semibold text-ink" htmlFor="description-simple">
              Descrição do pedido{" "}
              <span className="font-normal text-ink-muted">(opcional)</span>
            </label>
            <textarea
              className="min-h-28 rounded-md border border-paper-soft bg-white px-3 py-3 text-sm outline-none focus:border-leaf"
              defaultValue={initialValues?.description ?? ""}
              id="description-simple"
              name="description"
              placeholder="Ex: Pintura de 3 cômodos com tinta fosca. Inclui mão de obra e material. Não inclui remoção de mobília."
            />
          </div>

          <div className="grid gap-1.5">
            <label className="text-sm font-semibold text-ink" htmlFor="totalAmount">
              Valor total <span className="text-red-500">*</span>
            </label>
            <CurrencyInput
              className="min-h-11 max-w-48 rounded-md border border-paper-soft bg-white px-3 text-sm outline-none focus:border-leaf"
              id="totalAmount"
              name="totalAmount"
              required
            />
          </div>
        </div>
      ) : (
        <div className="grid gap-5">
          <div className="grid gap-1.5">
            <label className="text-sm font-semibold text-ink" htmlFor="description-itemized">
              Descrição{" "}
              <span className="font-normal text-ink-muted">(opcional)</span>
            </label>
            <textarea
              className="min-h-24 rounded-md border border-paper-soft bg-white px-3 py-3 text-sm outline-none focus:border-leaf"
              defaultValue={initialValues?.description ?? ""}
              id="description-itemized"
              name="description"
              placeholder="Ex: Detalhes gerais do pedido ou item solicitado."
            />
          </div>

          <ProposalItemsFields
            initialItems={initialItems}
            minItems={1}
          />
        </div>
      )}

      {/* Common fields */}
      <div className="rounded-xl border border-paper-soft bg-paper p-5">
        <p className="text-xs font-semibold uppercase tracking-widest text-leaf">
          Entrada (sinal)
        </p>
        <p className="mt-1 text-sm text-ink-muted">
          Valor que o cliente paga antecipadamente para confirmar a contratação. Você recebe via Pix e marca como recebido manualmente.
        </p>
        <div className="mt-4 grid gap-1.5">
          <label className="text-sm font-semibold text-ink" htmlFor="depositAmount">
            Valor de entrada{" "}
            <span className="font-normal text-ink-muted">(opcional)</span>
          </label>
          <CurrencyInput
            className="min-h-11 max-w-48 rounded-md border border-paper-soft bg-white px-3 text-sm outline-none focus:border-leaf"
            id="depositAmount"
            name="depositAmount"
          />
        </div>
      </div>

      <div className="grid gap-1.5">
        <label className="text-sm font-semibold text-ink" htmlFor="validUntil">
          Validade da proposta{" "}
          <span className="font-normal text-ink-muted">(opcional)</span>
        </label>
        <input
          className="min-h-11 max-w-48 rounded-md border border-paper-soft bg-white px-3 text-sm outline-none focus:border-leaf"
          id="validUntil"
          min={today}
          name="validUntil"
          type="date"
        />
        <p className="text-xs text-ink-muted">
          Se informado, a proposta expira nesta data e o cliente não poderá mais aprovar.
        </p>
      </div>

      <button
        className="inline-flex min-h-11 w-full items-center justify-center rounded-md bg-leaf px-5 text-sm font-semibold text-white transition hover:bg-leaf-hover disabled:opacity-50 md:w-fit"
        disabled={isPending}
        type="submit"
      >
        {isPending ? "Enviando..." : "Enviar proposta"}
      </button>
    </form>
  );
}
