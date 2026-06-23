"use client";

import { useState } from "react";

type ProposalItemRow = {
  key: string;
  description: string;
  quantity: string;
  unitPrice: string;
};

type ProposalItemsFieldsProps = {
  initialItems?: Array<{
    description: string;
    quantity: number;
    unitPrice: string;
  }>;
};

function createEmptyRow(index: number): ProposalItemRow {
  return {
    key: `item-${Date.now()}-${index}`,
    description: "",
    quantity: "1",
    unitPrice: ""
  };
}

export function ProposalItemsFields({ initialItems }: ProposalItemsFieldsProps) {
  const [rows, setRows] = useState<ProposalItemRow[]>(
    initialItems && initialItems.length > 0
      ? initialItems.map((item, index) => ({
          key: `initial-${index}`,
          description: item.description,
          quantity: String(item.quantity),
          unitPrice: item.unitPrice
        }))
      : [createEmptyRow(0)]
  );

  function updateRow(
    key: string,
    field: "description" | "quantity" | "unitPrice",
    value: string
  ) {
    setRows((currentRows) =>
      currentRows.map((row) =>
        row.key === key
          ? {
              ...row,
              [field]: value
            }
          : row
      )
    );
  }

  function addRow() {
    setRows((currentRows) => [
      ...currentRows,
      createEmptyRow(currentRows.length)
    ]);
  }

  function removeRow(key: string) {
    setRows((currentRows) =>
      currentRows.length === 1
        ? currentRows
        : currentRows.filter((row) => row.key !== key)
    );
  }

  return (
    <section className="rounded-lg border border-stone-200 bg-paper p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-xl font-bold text-ink">Itens da proposta</h2>
        <button
          className="inline-flex min-h-10 w-fit items-center justify-center rounded-md border border-stone-300 bg-white px-4 text-sm font-semibold text-ink transition hover:border-leaf hover:text-leaf"
          onClick={addRow}
          type="button"
        >
          Adicionar item
        </button>
      </div>

      <div className="mt-4 grid gap-4">
        {rows.map((row, index) => (
          <div
            className="grid gap-4 rounded-md bg-white p-4 md:grid-cols-[1fr_120px_160px_auto]"
            key={row.key}
          >
            <div className="grid gap-2">
              <label
                className="text-sm font-semibold text-ink"
                htmlFor={`itemDescription-${row.key}`}
              >
                Descricao do item
              </label>
              <input
                className="min-h-11 rounded-md border border-stone-300 bg-white px-3 text-sm outline-none focus:border-leaf"
                id={`itemDescription-${row.key}`}
                name="itemDescription"
                onChange={(event) =>
                  updateRow(row.key, "description", event.target.value)
                }
                required={index === 0}
                type="text"
                value={row.description}
              />
            </div>

            <div className="grid min-w-0 gap-2">
              <label
                className="text-sm font-semibold text-ink"
                htmlFor={`itemQuantity-${row.key}`}
              >
                Qtd.
              </label>
              <input
                className="min-h-11 w-full rounded-md border border-stone-300 bg-white px-3 text-sm outline-none focus:border-leaf"
                id={`itemQuantity-${row.key}`}
                min="1"
                name="itemQuantity"
                onChange={(event) =>
                  updateRow(row.key, "quantity", event.target.value)
                }
                required={index === 0}
                type="number"
                value={row.quantity}
              />
            </div>

            <div className="grid min-w-0 gap-2">
              <label
                className="text-sm font-semibold text-ink"
                htmlFor={`itemUnitPrice-${row.key}`}
              >
                Valor unitario
              </label>
              <input
                className="min-h-11 w-full rounded-md border border-stone-300 bg-white px-3 text-sm outline-none focus:border-leaf"
                id={`itemUnitPrice-${row.key}`}
                min="0"
                name="itemUnitPrice"
                onChange={(event) =>
                  updateRow(row.key, "unitPrice", event.target.value)
                }
                required={index === 0}
                step="0.01"
                type="number"
                value={row.unitPrice}
              />
            </div>

            <div className="flex items-end">
              <button
                className="inline-flex min-h-11 items-center justify-center rounded-md border border-red-200 bg-red-50 px-4 text-sm font-semibold text-red-700 transition hover:border-red-300 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={rows.length === 1}
                onClick={() => removeRow(row.key)}
                type="button"
              >
                Remover
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
