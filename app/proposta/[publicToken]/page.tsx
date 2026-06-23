import { notFound } from "next/navigation";

import { respondToProposal } from "@/lib/actions/proposal-response";
import { prisma } from "@/lib/prisma";

type PublicProposalPageProps = {
  params: Promise<{
    publicToken: string;
  }>;
  searchParams: Promise<{
    error?: string;
    response?: string;
  }>;
};

const statusLabels: Record<string, string> = {
  DRAFT: "Rascunho",
  SENT: "Enviada",
  APPROVED: "Aprovada",
  REJECTED: "Recusada",
  EXPIRED: "Expirada"
};

const statusColors: Record<string, string> = {
  DRAFT: "bg-paper-soft text-ink-muted",
  SENT: "bg-amber-soft text-amber",
  APPROVED: "bg-mint text-leaf",
  REJECTED: "bg-red-50 text-red-700",
  EXPIRED: "bg-paper-soft text-ink-muted"
};

const responseMessages: Record<string, string> = {
  approved: "Proposta aprovada com sucesso.",
  rejected: "Proposta recusada."
};

const errorMessages: Record<string, string> = {
  answered: "Esta proposta já foi respondida.",
  expired: "Esta proposta está expirada e não pode mais ser respondida.",
  "not-found": "Proposta não encontrada."
};

function formatMoney(value: { toString: () => string }) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(Number(value.toString()));
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(date);
}

