import { ProposalItemsFields } from "@/components/proposals/ProposalItemsFields";
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

export function ProposalForm({ requestId, initialValues }: ProposalFormProps) {
  const initialItems = initialValues?.items?.map((item) => ({
    description: item.description,
    quantity: item.quantity,
    unitPrice: item.unitPrice.toString()
  }));

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

      <ProposalItemsFields initialItems={initialItems} />

      <button
        className="inline-flex min-h-11 w-full items-center justify-center rounded-md bg-leaf px-5 text-sm font-semibold text-white transition hover:bg-[#1d6443] md:w-fit"
        type="submit"
      >
        Criar proposta
      </button>
    </form>
  );
}
