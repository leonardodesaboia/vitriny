"use client";

import { useState } from "react";
import Link from "next/link";
import type { QuoteRequestStatusActor } from "@prisma/client";

import {
  createQuoteRequestNote,
  deleteQuoteRequestNote
} from "@/lib/actions/quote-request-notes";
import {
  buildWaUrl,
  pixDepositMessage,
  proposalApprovedMessage,
  proposalReadyMessage,
  proposalRejectedMessage
} from "@/lib/whatsapp-messages";
import { markDepositPaid } from "@/lib/actions/proposals";
import { WhatsAppButton } from "@/components/whatsapp/WhatsAppButton";
import { formatPhoneBR, phoneToTelHref } from "@/lib/utils/phone";
import type { QuoteRequestWithRelations } from "@/types";

// Decimal fields serialized to string before crossing the Server→Client boundary
type SerializedProposal = {
  id: string;
  publicToken: string;
  status: string;
  depositAmount: string | null;
  depositPaidAt: Date | null;
};

type SerializedService = {
  id: string;
  name: string;
  pricingType: "FIXED" | "CUSTOM";
  basePrice: string | null;
};

export type SerializedQuoteRequest = Omit<QuoteRequestWithRelations, "proposal" | "service"> & {
  proposal: SerializedProposal | null;
  service: SerializedService | null;
};

type Props = {
  quoteRequest: SerializedQuoteRequest;
  serviceNamesById: Record<string, string>;
};

const statusLabels: Record<string, string> = {
  NEW: "Novo",
  REVIEWING: "Em análise",
  PROPOSAL_SENT: "Proposta enviada",
  CLOSED: "Fechado"
};

const statusBadge: Record<string, string> = {
  NEW: "bg-blue-50 text-blue-700 border border-blue-200",
  REVIEWING: "bg-amber-50 text-amber-700 border border-amber-200",
  PROPOSAL_SENT: "bg-mint text-leaf border border-mint",
  CLOSED: "bg-paper-soft text-ink-muted border border-paper-soft"
};

const proposalStatusLabel: Record<string, string> = {
  DRAFT: "Rascunho",
  SENT: "Enviada",
  APPROVED: "Aprovada",
  REJECTED: "Recusada",
  EXPIRED: "Expirada"
};