export default async function PublicProposalPage({
  params,
  searchParams
}: PublicProposalPageProps) {
  const { publicToken } = await params;
  const query = await searchParams;

  const proposal = await prisma.proposal.findUnique({
    where: { publicToken },
    include: {
      provider: true,
      quoteRequest: true,
      items: { orderBy: { createdAt: "asc" } }
    }
  });

  if (!proposal) notFound();

  const isExpired = proposal.validUntil ? proposal.validUntil < new Date() : false;
  const isAnswered =
    proposal.status === "APPROVED" || proposal.status === "REJECTED";
  const canRespond = !isAnswered && !isExpired;

  const providerLocation = [proposal.provider.city, proposal.provider.state]
    .filter(Boolean)
    .join(", ");

  const displayStatus = isExpired ? "EXPIRED" : proposal.status;

  return (
    <main className="min-h-screen bg-paper px-4 py-12 text-ink sm:px-6">
      <div className="mx-auto max-w-3xl">
        {/* Document header */}
        <div className="rounded-2xl border border-paper-soft bg-white shadow-card">
          {/* Top bar */}
          <div className="grain flex items-center justify-between rounded-t-2xl bg-leaf px-8 py-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/60">
                Proposta comercial
              </p>
              <h1 className="mt-1 font-fraunces text-3xl font-bold text-white md:text-4xl">
                {proposal.title}
              </h1>
            </div>
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${statusColors[displayStatus] ?? "bg-paper-soft text-ink-muted"}`}
            >
              {isExpired ? "Expirada" : statusLabels[proposal.status]}
            </span>
          </div>

          <div className="p-8">
            {proposal.description ? (
              <p className="max-w-2xl text-sm leading-7 text-ink-muted">
                {proposal.description}
              </p>
            ) : null}

            {/* Alerts */}
            {isExpired ? (
              <div className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                Esta proposta passou da data de validade.
              </div>
            ) : null}
            {query.response ? (
              <div className="mt-6 rounded-lg border border-mint bg-mint/40 px-4 py-3 text-sm font-semibold text-leaf">
                {responseMessages[query.response] ?? "Resposta registrada."}
              </div>
            ) : null}
            {proposal.status === "APPROVED" && !query.response ? (
              <div className="mt-6 rounded-lg border border-mint bg-mint/40 px-4 py-3 text-sm font-semibold text-leaf">
                Esta proposta foi aprovada.
              </div>
            ) : null}
            {proposal.status === "REJECTED" && !query.response ? (
              <div className="mt-6 rounded-lg border border-paper-soft bg-paper-soft px-4 py-3 text-sm font-semibold text-ink-muted">
                Esta proposta foi recusada.
              </div>
            ) : null}
            {query.error ? (
              <div className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                {errorMessages[query.error] ?? "Não foi possível responder."}
              </div>
            ) : null}

            {/* Provider + Client */}
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-paper-soft bg-paper p-5">
                <p className="text-xs font-semibold uppercase tracking-widest text-leaf">
                  Prestador
                </p>
                <p className="mt-2 font-fraunces text-lg font-bold text-ink">
                  {proposal.provider.businessName}
                </p>
                <dl className="mt-3 grid gap-1.5 text-sm">
                  {proposal.provider.email ? (
                    <div className="flex items-center gap-2">
                      <dt className="text-ink-muted">E-mail</dt>
                      <dd className="font-medium text-ink">
                        {proposal.provider.email}
                      </dd>
                    </div>
                  ) : null}
                  {proposal.provider.phone ? (
                    <div className="flex items-center gap-2">
                      <dt className="text-ink-muted">Telefone</dt>
                      <dd className="font-medium text-ink">
                        {proposal.provider.phone}
                      </dd>
                    </div>
                  ) : null}
                  {providerLocation ? (
                    <div className="flex items-center gap-2">
                      <dt className="text-ink-muted">Local</dt>
                      <dd className="font-medium text-ink">{providerLocation}</dd>
                    </div>
                  ) : null}
                </dl>
              </div>

              <div className="rounded-xl border border-paper-soft bg-paper p-5">
                <p className="text-xs font-semibold uppercase tracking-widest text-ink-muted">
                  Cliente
                </p>
                <p className="mt-2 font-fraunces text-lg font-bold text-ink">
                  {proposal.quoteRequest.customerName}
                </p>
                <dl className="mt-3 grid gap-1.5 text-sm">
                  {proposal.quoteRequest.customerEmail ? (
                    <div className="flex items-center gap-2">
                      <dt className="text-ink-muted">E-mail</dt>
                      <dd className="font-medium text-ink">
                        {proposal.quoteRequest.customerEmail}
                      </dd>
                    </div>
                  ) : null}
                  {proposal.quoteRequest.customerPhone ? (
                    <div className="flex items-center gap-2">
                      <dt className="text-ink-muted">Telefone</dt>
                      <dd className="font-medium text-ink">
                        {proposal.quoteRequest.customerPhone}
                      </dd>
                    </div>
                  ) : null}
                </dl>
              </div>
            </div>

            {/* Items table */}
            <div className="mt-8">
              <p className="text-xs font-semibold uppercase tracking-widest text-ink-muted">
                Itens da proposta
              </p>
              <div className="mt-3 overflow-hidden rounded-xl border border-paper-soft">
                {/* Table header */}
                <div className="grid grid-cols-[1fr_60px_120px_120px] gap-4 bg-paper-soft px-5 py-3 text-xs font-semibold uppercase tracking-widest text-ink-muted">
                  <span>Descrição</span>
                  <span className="text-right">Qtd</span>
                  <span className="text-right">Unit.</span>
                  <span className="text-right">Total</span>
                </div>
                {proposal.items.map((item, index) => (
                  <div
                    key={item.id}
                    className={`grid grid-cols-[1fr_60px_120px_120px] gap-4 px-5 py-4 text-sm ${index % 2 === 0 ? "bg-white" : "bg-paper"}`}
                  >
                    <span className="font-medium text-ink">{item.description}</span>
                    <span className="text-right text-ink-muted">{item.quantity}</span>
                    <span className="text-right text-ink-muted">
                      {formatMoney(item.unitPrice)}
                    </span>
                    <span className="text-right font-semibold text-ink">
                      {formatMoney(item.totalPrice)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Totals + validity */}
            <div className="mt-4 flex flex-col items-end gap-4 rounded-xl border border-paper-soft bg-paper p-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex gap-6 text-sm text-ink-muted">
                {proposal.validUntil ? (
                  <div>
                    <span>Válido até </span>
                    <span className="font-semibold text-ink">
                      {formatDate(proposal.validUntil)}
                    </span>
                  </div>
                ) : null}
                {proposal.respondedAt ? (
                  <div>
                    <span>Respondida em </span>
                    <span className="font-semibold text-ink">
                      {formatDate(proposal.respondedAt)}
                    </span>
                  </div>
                ) : null}
              </div>
              <div className="text-right">
                <p className="text-xs font-semibold uppercase tracking-widest text-ink-muted">
                  Total
                </p>
                <p className="font-fraunces text-4xl font-bold text-ink">
                  {formatMoney(proposal.totalAmount)}
                </p>
              </div>
            </div>

            {/* Actions */}
            {isAnswered ? (
              <div className="mt-6 rounded-xl border border-paper-soft bg-paper p-5 text-center">
                <p className="text-sm font-semibold text-ink">
                  Esta proposta já foi respondida como{" "}
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${statusColors[proposal.status]}`}
                  >
                    {statusLabels[proposal.status]}
                  </span>
                </p>
              </div>
            ) : !canRespond ? (
              <div className="mt-6 rounded-xl border border-paper-soft bg-paper p-5 text-center">
                <p className="text-sm text-ink-muted">
                  Esta proposta está expirada e não pode mais ser respondida.
                </p>
              </div>
            ) : (
              <div className="mt-8 flex flex-col gap-3 border-t border-paper-soft pt-6 sm:flex-row">
                <form
                  action={async () => {
                    "use server";
                    await respondToProposal(publicToken, "APPROVED");
                  }}
                  className="flex-1"
                >
                  <button
                    className="inline-flex min-h-11 w-full items-center justify-center rounded-md bg-leaf px-5 text-sm font-semibold text-white transition hover:bg-leaf-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber focus-visible:ring-offset-2"
                    type="submit"
                  >
                    Aprovar proposta
                  </button>
                </form>
                <form
                  action={async () => {
                    "use server";
                    await respondToProposal(publicToken, "REJECTED");
                  }}
                  className="flex-1"
                >
                  <button
                    className="inline-flex min-h-11 w-full items-center justify-center rounded-md border border-paper-soft bg-white px-5 text-sm font-semibold text-ink transition hover:border-red-300 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber focus-visible:ring-offset-2"
                    type="submit"
                  >
                    Recusar proposta
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-xs text-ink-muted">
          Proposta gerada via{" "}
          <span className="font-fraunces font-semibold text-leaf">OrçaFácil</span>
        </p>
      </div>
    </main>
  );
}
