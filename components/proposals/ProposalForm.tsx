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
    <form
      action={formAction}
      className="mt-6 grid gap-6 rounded-xl border border-paper-soft bg-white p-4 shadow-card sm:p-6"
    >
      {state?.error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {state.error}
        </p>
      ) : null}
      <input name="requestId" type="hidden" value={requestId} />
      <input name="pricingMode" type="hidden" value={mode} />

      <div className="grid gap-1.5">
        <label className="text-sm font-semibold text-ink" htmlFor="title">
          Título da proposta{" "}
          <span className="font-normal text-ink-muted">(opcional)</span>
        </label>
        <input
          className="min-h-11 rounded-md border border-paper-soft bg-white px-3 text-sm outline-none focus:border-leaf"
          defaultValue={initialValues?.title ?? ""}
          id="title"
          maxLength={120}
          name="title"
          placeholder="Ex: Pintura residencial — 3 cômodos"
          type="text"
        />
      </div>

      <div className="grid gap-1.5">
        <label className="text-sm font-semibold text-ink" htmlFor="description">
          Mensagem ao cliente{" "}
          <span className="font-normal text-ink-muted">(opcional)</span>
        </label>
        <textarea
          className="min-h-24 rounded-md border border-paper-soft bg-white px-3 py-3 text-sm outline-none focus:border-leaf"
          defaultValue={initialValues?.description ?? ""}
          id="description"
          maxLength={1000}
          name="description"
          placeholder="Explique o que está incluído, condições ou observações importantes."
        />
      </div>

      <div className="grid gap-2">
        <p className="text-sm font-semibold text-ink">Como apresentar o valor?</p>
        <div className="flex rounded-xl border border-paper-soft bg-paper p-1">
          <button
            aria-pressed={mode === "SIMPLE"}
            type="button"
            onClick={() => setMode("SIMPLE")}
            className={`flex-1 rounded-lg px-3 py-2.5 text-sm font-semibold transition sm:px-4 ${
              mode === "SIMPLE"
                ? "bg-white text-ink shadow-sm"
                : "text-ink-muted hover:text-ink"
            }`}
          >
            Valor único
          </button>
          <button
            aria-pressed={mode === "ITEMIZED"}
            type="button"
            onClick={() => setMode("ITEMIZED")}
            className={`flex-1 rounded-lg px-3 py-2.5 text-sm font-semibold transition sm:px-4 ${
              mode === "ITEMIZED"
                ? "bg-white text-ink shadow-sm"
                : "text-ink-muted hover:text-ink"
            }`}
          >
            Itens detalhados
          </button>
        </div>
      </div>

      {mode === "SIMPLE" ? (
        <div className="grid gap-1.5">
          <label className="text-sm font-semibold text-ink" htmlFor="totalAmount">
            Valor total <span className="text-red-500">*</span>
          </label>
          <CurrencyInput
            className="min-h-11 w-full rounded-md border border-paper-soft bg-white px-3 text-sm outline-none focus:border-leaf sm:max-w-48"
            id="totalAmount"
            name="totalAmount"
            required
          />
        </div>
      ) : (
        <ProposalItemsFields
          compact
          initialItems={initialItems}
          minItems={1}
        />
      )}

      <div className="border-t border-paper-soft pt-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-leaf">
          Condições opcionais
        </p>
        <div className="mt-4 grid gap-5 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <label className="text-sm font-semibold text-ink" htmlFor="depositAmount">
              Entrada via Pix
            </label>
            <CurrencyInput
              className="min-h-11 w-full rounded-md border border-paper-soft bg-white px-3 text-sm outline-none focus:border-leaf"
              id="depositAmount"
              name="depositAmount"
            />
            <p className="text-xs leading-5 text-ink-muted">
              Cobrada após a aprovação; confirmação manual.
            </p>
          </div>

          <div className="grid gap-1.5">
            <label className="text-sm font-semibold text-ink" htmlFor="validUntil">
              Válida até
            </label>
            <input
              className="min-h-11 w-full rounded-md border border-paper-soft bg-white px-3 text-sm outline-none focus:border-leaf"
              id="validUntil"
              min={today}
              name="validUntil"
              type="date"
            />
            <p className="text-xs leading-5 text-ink-muted">
              Depois desta data, não poderá ser aprovada.
            </p>
          </div>
        </div>
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
