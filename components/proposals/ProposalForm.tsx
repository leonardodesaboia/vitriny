import { createProposal } from "@/lib/actions/proposals";

type ProposalFormProps = {
  requestId: string;
  initialValues?: {
    title?: string;
    description?: string | null;
    items?: Array<{
      description: string;
      quantity: number;
      unitPrice: { toString: () => string };
    }>;
  };
};

function getRows(initialValues: ProposalFormProps["initialValues"]) {
  const items = initialValues?.items ?? [];
  const emptyRows = Array.from({ length: Math.max(3 - items.length, 1) });

  return [
    ...items,
    ...emptyRows.map(() => ({
      description: "",
      quantity: 1,
      unitPrice: { toString: () => "" }
    }))
  ];
}

export function ProposalForm({ requestId, initialValues }: ProposalFormProps) {
  const rows = getRows(initialValues);

  return (
    <form action={createProposal} className="mt-8 grid gap-5">
      <input name="requestId" type="hidden" value={requestId} />

      <div className="grid gap-2">
        <label className="text-sm font-semibold text-ink" htmlFor="title">
          Título
        </label>
        <input
          className="min-h-11 rounded-md border border-stone-300 bg-white px-3 text-sm outline-none focus:border-leaf"
          defaultValue={initialValues?.title ?? ""}
          id="title"
          name="title"
          required
          type="text"
        />
      </div>

      <div className="grid gap-2">
        <label className="text-sm font-semibold text-ink" htmlFor="description">
          Descrição
        </label>
        <textarea
          className="min-h-28 rounded-md border border-stone-300 bg-white px-3 py-3 text-sm outline-none focus:border-leaf"
          defaultValue={initialValues?.description ?? ""}
          id="description"
          name="description"
        />
      </div>

      <div className="grid gap-2">
        <label className="text-sm font-semibold text-ink" htmlFor="validUntil">
          Validade
        </label>
        <input
          className="min-h-11 rounded-md border border-stone-300 bg-white px-3 text-sm outline-none focus:border-leaf"
          id="validUntil"
          name="validUntil"
          type="date"
        />
      </div>

      <section className="rounded-lg border border-stone-200 bg-paper p-5">
        <h2 className="text-xl font-bold text-ink">Itens da proposta</h2>
        <div className="mt-4 grid gap-4">
          {rows.map((item, index) => (
            <div className="grid gap-4 rounded-md bg-white p-4 md:grid-cols-[1fr_120px_160px]" key={index}>
              <div className="grid gap-2">
                <label
                  className="text-sm font-semibold text-ink"
                  htmlFor={`itemDescription-${index}`}
                >
                  Descrição do item
                </label>
                <input
                  className="min-h-11 rounded-md border border-stone-300 bg-white px-3 text-sm outline-none focus:border-leaf"
                  defaultValue={item.description}
                  id={`itemDescription-${index}`}
                  name="itemDescription"
                  required={index === 0}
                  type="text"
                />
              </div>
              <div className="grid gap-2">
                <label
                  className="text-sm font-semibold text-ink"
                  htmlFor={`itemQuantity-${index}`}
                >
                  Qtd.
                </label>
                <input
                  className="min-h-11 rounded-md border border-stone-300 bg-white px-3 text-sm outline-none focus:border-leaf"
                  defaultValue={item.quantity}
                  id={`itemQuantity-${index}`}
                  min="1"
                  name="itemQuantity"
                  required={index === 0}
                  type="number"
                />
              </div>
              <div className="grid gap-2">
                <label
                  className="text-sm font-semibold text-ink"
                  htmlFor={`itemUnitPrice-${index}`}
                >
                  Valor unitário
                </label>
                <input
                  className="min-h-11 rounded-md border border-stone-300 bg-white px-3 text-sm outline-none focus:border-leaf"
                  defaultValue={item.unitPrice.toString()}
                  id={`itemUnitPrice-${index}`}
                  min="0"
                  name="itemUnitPrice"
                  required={index === 0}
                  step="0.01"
                  type="number"
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      <button
        className="inline-flex min-h-11 w-full items-center justify-center rounded-md bg-leaf px-5 text-sm font-semibold text-white transition hover:bg-[#1d6443] md:w-fit"
        type="submit"
      >
        Criar proposta
      </button>
    </form>
  );
}
