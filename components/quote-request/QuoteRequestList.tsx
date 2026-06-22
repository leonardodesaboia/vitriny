import Link from "next/link";
import type { QuoteRequest } from "@prisma/client";

import { updateQuoteRequestStatus } from "@/lib/actions/quote-request-status";

type QuoteRequestWithProposal = QuoteRequest & {
  proposal: {
    publicToken: string;
  } | null;
};

type QuoteRequestListProps = {
  quoteRequests: QuoteRequestWithProposal[];
};

const statusLabels: Record<string, string> = {
  NEW: "Novo",
  REVIEWING: "Em análise",
  PROPOSAL_SENT: "Proposta enviada",
  CLOSED: "Fechado"
};

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(date);
}

function splitServiceFromDescription(description: string) {
  const prefix = "Serviço selecionado: ";

  if (!description.startsWith(prefix)) {
    return {
      serviceLabel: null,
      cleanDescription: description
    };
  }

  const [firstLine, ...rest] = description.split("\n");

  return {
    serviceLabel: firstLine.replace(prefix, "").trim(),
    cleanDescription: rest.join("\n").trim()
  };
}

export function QuoteRequestList({ quoteRequests }: QuoteRequestListProps) {
  if (quoteRequests.length === 0) {
    return (
      <div className="rounded-lg border border-stone-200 bg-paper p-5">
        <p className="text-sm leading-6 text-stone-700">
          Nenhum pedido de orçamento recebido ainda.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-5">
      {quoteRequests.map((quoteRequest) => {
        const { serviceLabel, cleanDescription } = splitServiceFromDescription(
          quoteRequest.description
        );

        return (
          <article
            className="rounded-lg border border-stone-200 bg-paper p-5"
            key={quoteRequest.id}
          >
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <h2 className="text-xl font-bold text-ink">
                  {quoteRequest.customerName}
                </h2>
                <p className="mt-1 text-sm text-stone-600">
                  Recebido em {formatDate(quoteRequest.createdAt)}
                </p>
              </div>
              <span className="inline-flex min-h-9 w-fit items-center rounded-full bg-white px-3 text-sm font-semibold text-leaf">
                {statusLabels[quoteRequest.status]}
              </span>
            </div>

            <dl className="mt-5 grid gap-4 md:grid-cols-2">
              <div>
                <dt className="text-sm font-semibold text-stone-500">E-mail</dt>
                <dd className="mt-1 text-sm text-ink">
                  {quoteRequest.customerEmail ?? "Não informado"}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-semibold text-stone-500">Telefone</dt>
                <dd className="mt-1 text-sm text-ink">
                  {quoteRequest.customerPhone ?? "Não informado"}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-semibold text-stone-500">
                  Serviço escolhido
                </dt>
                <dd className="mt-1 text-sm text-ink">
                  {serviceLabel ?? "Não informado"}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-semibold text-stone-500">Status</dt>
                <dd className="mt-1 text-sm text-ink">
                  {statusLabels[quoteRequest.status]}
                </dd>
              </div>
            </dl>

            <div className="mt-5">
              <h3 className="text-sm font-semibold text-stone-500">Descrição</h3>
              <p className="mt-2 whitespace-pre-line text-sm leading-6 text-stone-700">
                {cleanDescription}
              </p>
            </div>

            {quoteRequest.proposal ? (
              <div className="mt-5 rounded-md border border-stone-200 bg-white p-4">
                <p className="text-sm font-semibold text-ink">Proposta criada</p>
                <p className="mt-2 text-sm text-stone-700">Link público:</p>
                <Link
                  className="mt-2 inline-flex break-all text-sm font-semibold text-leaf"
                  href={`/proposta/${quoteRequest.proposal.publicToken}`}
                >
                  /proposta/{quoteRequest.proposal.publicToken}
                </Link>
              </div>
            ) : (
              <Link
                className="mt-5 inline-flex min-h-11 items-center justify-center rounded-md border border-stone-300 bg-white px-5 text-sm font-semibold text-ink transition hover:border-leaf hover:text-leaf"
                href={`/dashboard/propostas/nova?requestId=${quoteRequest.id}`}
              >
                Criar proposta
              </Link>
            )}

            <form action={updateQuoteRequestStatus} className="mt-5 flex flex-col gap-3 md:flex-row md:items-end">
              <input name="requestId" type="hidden" value={quoteRequest.id} />
              <div className="grid gap-2">
                <label
                  className="text-sm font-semibold text-ink"
                  htmlFor={`status-${quoteRequest.id}`}
                >
                  Atualizar status
                </label>
                <select
                  className="min-h-11 rounded-md border border-stone-300 bg-white px-3 text-sm outline-none focus:border-leaf"
                  defaultValue={quoteRequest.status}
                  id={`status-${quoteRequest.id}`}
                  name="status"
                >
                  <option value="NEW">Novo</option>
                  <option value="REVIEWING">Em análise</option>
                  <option value="CLOSED">Fechado</option>
                </select>
              </div>
              <button
                className="inline-flex min-h-11 items-center justify-center rounded-md bg-leaf px-5 text-sm font-semibold text-white transition hover:bg-[#1d6443]"
                type="submit"
              >
                Salvar status
              </button>
            </form>
          </article>
        );
      })}
    </div>
  );
}