const proposalStatusBadge: Record<string, string> = {
  DRAFT: "bg-paper-soft text-ink-muted",
  SENT: "bg-amber-50 text-amber-700",
  APPROVED: "bg-mint text-leaf",
  REJECTED: "bg-red-50 text-red-700",
  EXPIRED: "bg-paper-soft text-ink-muted"
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

function formatDateShort(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(date);
}

function getInitials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

function splitServiceFromDescription(
  description: string,
  serviceNamesById: Record<string, string>
) {
  const prefix = "Serviço selecionado: ";
  if (!description.startsWith(prefix)) {
    return { serviceLabel: null, cleanDescription: description };
  }
  const [firstLine, ...rest] = description.split("\n");
  const serviceId = firstLine.replace(prefix, "").trim();
  return {
    serviceLabel: serviceNamesById[serviceId] ?? serviceId,
    cleanDescription: rest.join("\n").trim()
  };
}

export function QuoteRequestCard({ quoteRequest, serviceNamesById }: Props) {
  const [expanded, setExpanded] = useState(false);

  const legacyService = splitServiceFromDescription(
    quoteRequest.description ?? "",
    serviceNamesById
  );
  const serviceLabel = quoteRequest.service?.name ?? legacyService.serviceLabel;
  const cleanDescription = quoteRequest.service
    ? quoteRequest.description
    : legacyService.cleanDescription;
  const customerPhoneDisplay = formatPhoneBR(quoteRequest.customerPhone);
  const customerPhoneHref =
    customerPhoneDisplay && quoteRequest.customerPhone
      ? phoneToTelHref(quoteRequest.customerPhone)
      : "";
  const customerWhatsAppUrl = quoteRequest.customerPhone
    ? buildWaUrl(
        quoteRequest.customerPhone,
        `Oi, ${quoteRequest.customerName}! Recebi seu pedido de orçamento e vou te responder por aqui.`
      )
    : "";

  return (
    <article className="overflow-hidden rounded-xl border border-paper-soft bg-white shadow-card">
      {/* Collapsed header — always visible, clickable */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="grid h-32 w-full grid-cols-[36px_minmax(0,1fr)_20px] items-start gap-3 p-4 text-left transition hover:bg-paper/50 sm:grid-cols-[40px_minmax(0,1fr)_auto] sm:gap-4 sm:p-5"
        title={`Abrir pedido de ${quoteRequest.customerName}`}
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-mint text-sm font-bold text-leaf sm:h-10 sm:w-10">
          {getInitials(quoteRequest.customerName)}
        </div>

        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-1.5 overflow-hidden">
            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${statusBadge[quoteRequest.status] ?? "bg-paper-soft text-ink-muted"}`}
            >
              {statusLabels[quoteRequest.status]}
            </span>
            <span className="shrink-0 text-xs text-ink-muted">
              {formatDateShort(quoteRequest.createdAt)}
            </span>
            {quoteRequest.service?.pricingType === "FIXED" ? (
              <span className="hidden shrink-0 rounded-full border border-mint bg-mint px-2 py-0.5 text-xs font-semibold text-leaf sm:inline-flex">
                Preço fixo
              </span>
            ) : null}
          </div>
          <p
            className="line-clamp-3 font-fraunces text-base font-bold leading-snug text-ink sm:line-clamp-2"
            title={quoteRequest.customerName}
          >
            {quoteRequest.customerName}
          </p>
          <p className="mt-1 line-clamp-1 text-xs text-ink-muted">
            {serviceLabel ?? "Serviço não informado"}
          </p>
        </div>

        <div className="flex h-full shrink-0 items-center justify-end gap-2 sm:gap-3">
          <svg
            className={`h-4 w-4 shrink-0 text-ink-muted transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Expanded content */}
      {expanded ? (
        <div className="border-t border-paper-soft bg-white p-4 sm:p-6">
          <div className="mb-4 rounded-xl border border-paper-soft bg-paper px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-ink-muted">
              Cliente
            </p>
            <p className="mt-1 break-words font-fraunces text-xl font-bold leading-snug text-ink">
              {quoteRequest.customerName}
            </p>
          </div>

          {/* Contact + service grid */}
          <div className="grid gap-3 md:grid-cols-3">
            <div className="min-w-0 rounded-lg border border-paper-soft bg-paper px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-ink-muted">
                E-mail
              </p>
              {quoteRequest.customerEmail ? (
                <a
                  href={`mailto:${quoteRequest.customerEmail}`}
                  className="mt-1 block break-all text-sm font-medium text-leaf transition hover:underline"
                >
                  {quoteRequest.customerEmail}
                </a>
              ) : (
                <p className="mt-1 text-sm text-ink-muted">Não informado</p>
              )}
            </div>
            <div className="min-w-0 rounded-lg border border-paper-soft bg-paper px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-ink-muted">
                Telefone
              </p>
              {customerPhoneDisplay ? (
                <div className="mt-1 grid gap-2">
                  <a
                    href={customerPhoneHref}
                    className="block text-sm font-medium text-leaf transition hover:underline"
                  >
                    {customerPhoneDisplay}
                  </a>
                  <a
                    className="inline-flex min-h-8 w-full items-center justify-center rounded-md bg-leaf px-3 text-xs font-semibold text-white transition hover:bg-leaf-hover sm:w-fit"
                    href={customerWhatsAppUrl}
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    WhatsApp
                  </a>
                </div>
              ) : (
                <p className="mt-1 text-sm text-ink-muted">Não informado</p>
              )}
            </div>
            <div className="min-w-0 rounded-lg border border-paper-soft bg-paper px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-ink-muted">
                Serviço
              </p>
              <p className="mt-1 break-words text-sm text-ink">
                {serviceLabel ?? (
                  <span className="text-ink-muted">Não informado</span>
                )}
              </p>
            </div>
          </div>

          {/* Scheduling details — shown only when present */}
          {(quoteRequest.desiredDate || quoteRequest.desiredTime || quoteRequest.location) ? (
            <div className="mt-4 grid gap-3 rounded-lg border border-paper-soft bg-paper px-4 py-3 md:grid-cols-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-widest text-ink-muted">
                  Data desejada
                </p>
                <p className="mt-1 text-sm text-ink">
                  {quoteRequest.desiredDate
                    ? new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(
                        new Date(quoteRequest.desiredDate + "T12:00:00Z")
                      )
                    : <span className="text-ink-muted">Não informado</span>}
                </p>
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-widest text-ink-muted">
                  Horário / período
                </p>
                <p className="mt-1 text-sm text-ink">
                  {quoteRequest.desiredTime ?? <span className="text-ink-muted">Não informado</span>}
                </p>
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-widest text-ink-muted">
                  Local
                </p>
                <p className="mt-1 break-words text-sm text-ink">
                  {quoteRequest.location ?? <span className="text-ink-muted">Não informado</span>}
                </p>
              </div>
            </div>
          ) : null}

          {/* Nota do cliente */}
          <div className="mt-5 rounded-xl border border-paper-soft bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-ink-muted">
              Nota do cliente
            </p>
            <p className="mt-2 max-h-40 overflow-auto whitespace-pre-line break-words text-sm leading-6 text-ink">
              {cleanDescription ?? (
                <span className="text-ink-muted">Nenhuma nota adicionada.</span>
              )}
            </p>
          </div>

          {/* Proposal section */}
          {quoteRequest.proposal ? (
            <div className="mt-5 rounded-xl border border-paper-soft bg-paper p-4 sm:p-5">
              <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-widest text-leaf">
                    Proposta
                  </p>
                  <div className="mt-1 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                    <Link
                      className="block break-all text-sm font-semibold text-ink transition hover:text-leaf"
                      href={`/proposta/${quoteRequest.proposal.publicToken}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Ver proposta ↗
                    </Link>
                    {(quoteRequest.proposal.status === "APPROVED" ||
                      quoteRequest.proposal.status === "REJECTED") ? (
                      <a
                        href={`/api/proposals/${quoteRequest.proposal.id}/pdf`}
                        download
                        className="inline-flex min-h-8 items-center justify-center rounded-md border border-paper-soft bg-white px-3 text-xs font-semibold text-ink transition hover:border-stone-300"
                      >
                        ↓ Baixar PDF
                      </a>
                    ) : null}
                  </div>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${proposalStatusBadge[quoteRequest.proposal.status] ?? "bg-paper-soft text-ink-muted"}`}
                >
                  {proposalStatusLabel[quoteRequest.proposal.status]}
                </span>
              </div>

              {/* WhatsApp messages */}
              {(() => {
                const proposalUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/proposta/${quoteRequest.proposal!.publicToken}`;
                const phone = quoteRequest.customerPhone ?? undefined;
                const name = quoteRequest.customerName;
                const proposalStatus = quoteRequest.proposal!.status;
                const waUrl = (msg: string) =>
                  phone ? buildWaUrl(phone, msg) : undefined;

                const msgs =
                  proposalStatus === "SENT" || proposalStatus === "DRAFT"
                    ? [
                        {
                          label: "Avisar: proposta pronta",
                          message: proposalReadyMessage(name, proposalUrl),
                          waUrl: waUrl(proposalReadyMessage(name, proposalUrl))
                        },
                      ]
                    : proposalStatus === "APPROVED"
                      ? [
                          {
                            label: "Avisar: proposta aprovada",
                            message: proposalApprovedMessage(name),
                            waUrl: waUrl(proposalApprovedMessage(name))
                          }
                        ]
                      : proposalStatus === "REJECTED" || proposalStatus === "EXPIRED"
                        ? [
                            {
                              label: "Avisar: proposta encerrada",
                              message: proposalRejectedMessage(name),
                              waUrl: waUrl(proposalRejectedMessage(name))
                            }
                          ]
                        : [];

                if (msgs.length === 0) return null;

                return (
                  <div className="mt-4 border-t border-paper-soft pt-4">
                    <p className="text-xs font-semibold uppercase tracking-widest text-ink-muted">
                      Mensagens para WhatsApp
                    </p>
                    <div className="mt-1 divide-y divide-paper-soft">
                      {msgs.map((item) => (
                        <WhatsAppButton
                          key={item.label}
                          label={item.label}
                          message={item.message}
                          waUrl={item.waUrl}
                        />
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Pix deposit */}
              {(() => {
                const p = quoteRequest.proposal!;
                const depositAmt = p.depositAmount;
                const hasDeposit =
                  depositAmt !== null &&
                  depositAmt !== undefined &&
                  Number(depositAmt.toString()) > 0;

                const depositReceived = !!p.depositPaidAt;
                const depositPending = hasDeposit && p.status === "APPROVED" && !depositReceived;

                const formattedDeposit = new Intl.NumberFormat("pt-BR", {
                  style: "currency",
                  currency: "BRL"
                }).format(Number(depositAmt?.toString() ?? 0));

                return (
                  <div className="mt-4 border-t border-paper-soft pt-4">
                    <p className="text-xs font-semibold uppercase tracking-widest text-ink-muted">
                      Entrada Pix
                    </p>

                    {!hasDeposit ? (
                      <div className="mt-2 flex items-center gap-2 rounded-lg border border-paper-soft bg-paper px-3 py-2">
                        <span className="text-xs font-semibold text-ink-muted">
                          Sem entrada configurado para esta proposta.
                        </span>
                      </div>
                    ) : depositReceived ? (
                      <div className="mt-2 flex items-center gap-2 rounded-lg border border-mint bg-mint/40 px-3 py-2">
                        <span className="text-xs font-semibold text-leaf">
                          ✓ Entrada recebida — {formattedDeposit}
                        </span>
                      </div>
                    ) : depositPending ? (
                      <div className="mt-2 flex flex-col items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 sm:flex-row sm:items-center">
                        <span className="text-xs font-semibold text-amber-700">
                          Aguardando entrada — {formattedDeposit}
                        </span>
                        <form action={markDepositPaid}>
                          <input type="hidden" name="proposalId" value={p.id} />
                          <button
                            type="submit"
                            className="inline-flex min-h-8 w-full items-center justify-center rounded-md bg-leaf px-3 text-xs font-semibold text-white transition hover:bg-leaf-hover sm:w-auto"
                          >
                            Marcar como recebido
                          </button>
                        </form>
                      </div>
                    ) : (
                      <p className="mt-2 text-xs text-ink-muted">
                        Entrada de {formattedDeposit} — aguardando aprovação.
                      </p>
                    )}

                    {depositPending && quoteRequest.customerPhone ? (
                      <div className="mt-2">
                        <WhatsAppButton
                          label="Enviar instruções de Pix"
                          message={pixDepositMessage(
                            quoteRequest.customerName,
                            formattedDeposit,
                            "(configure a chave Pix no perfil)",
                            "(configure o titular no perfil)"
                          )}
                          waUrl={buildWaUrl(
                            quoteRequest.customerPhone,
                            pixDepositMessage(
                              quoteRequest.customerName,
                              formattedDeposit,
                              "(configure a chave Pix no perfil)",
                              "(configure o titular no perfil)"
                            )
                          )}
                        />
                      </div>
                    ) : null}
                  </div>
                );
              })()}
            </div>
          ) : (
            <div className="mt-5 flex flex-col gap-3">
              {quoteRequest.service?.pricingType !== "FIXED" ? (
                <Link
                  className="inline-flex min-h-10 w-full items-center justify-center rounded-md bg-leaf px-5 text-sm font-semibold text-white transition hover:bg-leaf-hover sm:w-fit"
                  href={`/dashboard/propostas/nova?requestId=${quoteRequest.id}`}
                >
                  Criar proposta
                </Link>
              ) : (
                <div className="rounded-lg border border-mint bg-mint/30 px-4 py-3">
                  <p className="text-sm text-ink-muted">
                    Serviço com preço fixo. Este pedido não precisa de proposta.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Status history */}
          {quoteRequest.statusHistory.length > 0 ? (
            <div className="mt-5 border-t border-paper-soft pt-5">
              <p className="text-xs font-semibold uppercase tracking-widest text-ink-muted">
                Histórico
              </p>
              <ol className="mt-3 grid gap-2">
                {quoteRequest.statusHistory.map((history) => (
                  <li
                    key={history.id}
                    className="flex min-w-0 gap-3 border-l-2 border-paper-soft pl-3 text-sm"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-ink">
                        {history.fromStatus
                          ? `${statusLabels[history.fromStatus]} → ${statusLabels[history.toStatus]}`
                          : statusLabels[history.toStatus]}
                      </p>
                      <p className="mt-0.5 text-xs text-ink-muted">
                        {actorLabels[history.actor]} · {formatDate(history.createdAt)}
                      </p>
                      {history.note ? (
                        <p className="mt-0.5 break-words text-xs text-ink-muted">{history.note}</p>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          ) : null}

          {/* Internal notes */}
          <div className="mt-5 border-t border-paper-soft pt-5">
            <p className="text-xs font-semibold uppercase tracking-widest text-ink-muted">
              Notas internas
            </p>

            {quoteRequest.internalNotes.length > 0 ? (
              <ul className="mt-3 grid gap-2">
                {quoteRequest.internalNotes.map((note) => (
                  <li
                    key={note.id}
                    className="rounded-lg border border-paper-soft bg-paper px-4 py-3"
                  >
                    <p className="max-h-36 overflow-auto whitespace-pre-line break-words text-sm leading-6 text-ink">
                      {note.content}
                    </p>
                    <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <span className="break-words text-xs text-ink-muted">
                        {note.author.name ?? note.author.email ?? "Prestador"} ·{" "}
                        {formatDate(note.createdAt)}
                      </span>
                      <form action={deleteQuoteRequestNote}>
                        <input name="noteId" type="hidden" value={note.id} />
                        <button
                          className="text-xs font-semibold text-red-500 transition hover:text-red-700"
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
              <p className="mt-2 text-sm text-ink-muted">
                Nenhuma nota registrada.
              </p>
            )}

            <form action={createQuoteRequestNote} className="mt-4 grid gap-2">
              <input name="requestId" type="hidden" value={quoteRequest.id} />
              <label
                className="text-xs font-semibold uppercase tracking-widest text-ink-muted"
                htmlFor={`note-${quoteRequest.id}`}
              >
                Nova nota interna
              </label>
              <textarea
                className="min-h-20 rounded-md border border-paper-soft bg-white px-3 py-3 text-sm text-ink outline-none focus:border-leaf"
                id={`note-${quoteRequest.id}`}
                maxLength={1000}
                name="content"
                required
              />
              <div>
                <button
                  className="inline-flex min-h-9 w-full items-center justify-center rounded-md border border-paper-soft bg-white px-4 text-xs font-semibold text-ink transition hover:border-leaf hover:text-leaf sm:w-auto"
                  type="submit"
                >
                  Salvar nota
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </article>
  );
}
