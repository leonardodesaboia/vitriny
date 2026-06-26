import { notFound } from "next/navigation";
import Image from "next/image";

import { respondToProposal } from "@/lib/actions/proposal-response";
import { CopyButton } from "@/components/ui/CopyButton";
import { prisma } from "@/lib/prisma";
import { createPixPayment } from "@/lib/pix";
import { formatPhoneBR } from "@/lib/utils/phone";

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
  EXPIRED: "Expirada",
};

const statusColors: Record<string, string> = {
  DRAFT: "bg-paper-soft text-ink-muted",
  SENT: "bg-amber-soft text-amber",
  APPROVED: "bg-mint text-leaf",
  REJECTED: "bg-red-50 text-red-700",
  EXPIRED: "bg-paper-soft text-ink-muted",
};

const actorLabels: Record<string, string> = {
  CUSTOMER: "Cliente",
  PROVIDER: "Prestador",
  SYSTEM: "Sistema",
};

const responseMessages: Record<string, string> = {
  approved: "Proposta aprovada com sucesso.",
  rejected: "Proposta recusada.",
};

const errorMessages: Record<string, string> = {
  answered: "Esta proposta já foi respondida.",
  expired: "Esta proposta está expirada e não pode mais ser respondida.",
  "not-found": "Proposta não encontrada.",
};

function formatMoney(value: { toString: () => string }) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(value.toString()));
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(date);
}

