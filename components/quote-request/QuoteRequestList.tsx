import Link from "next/link";
import type {
  QuoteRequest,
  QuoteRequestStatus,
  QuoteRequestStatusActor
} from "@prisma/client";

import { updateQuoteRequestStatus } from "@/lib/actions/quote-request-status";
import {
  createQuoteRequestNote,
  deleteQuoteRequestNote
} from "@/lib/actions/quote-request-notes";

type QuoteRequestWithProposal = QuoteRequest & {
  service: {
    id: string;
    name: string;
  } | null;
  proposal: {
    publicToken: string;
  } | null;
  statusHistory: Array<{
    id: string;
    fromStatus: QuoteRequestStatus | null;
    toStatus: QuoteRequestStatus;
    actor: QuoteRequestStatusActor;
    note: string | null;
    createdAt: Date;
  }>;
  internalNotes: Array<{
    id: string;
    content: string;
    createdAt: Date;
    author: {
      name: string | null;
      email: string | null;
    };
  }>;
};

type QuoteRequestListProps = {
  quoteRequests: QuoteRequestWithProposal[];
  services: Array<{
    id: string;
    name: string;
  }>;
};

const statusLabels: Record<string, string> = {
  NEW: "Novo",
  REVIEWING: "Em análise",
  PROPOSAL_SENT: "Proposta enviada",
  CLOSED: "Fechado"
};

const actorLabels: Record<QuoteRequestStatusActor, string> = {
  CUSTOMER: "Cliente",
  PROVIDER: "Prestador",
  SYSTEM: "Sistema"
};

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(date);
}

function splitServiceFromDescription(
  description: string,
  serviceNamesById: Record<string, string>
) {
  const prefix = "Serviço selecionado: ";

  if (!description.startsWith(prefix)) {
    return {
      serviceLabel: null,
      cleanDescription: description
    };
  }

  const [firstLine, ...rest] = description.split("\n");

  const serviceId = firstLine.replace(prefix, "").trim();

  return {
    serviceLabel: serviceNamesById[serviceId] ?? serviceId,
    cleanDescription: rest.join("\n").trim()
  };
}

export function QuoteRequestList({ quoteRequests, services }: QuoteRequestListProps) {
  const serviceNamesById = Object.fromEntries(
    services.map((service) => [service.id, service.name])
  );

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
        const legacyService = splitServiceFromDescription(
          quoteRequest.description,
          serviceNamesById
        );
        const serviceLabel = quoteRequest.service?.name ?? legacyService.serviceLabel;
        const cleanDescription = quoteRequest.service
          ? quoteRequest.description
          : legacyService.cleanDescription;

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

            {quoteRequest.statusHistory.length > 0 ? (
              <div className="mt-5 rounded-md border border-stone-200 bg-white p-4">
                <p className="text-sm font-semibold text-ink">
                  Historico de status
                </p>
                <ol className="mt-3 grid gap-3">
                  {quoteRequest.statusHistory.map((history) => (
                    <li
                      className="border-l-2 border-stone-200 pl-3 text-sm text-stone-700"
                      key={history.id}
                    >
                      <p className="font-semibold text-ink">
                        {history.fromStatus
                          ? `${statusLabels[history.fromStatus]} -> ${statusLabels[history.toStatus]}`
                          : statusLabels[history.toStatus]}
                      </p>
                      <p className="mt-1">
                        {actorLabels[history.actor]} em{" "}
                        {formatDate(history.createdAt)}
                      </p>
                      {history.note ? (
                        <p className="mt-1 text-stone-600">{history.note}</p>
                      ) : null}
                    </li>
                  ))}
                </ol>
              </div>
            ) : null}

            <div className="mt-5 rounded-md border border-stone-200 bg-white p-4">
              <p className="text-sm font-semibold text-ink">Notas internas</p>
              {quoteRequest.internalNotes.length > 0 ? (
                <ul className="mt-3 grid gap-3">
                  {quoteRequest.internalNotes.map((note) => (
                    <li
                      className="rounded-md border border-stone-200 bg-paper p-3"
                      key={note.id}
                    >
                      <p className="whitespace-pre-line text-sm leading-6 text-stone-700">
                        {note.content}
                      </p>
                      <div className="mt-2 flex flex-col gap-2 text-xs text-stone-500 sm:flex-row sm:items-center sm:justify-between">
                        <span>
                          {note.author.name ?? note.author.email ?? "Prestador"} em{" "}
                          {formatDate(note.createdAt)}
                        </span>
                        <form action={deleteQuoteRequestNote}>
                          <input name="noteId" type="hidden" value={note.id} />
                          <button
                            className="font-semibold text-red-600 transition hover:text-red-700"
                            type="submit"
                          >
                            Excluir
                          </button>
                        </form>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-sm text-stone-600">
                  Nenhuma nota interna registrada.
                </p>
              )}

              <form action={createQuoteRequestNote} className="mt-4 grid gap-3">
                <input name="requestId" type="hidden" value={quoteRequest.id} />
                <label
                  className="text-sm font-semibold text-ink"
                  htmlFor={`note-${quoteRequest.id}`}
                >
                  Nova nota interna
                </label>
                <textarea
                  className="min-h-24 rounded-md border border-stone-300 bg-white px-3 py-3 text-sm outline-none focus:border-leaf"
                  id={`note-${quoteRequest.id}`}
                  maxLength={1000}
                  name="content"
                  required
                />
                <button
                  className="inline-flex min-h-10 w-fit items-center justify-center rounded-md bg-leaf px-4 text-sm font-semibold text-white transition hover:bg-[#1d6443]"
                  type="submit"
                >
                  Salvar nota
                </button>
              </form>
            </div>
          </article>
        );
      })}
    </div>
  );
}
