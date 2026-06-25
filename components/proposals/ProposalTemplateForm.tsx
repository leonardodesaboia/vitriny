"use client";

import { useActionState } from "react";

import {
  createProposalTemplate,
  updateProposalTemplate
} from "@/lib/actions/proposal-templates";
import { ProposalItemsFields } from "@/components/proposals/ProposalItemsFields";
import type { ProposalTemplateData, ActionResult } from "@/types";

type ProposalTemplateFormProps = {
  template?: ProposalTemplateData;
};

export function ProposalTemplateForm({ template }: ProposalTemplateFormProps) {
  const action = template ? updateProposalTemplate : createProposalTemplate;
  const [state, formAction, isPending] = useActionState<ActionResult, FormData>(
    action,
    undefined
  );

  const initialItems = template?.items.map((item) => ({
    description: item.description ?? "",
    quantity: item.quantity ?? 1,
    unitPrice: item.unitPrice?.toString() ?? ""
  }));

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
            className="min-h-11 rounded-md border border-paper-soft bg-white px-3 text-sm outline-none focus:border-leaf"
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
            Título da proposta
          </label>
          <input
            className="min-h-11 rounded-md border border-paper-soft bg-white px-3 text-sm outline-none focus:border-leaf"
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
          Descrição sugerida{" "}
          <span className="font-normal text-ink-muted">(opcional)</span>
        </label>
        <textarea
          className="min-h-24 rounded-md border border-paper-soft bg-white px-3 py-3 text-sm outline-none focus:border-leaf"
          defaultValue={template?.description ?? ""}
          id={`description-${template?.id ?? "new"}`}
          name="description"
          placeholder="Ex: Detalhes gerais do serviço prestado."
        />
      </div>

      <ProposalItemsFields initialItems={initialItems} minItems={1} />

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
