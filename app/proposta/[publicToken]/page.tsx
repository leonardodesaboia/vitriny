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

const responseMessages: Record<string, string> = {
  approved: "Proposta aprovada com sucesso.",
  rejected: "Proposta recusada com sucesso."
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
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short"
  }).format(date);
}

export default async function PublicProposalPage({
  params,
  searchParams
}: PublicProposalPageProps) {
  const { publicToken } = await params;
  const query = await searchParams;

  const proposal = await prisma.proposal.findUnique({
    where: {
      publicToken
    },
    include: {
      provider: true,
      quoteRequest: true,
      items: {
        orderBy: {
          createdAt: "asc"
        }
      }
    }
  });

  if (!proposal) {
    notFound();
  }

  const isExpired = proposal.validUntil
    ? proposal.validUntil < new Date()
    : false;
  const isAnswered =
    proposal.status === "APPROVED" || proposal.status === "REJECTED";
  const canRespond = !isAnswered && !isExpired;

  const providerLocation = [proposal.provider.city, proposal.provider.state]
    .filter(Boolean)
    .join(", ");

  return (
    <main className="min-h-screen bg-paper px-6 py-12 text-ink">
      <section className="mx-auto max-w-5xl rounded-lg border border-stone-200 bg-white p-8 shadow-sm">
        <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-leaf">
              Proposta
            </p>
            <h1 className="mt-3 text-4xl font-bold">{proposal.title}</h1>
            {proposal.description ? (
              <p className="mt-4 max-w-2xl text-sm leading-6 text-stone-700">
                {proposal.description}
              </p>
            ) : null}
          </div>
          <div className="rounded-lg border border-stone-200 bg-paper p-4">
            <p className="text-sm font-semibold text-stone-500">Status</p>
            <p className="mt-1 text-lg font-bold text-leaf">
              {isExpired ? "Expirada" : statusLabels[proposal.status]}
            </p>
          </div>
        </div>

        {isExpired ? (
          <div className="mt-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            Esta proposta passou da data de validade.
          </div>
        ) : null}

        {query.response ? (
          <div className="mt-6 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-700">
            {responseMessages[query.response] ?? "Resposta registrada."}
          </div>
        ) : null}

        {proposal.status === "APPROVED" ? (
          <div className="mt-6 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-700">
            Esta proposta foi aprovada.
          </div>
        ) : null}

        {proposal.status === "REJECTED" ? (
          <div className="mt-6 rounded-md border border-stone-300 bg-stone-50 px-4 py-3 text-sm font-semibold text-stone-700">
            Esta proposta foi recusada.
          </div>
        ) : null}

        {query.error ? (
          <div className="mt-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {errorMessages[query.error] ?? "Não foi possível responder."}
          </div>
        ) : null}

        <div className="mt-8 grid gap-5 md:grid-cols-2">
          <div className="rounded-lg border border-stone-200 bg-paper p-5">
            <h2 className="text-xl font-bold text-ink">Prestador</h2>
            <dl className="mt-4 grid gap-3 text-sm">
              <div>
                <dt className="font-semibold text-stone-500">Negócio</dt>
                <dd className="mt-1 text-ink">{proposal.provider.businessName}</dd>
              </div>
              {proposal.provider.email ? (
                <div>
                  <dt className="font-semibold text-stone-500">E-mail</dt>
                  <dd className="mt-1 text-ink">{proposal.provider.email}</dd>
                </div>
              ) : null}
              {proposal.provider.phone ? (
                <div>
                  <dt className="font-semibold text-stone-500">Telefone</dt>
                  <dd className="mt-1 text-ink">{proposal.provider.phone}</dd>
                </div>
              ) : null}
              {providerLocation ? (
                <div>
                  <dt className="font-semibold text-stone-500">Localização</dt>
                  <dd className="mt-1 text-ink">{providerLocation}</dd>
                </div>
              ) : null}
            </dl>
          </div>

          <div className="rounded-lg border border-stone-200 bg-paper p-5">
            <h2 className="text-xl font-bold text-ink">Cliente</h2>
            <dl className="mt-4 grid gap-3 text-sm">
              <div>
                <dt className="font-semibold text-stone-500">Nome</dt>
                <dd className="mt-1 text-ink">
                  {proposal.quoteRequest.customerName}
                </dd>
              </div>
              {proposal.quoteRequest.customerEmail ? (
                <div>
                  <dt className="font-semibold text-stone-500">E-mail</dt>
                  <dd className="mt-1 text-ink">
                    {proposal.quoteRequest.customerEmail}
                  </dd>
                </div>
              ) : null}
              {proposal.quoteRequest.customerPhone ? (
                <div>
                  <dt className="font-semibold text-stone-500">Telefone</dt>
                  <dd className="mt-1 text-ink">
                    {proposal.quoteRequest.customerPhone}
                  </dd>
                </div>
              ) : null}
            </dl>
          </div>
        </div>

        <section className="mt-8">
          <h2 className="text-2xl font-bold text-ink">Itens</h2>
          <div className="mt-5 grid gap-4">
            {proposal.items.map((item) => (
              <article
                className="rounded-lg border border-stone-200 bg-paper p-5"
                key={item.id}
              >
                <div className="grid gap-4 md:grid-cols-[1fr_120px_160px_160px]">
                  <div>
                    <p className="text-sm font-semibold text-stone-500">
                      Descrição
                    </p>
                    <p className="mt-1 text-sm text-ink">{item.description}</p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-stone-500">Qtd.</p>
                    <p className="mt-1 text-sm text-ink">{item.quantity}</p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-stone-500">
                      Valor unitário
                    </p>
                    <p className="mt-1 text-sm text-ink">
                      {formatMoney(item.unitPrice)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-stone-500">Total</p>
                    <p className="mt-1 text-sm font-bold text-ink">
                      {formatMoney(item.totalPrice)}
                    </p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <div className="mt-8 rounded-lg border border-stone-200 bg-paper p-5">
          <dl className="grid gap-4 md:grid-cols-3">
            <div>
              <dt className="text-sm font-semibold text-stone-500">Total</dt>
              <dd className="mt-1 text-2xl font-bold text-ink">
                {formatMoney(proposal.totalAmount)}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-semibold text-stone-500">Validade</dt>
              <dd className="mt-1 text-base font-semibold text-ink">
                {proposal.validUntil ? formatDate(proposal.validUntil) : "Sem data"}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-semibold text-stone-500">Status</dt>
              <dd className="mt-1 text-base font-semibold text-ink">
                {isExpired ? "Expirada" : statusLabels[proposal.status]}
              </dd>
            </div>
          </dl>
        </div>

        {isAnswered ? (
          <div className="mt-8 rounded-lg border border-stone-200 bg-paper p-5">
            <p className="text-sm font-semibold text-ink">
              Esta proposta já foi respondida como {statusLabels[proposal.status]}.
            </p>
            {proposal.respondedAt ? (
              <p className="mt-2 text-sm text-stone-600">
                Respondida em {formatDate(proposal.respondedAt)}.
              </p>
            ) : null}
          </div>
        ) : !canRespond ? (
          <div className="mt-8 rounded-lg border border-stone-200 bg-paper p-5">
            <p className="text-sm font-semibold text-ink">
              Esta proposta não pode mais ser respondida porque está expirada.
            </p>
          </div>
        ) : (
          <div className="mt-8 flex flex-col gap-3 border-t border-stone-200 pt-6 sm:flex-row">
            <form
              action={async () => {
                "use server";
                await respondToProposal(publicToken, "APPROVED");
              }}
            >
              <button
                className="inline-flex min-h-11 w-full items-center justify-center rounded-md bg-leaf px-5 text-sm font-semibold text-white transition hover:bg-[#1d6443]"
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
            >
              <button
                className="inline-flex min-h-11 w-full items-center justify-center rounded-md border border-stone-300 px-5 text-sm font-semibold text-ink transition hover:border-leaf hover:text-leaf"
                type="submit"
              >
                Recusar proposta
              </button>
            </form>
          </div>
        )}
      </section>
    </main>
  );
}
