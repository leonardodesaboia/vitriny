import { notFound } from "next/navigation";

import { prisma } from "@/lib/prisma";

type PublicProposalPageProps = {
  params: Promise<{
    publicToken: string;
  }>;
};

const statusLabels: Record<string, string> = {
  DRAFT: "Rascunho",
  SENT: "Enviada",
  APPROVED: "Aprovada",
  REJECTED: "Recusada",
  EXPIRED: "Expirada"
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
  params
}: PublicProposalPageProps) {
  const { publicToken } = await params;

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

        <div className="mt-8 flex flex-col gap-3 border-t border-stone-200 pt-6 sm:flex-row">
          <span className="inline-flex min-h-11 items-center justify-center rounded-md bg-leaf px-5 text-sm font-semibold text-white">
            Aprovar proposta
          </span>
          <span className="inline-flex min-h-11 items-center justify-center rounded-md border border-stone-300 px-5 text-sm font-semibold text-ink">
            Recusar proposta
          </span>
        </div>
      </section>
    </main>
  );
}
