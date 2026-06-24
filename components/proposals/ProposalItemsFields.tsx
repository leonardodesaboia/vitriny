"use client";

import { useState } from "react";
import { CurrencyInput } from "@/components/ui/CurrencyInput";

type ProposalItemRow = {
  key: string;
  description: string;
  quantity: string;
  defaultUnitPrice: string;
};

type ProposalItemsFieldsProps = {
  initialItems?: Array<{
    description: string;
    quantity: number;
    unitPrice: string;
  }>;
  minItems?: number;
};

function createEmptyRow(index: number): ProposalItemRow {
  return {
    key: `item-${Date.now()}-${index}`,
    description: "",
    quantity: "1",
    defaultUnitPrice: ""
  };
}

export function ProposalItemsFields({ initialItems, minItems = 0 }: ProposalItemsFieldsProps) {
  const [rows, setRows] = useState<ProposalItemRow[]>(
    initialItems && initialItems.length > 0
      ? initialItems.map((item, index) => ({
          key: `initial-${index}`,
          description: item.description,
          quantity: String(item.quantity),
          defaultUnitPrice: item.unitPrice
        }))
      : [createEmptyRow(0)]
  );

  function updateRow(key: string, field: "description" | "quantity", value: string) {
    setRows((current) =>
      current.map((row) => (row.key === key ? { ...row, [field]: value } : row))
    );
  }

  function addRow() {
    setRows((current) => [...current, createEmptyRow(current.length)]);
  }

  function removeRow(key: string) {
    setRows((current) => current.filter((row) => row.key !== key));
  }

  return (
    <section className="rounded-xl border border-paper-soft bg-paper p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold text-ink">Itens da proposta</h2>
          <p className="mt-0.5 text-xs text-ink-muted">
            {minItems >= 1
              ? "Obrigatório — pelo menos 1 item com valor."
              : "Opcional — adicione serviços, materiais ou etapas com valores."}
          </p>
        </div>
        <button
          className="inline-flex min-h-9 w-fit items-center justify-center rounded-md border border-paper-soft bg-white px-4 text-xs font-semibold text-ink transition hover:border-leaf hover:text-leaf"
          onClick={addRow}
          type="button"
        >
          + Adicionar item
        </button>
      </div>

      {rows.length === 0 && minItems === 0 ? (
        <p className="mt-4 text-center text-xs text-ink-muted">
          Nenhum item adicionado. A proposta pode ser enviada sem itens.
        </p>
      ) : (
        <div className="mt-4 grid gap-3">
          {rows.map((row) => (
            <div
              className="grid gap-3 rounded-lg border border-paper-soft bg-white p-4 md:grid-cols-[1fr_100px_140px_auto]"
              key={row.key}
            >
              <div className="grid gap-1.5">
                <label
                  className="text-xs font-semibold uppercase tracking-widest text-ink-muted"
                  htmlFor={`itemDescription-${row.key}`}
                >
                  Descrição
                </label>
                <input
                  className="min-h-10 rounded-md border border-paper-soft bg-white px-3 text-sm outline-none focus:border-leaf"
                  id={`itemDescription-${row.key}`}
                  name="itemDescription"
                  onChange={(e) => updateRow(row.key, "description", e.target.value)}
                  placeholder="Ex: Mão de obra, Tinta, Visita técnica…"
                  required
                  type="text"
                  value={row.description}
                />
              </div>

              <div className="grid gap-1.5">
                <label
                  className="text-xs font-semibold uppercase tracking-widest text-ink-muted"
                  htmlFor={`itemQuantity-${row.key}`}
                >
                  Qtd.
                </label>
                <input
                  className="min-h-10 w-full rounded-md border border-paper-soft bg-white px-3 text-sm outline-none focus:border-leaf"
                  id={`itemQuantity-${row.key}`}
                  min="1"
                  name="itemQuantity"
                  onChange={(e) => updateRow(row.key, "quantity", e.target.value)}
                  required
                  type="number"
                  value={row.quantity}
                />
              </div>

              <div className="grid gap-1.5">
                <label
                  className="text-xs font-semibold uppercase tracking-widest text-ink-muted"
                  htmlFor={`itemUnitPrice-${row.key}`}
                >
                  Valor unit.
                </label>
                <CurrencyInput
                  className="min-h-10 w-full rounded-md border border-paper-soft bg-white px-3 text-sm outline-none focus:border-leaf"
                  defaultValue={row.defaultUnitPrice}
                  id={`itemUnitPrice-${row.key}`}
                  name="itemUnitPrice"
                  required
                />
              </div>

              <div className="flex items-end">
                <button
                  className="inline-flex min-h-10 items-center justify-center rounded-md border border-red-200 bg-red-50 px-3 text-xs font-semibold text-red-700 transition hover:border-red-300 disabled:cursor-not-allowed disabled:opacity-40"
                  disabled={rows.length <= minItems}
                  onClick={() => removeRow(row.key)}
                  type="button"
                >
                  Remover
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
