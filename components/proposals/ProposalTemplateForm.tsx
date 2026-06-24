"use client";

import { useActionState } from "react";

import {
  createProposalTemplate,
  updateProposalTemplate
} from "@/lib/actions/proposal-templates";
import { CurrencyInput } from "@/components/ui/CurrencyInput";
import type { ProposalTemplateItem, ProposalTemplateData, ActionResult } from "@/types";

type ProposalTemplateFormProps = {
  template?: ProposalTemplateData;
};

function formatPrice(value: ProposalTemplateItem["unitPrice"]) {
  return value ? value.toString() : "";
}

function getRows(template?: ProposalTemplateData) {
  const existingItems = template?.items ?? [];
  const emptyRows = Array.from({ length: Math.max(3 - existingItems.length, 1) });

  return [
    ...existingItems,
    ...emptyRows.map<ProposalTemplateItem>(() => ({
      description: "",
      quantity: 1,
      unitPrice: undefined
    }))
  ];
}

export function ProposalTemplateForm({ template }: ProposalTemplateFormProps) {
  const action = template ? updateProposalTemplate : createProposalTemplate;
  const [state, formAction, isPending] = useActionState<ActionResult, FormData>(
    action,
    undefined
  );
  const rows = getRows(template);

  return (
    <form
      action={formAction}
      className="grid gap-4 rounded-xl border border-paper-soft bg-white p-5 shadow-card"
    >
      {template ? <input name="templateId" type="hidden" value={template.id} /> : null}

      {state?.error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {state.error}
        </p>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="grid gap-2">
          <label
            className="text-sm font-semibold text-ink"
            htmlFor={`name-${template?.id ?? "new"}`}
          >
            Nome do modelo
          </label>
          <input
            className="min-h-11 rounded-md border border-stone-300 bg-white px-3 text-sm outline-none focus:border-leaf"
            defaultValue={template?.name ?? ""}
            id={`name-${template?.id ?? "new"}`}
            name="name"
            required
            type="text"
          />
        </div>

        <div className="grid gap-2">
          <label
            className="text-sm font-semibold text-ink"
            htmlFor={`title-${template?.id ?? "new"}`}
          >
            Titulo da proposta
          </label>
          <input
            className="min-h-11 rounded-md border border-stone-300 bg-white px-3 text-sm outline-none focus:border-leaf"
            defaultValue={template?.title ?? ""}
            id={`title-${template?.id ?? "new"}`}
            name="title"
            required
            type="text"
          />
        </div>
      </div>

      <div className="grid gap-2">
        <label
          className="text-sm font-semibold text-ink"
          htmlFor={`description-${template?.id ?? "new"}`}
        >
          Descricao sugerida
        </label>
        <textarea
          className="min-h-24 rounded-md border border-stone-300 bg-white px-3 py-3 text-sm outline-none focus:border-leaf"
          defaultValue={template?.description ?? ""}
          id={`description-${template?.id ?? "new"}`}
          name="description"
        />
      </div>

      <section className="rounded-lg border border-paper-soft bg-paper p-4">
        <h3 className="text-sm font-semibold text-ink">Itens do modelo</h3>
        <div className="mt-4 grid gap-3">
          {rows.map((item, index) => (
            <div
              className="grid gap-3 rounded-md bg-white p-3 md:grid-cols-[1fr_100px_140px]"
              key={`${template?.id ?? "new"}-${item.id ?? index}`}
            >
              <div className="grid gap-2">
                <label
                  className="text-xs font-semibold text-ink-muted"
                  htmlFor={`itemDescription-${template?.id ?? "new"}-${index}`}
                >
                  Descricao
                </label>
                <input
                  className="min-h-10 rounded-md border border-stone-300 bg-white px-3 text-sm outline-none focus:border-leaf"
                  defaultValue={item.description ?? ""}
                  id={`itemDescription-${template?.id ?? "new"}-${index}`}
                  name="itemDescription"
                  required={index === 0}
                  type="text"
                />
              </div>

              <div className="grid min-w-0 gap-2">
                <label
                  className="text-xs font-semibold text-ink-muted"
                  htmlFor={`itemQuantity-${template?.id ?? "new"}-${index}`}
                >
                  Qtd.
                </label>
                <input
                  className="min-h-10 w-full rounded-md border border-stone-300 bg-white px-3 text-sm outline-none focus:border-leaf"
                  defaultValue={item.quantity ?? 1}
                  id={`itemQuantity-${template?.id ?? "new"}-${index}`}
                  min="1"
                  name="itemQuantity"
                  required={index === 0}
                  type="number"
                />
              </div>

              <div className="grid min-w-0 gap-2">
                <label
                  className="text-xs font-semibold text-ink-muted"
                  htmlFor={`itemUnitPrice-${template?.id ?? "new"}-${index}`}
                >
                  Valor unitario
                </label>
                <CurrencyInput
                  className="min-h-10 w-full rounded-md border border-stone-300 bg-white px-3 text-sm outline-none focus:border-leaf"
                  defaultValue={formatPrice(item.unitPrice)}
                  id={`itemUnitPrice-${template?.id ?? "new"}-${index}`}
                  name="itemUnitPrice"
                  required={index === 0}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      <button
        className="inline-flex min-h-11 w-full items-center justify-center rounded-md bg-leaf px-5 text-sm font-semibold text-white transition hover:bg-leaf-hover disabled:opacity-50 md:w-fit"
        disabled={isPending}
        type="submit"
      >
        {isPending ? "Salvando..." : template ? "Salvar modelo" : "Criar modelo"}
      </button>
    </form>
  );
}