export default async function PublicProposalPage({
  params,
  searchParams,
}: PublicProposalPageProps) {
  const { publicToken } = await params;
  const query = await searchParams;

  const proposal = await prisma.proposal.findUnique({
    where: { publicToken },
    include: {
      provider: {
        select: {
          businessName: true,
          email: true,
          phone: true,
          city: true,
          state: true,
          pixKey: true,
          pixKeyType: true,
          pixHolderName: true,
          pixCity: true,
        },
      },
      quoteRequest: {
        include: {
          service: {
            select: { name: true },
          },
        },
      },
      items: { orderBy: { createdAt: "asc" } },
      statusHistory: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          fromStatus: true,
          toStatus: true,
          actor: true,
          note: true,
          createdAt: true,
        },
      },
    },
  });

  if (!proposal) notFound();

  const isExpired = proposal.validUntil
    ? proposal.validUntil < new Date()
    : false;
  const isAnswered =
    proposal.status === "APPROVED" || proposal.status === "REJECTED";
  const canRespond = !isAnswered && !isExpired;

  const providerLocation = [proposal.provider.city, proposal.provider.state]
    .filter(Boolean)
    .join(", ");

  const displayStatus = isExpired ? "EXPIRED" : proposal.status;
  const providerPhoneDisplay = formatPhoneBR(proposal.provider.phone);
  const customerPhoneDisplay = formatPhoneBR(
    proposal.quoteRequest.customerPhone,
  );
  const hasDeposit =
    proposal.depositAmount !== null &&
    Number(proposal.depositAmount.toString()) > 0;
  const canShowPix =
    proposal.status === "APPROVED" &&
    hasDeposit &&
    !!proposal.provider.pixKey &&
    !!proposal.provider.pixHolderName &&
    !!proposal.provider.pixCity;
  const pixPayment = canShowPix
    ? await createPixPayment({
        pixKey: proposal.provider.pixKey!,
        pixHolderName: proposal.provider.pixHolderName!,
        pixCity: proposal.provider.pixCity!,
        amount: proposal.depositAmount!.toString(),
        transactionId: proposal.id,
        description: "ENTRADA ORCAFACIL",
      })
    : null;

  return (
    <main className="min-h-screen bg-paper px-4 py-12 text-ink sm:px-6">
      <div className="mx-auto max-w-3xl">
        {/* Document header */}
        <div className="rounded-2xl border border-paper-soft bg-white shadow-card">
          {/* Top bar */}
          <div className="grain flex items-start justify-between gap-4 rounded-t-2xl bg-leaf px-8 py-6">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/60">
                Proposta comercial
              </p>
              <h1 className="mt-1 font-fraunces text-3xl font-bold text-white md:text-4xl">
                {proposal.title ?? proposal.provider.businessName}
              </h1>
              {proposal.quoteRequest.service?.name ? (
                <p className="mt-2 text-sm font-medium text-white/70">
                  Serviço:{" "}
                  <span className="text-white">
                    {proposal.quoteRequest.service.name}
                  </span>
                </p>
              ) : null}
            </div>
            <span
              className={`mt-1 flex-shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${statusColors[displayStatus] ?? "bg-paper-soft text-ink-muted"}`}
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
                  {providerPhoneDisplay ? (
                    <div className="flex items-center gap-2">
                      <dt className="text-ink-muted">Telefone</dt>
                      <dd className="font-medium text-ink">
                        {providerPhoneDisplay}
                      </dd>
                    </div>
                  ) : null}
                  {providerLocation ? (
                    <div className="flex items-center gap-2">
                      <dt className="text-ink-muted">Local</dt>
                      <dd className="font-medium text-ink">
                        {providerLocation}
                      </dd>
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
                  {customerPhoneDisplay ? (
                    <div className="flex items-center gap-2">
                      <dt className="text-ink-muted">Telefone</dt>
                      <dd className="font-medium text-ink">
                        {customerPhoneDisplay}
                      </dd>
                    </div>
                  ) : null}
                </dl>
              </div>
            </div>

            {/* Scheduling details */}
            {(proposal.quoteRequest.desiredDate ||
              proposal.quoteRequest.desiredTime ||
              proposal.quoteRequest.location) ? (
              <div className="mt-4 grid gap-3 rounded-xl border border-paper-soft bg-paper p-5 sm:grid-cols-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-ink-muted">
                    Data desejada
                  </p>
                  <p className="mt-1 text-sm font-medium text-ink">
                    {proposal.quoteRequest.desiredDate
                      ? new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(
                          new Date(proposal.quoteRequest.desiredDate + "T12:00:00Z")
                        )
                      : <span className="text-ink-muted">Não informado</span>}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-ink-muted">
                    Horário / período
                  </p>
                  <p className="mt-1 text-sm font-medium text-ink">
                    {proposal.quoteRequest.desiredTime ?? (
                      <span className="text-ink-muted">Não informado</span>
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-ink-muted">
                    Local
                  </p>
                  <p className="mt-1 text-sm font-medium text-ink">
                    {proposal.quoteRequest.location ?? (
                      <span className="text-ink-muted">Não informado</span>
                    )}
                  </p>
                </div>
              </div>
            ) : null}

            {/* Items table */}
            {proposal.items.length > 0 ? (
              <div className="mt-8">
                <p className="text-xs font-semibold uppercase tracking-widest text-ink-muted">
                  Itens da proposta
                </p>
                <div className="mt-3 overflow-hidden rounded-xl border border-paper-soft">
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
                      <span className="font-medium text-ink">
                        {item.description}
                      </span>
                      <span className="text-right text-ink-muted">
                        {item.quantity}
                      </span>
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
            ) : null}

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

            {/* Sinal (entrada) */}
            {hasDeposit &&
            (proposal.status === "SENT" || proposal.status === "APPROVED") ? (
              <div className="mt-4 overflow-hidden rounded-xl border border-amber-200">
                <div className="flex flex-wrap items-center justify-between gap-3 bg-amber-50 px-5 py-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">
                      {proposal.status === "APPROVED"
                        ? "Entrada (sinal)"
                        : "Entrada previsto"}
                    </p>
                    <p className="mt-1 font-fraunces text-3xl font-bold text-amber-800">
                      {formatMoney(proposal.depositAmount!)}
                    </p>
                  </div>
                  {proposal.depositPaidAt ? (
                    <span className="rounded-full bg-mint px-3 py-1 text-xs font-semibold text-leaf">
                      Recebido pelo prestador
                    </span>
                  ) : (
                    <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                      {proposal.status === "APPROVED"
                        ? "Aguardando pagamento"
                        : "Valor informado"}
                    </span>
                  )}
                </div>
                <div className="border-t border-amber-200 bg-white p-5">
                  <p className="text-sm leading-6 text-ink-muted">
                    {proposal.status === "SENT"
                      ? "Esta proposta informa um valor de entrada previsto. As instruções de pagamento aparecem somente após a aprovação."
                      : "Realize o pagamento de entrada via Pix para confirmar sua reserva."}
                  </p>

                  {pixPayment ? (
                    <div className="mt-5 grid gap-5 lg:grid-cols-[220px_1fr]">
                      <div className="rounded-xl border border-paper-soft bg-paper p-4">
                        <p className="text-xs font-semibold uppercase tracking-widest text-ink-muted">
                          QR Code Pix
                        </p>
                        <Image
                          alt="QR Code Pix para pagamento de entrada"
                          className="mt-3 h-auto w-full rounded-lg bg-white"
                          height={280}
                          src={pixPayment.qrCodeDataUrl}
                          unoptimized
                          width={280}
                        />
                      </div>

                      <div className="grid gap-4">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-widest text-ink-muted">
                            Código Pix copia e cola
                          </p>
                          <div className="mt-1.5 grid gap-2">
                            <code className="max-h-28 overflow-auto break-all rounded-lg border border-paper-soft bg-paper px-3 py-2 text-xs leading-5 text-ink">
                              {pixPayment.copyPasteCode}
                            </code>
                            <div className="flex justify-between">
                              <CopyButton
                                text={pixPayment.copyPasteCode}
                                label="Copiar código Pix"
                                className="inline-flex min-h-8 w-fit items-center justify-center rounded-md bg-leaf px-3 text-xs font-semibold text-white transition hover:bg-leaf-hover"
                              />
                            </div>
                          </div>
                        </div>

                        <div className="flex justify-between text-sm text-ink-muted sm:grid-cols-3">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-widest">
                              Titular
                            </p>
                            <p className="mt-1 text-ink">
                              {proposal.provider.pixHolderName}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-widest">
                              Cidade
                            </p>
                            <p className="mt-1 text-ink">
                              {proposal.provider.pixCity}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {proposal.status === "APPROVED" ? (
                    <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800">
                      <p className="font-semibold">
                        Pagamento feito diretamente ao prestador.
                      </p>
                      <p>
                        O OrçaFácil não confirma esse pagamento automaticamente.
                      </p>
                      <p>
                        Após pagar, envie o comprovante ao prestador ou combine
                        a confirmação diretamente com ele.
                      </p>
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}

            {proposal.statusHistory.length > 0 ? (
              <div className="mt-6 rounded-xl border border-paper-soft bg-white p-5">
                <p className="text-xs font-semibold uppercase tracking-widest text-ink-muted">
                  Historico da proposta
                </p>
                <ol className="mt-4 grid gap-3">
                  {proposal.statusHistory.map((history) => (
                    <li
                      className="border-l-2 border-paper-soft pl-3 text-sm text-ink-muted"
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
                        <p className="mt-1">{history.note}</p>
                      ) : null}
                    </li>
                  ))}
                </ol>
              </div>
            ) : null}

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
          <span className="font-fraunces font-semibold text-leaf">
            OrçaFácil
          </span>
        </p>
      </div>
    </main>
  );
}
