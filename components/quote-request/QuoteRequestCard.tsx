"use client";

import { useState } from "react";
import Link from "next/link";
import type { QuoteRequestStatusActor } from "@prisma/client";

import { updateQuoteRequestStatus } from "@/lib/actions/quote-request-status";
import {
  createQuoteRequestNote,
  deleteQuoteRequestNote
} from "@/lib/actions/quote-request-notes";
import {
  buildWaUrl,
  pixDepositMessage,
  proposalApprovedMessage,
  proposalFollowUpMessage,
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

export type SerializedQuoteRequest = Omit<QuoteRequestWithRelations, "proposal"> & {
  proposal: SerializedProposal | null;
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
    quoteRequest.description,
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

  return (
    <article className="rounded-xl border border-paper-soft bg-white shadow-card">
      {/* Collapsed header — always visible, clickable */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center gap-4 p-5 text-left transition hover:bg-paper/50"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-mint text-sm font-bold text-leaf">
          {getInitials(quoteRequest.customerName)}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-fraunces text-base font-bold text-ink">
              {quoteRequest.customerName}
            </span>
            {serviceLabel ? (
              <span className="text-xs text-ink-muted">· {serviceLabel}</span>
            ) : null}
          </div>
          <p className="mt-0.5 text-xs text-ink-muted">
            {formatDateShort(quoteRequest.createdAt)}
            {customerPhoneDisplay ? ` · ${customerPhoneDisplay}` : ""}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${statusBadge[quoteRequest.status] ?? "bg-paper-soft text-ink-muted"}`}
          >
            {statusLabels[quoteRequest.status]}
          </span>
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
        <div className="border-t border-paper-soft p-6">
          {/* Contact + service grid */}
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-ink-muted">
                E-mail
              </p>
              {quoteRequest.customerEmail ? (
                <a
                  href={`mailto:${quoteRequest.customerEmail}`}
                  className="mt-1 block text-sm font-medium text-leaf transition hover:underline"
                >
                  {quoteRequest.customerEmail}
                </a>
              ) : (
                <p className="mt-1 text-sm text-ink-muted">Não informado</p>
              )}
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-ink-muted">
                Telefone
              </p>
              {customerPhoneDisplay ? (
                <a
                  href={customerPhoneHref}
                  className="mt-1 block text-sm font-medium text-leaf transition hover:underline"
                >
                  {customerPhoneDisplay}
                </a>
              ) : (
                <p className="mt-1 text-sm text-ink-muted">Não informado</p>
              )}
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-ink-muted">
                Serviço
              </p>
              <p className="mt-1 text-sm text-ink">
                {serviceLabel ?? (
                  <span className="text-ink-muted">Não informado</span>
                )}
              </p>
            </div>
          </div>

          {/* Description */}
          {cleanDescription ? (
            <div className="mt-5">
              <p className="text-xs font-semibold uppercase tracking-widest text-ink-muted">
                Descrição
              </p>
              <p className="mt-2 whitespace-pre-line text-sm leading-6 text-ink">
                {cleanDescription}
              </p>
            </div>
          ) : null}

          {/* Proposal section */}
          {quoteRequest.proposal ? (
            <div className="mt-5 rounded-xl border border-paper-soft bg-paper p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-leaf">
                    Proposta
                  </p>
                  <Link
                    className="mt-1 block text-sm font-semibold text-ink transition hover:text-leaf"
                    href={`/proposta/${quoteRequest.proposal.publicToken}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Ver proposta ↗
                  </Link>
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
                        {
                          label: "Follow-up",
                          message: proposalFollowUpMessage(name, proposalUrl),
                          waUrl: waUrl(proposalFollowUpMessage(name, proposalUrl))
                        }
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

                if (!hasDeposit) return null;

                const depositReceived = !!p.depositPaidAt;
                const depositPending = p.status === "APPROVED" && !depositReceived;

                const formattedDeposit = new Intl.NumberFormat("pt-BR", {
                  style: "currency",
                  currency: "BRL"
                }).format(Number(depositAmt!.toString()));

                return (
                  <div className="mt-4 border-t border-paper-soft pt-4">
                    <p className="text-xs font-semibold uppercase tracking-widest text-ink-muted">
                      Sinal Pix
                    </p>

                    {depositReceived ? (
                      <div className="mt-2 flex items-center gap-2 rounded-lg border border-mint bg-mint/40 px-3 py-2">
                        <span className="text-xs font-semibold text-leaf">
                          ✓ Sinal recebido — {formattedDeposit}
                        </span>
                      </div>
                    ) : depositPending ? (
                      <div className="mt-2 flex flex-wrap items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
                        <span className="text-xs font-semibold text-amber-700">
                          Aguardando sinal — {formattedDeposit}
                        </span>
                        <form action={markDepositPaid}>
                          <input type="hidden" name="proposalId" value={p.id} />
                          <button
                            type="submit"
                            className="inline-flex min-h-7 items-center justify-center rounded-md bg-leaf px-3 text-xs font-semibold text-white transition hover:bg-leaf-hover"
                          >
                            Marcar como recebido
                          </button>
                        </form>
                      </div>
                    ) : (
                      <p className="mt-2 text-xs text-ink-muted">
                        Sinal de {formattedDeposit} — aguardando aprovação.
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
            <div className="mt-5">
              <Link
                className="inline-flex min-h-10 items-center justify-center rounded-md bg-leaf px-5 text-sm font-semibold text-white transition hover:bg-leaf-hover"
                href={`/dashboard/propostas/nova?requestId=${quoteRequest.id}`}
              >
                Criar proposta
              </Link>
            </div>
          )}

          {/* Status update */}
          <div className="mt-5 border-t border-paper-soft pt-5">
            <form
              action={updateQuoteRequestStatus}
              className="flex flex-wrap items-end gap-3"
            >
              <input name="requestId" type="hidden" value={quoteRequest.id} />
              <div className="grid gap-1.5">
                <label
                  className="text-xs font-semibold uppercase tracking-widest text-ink-muted"
                  htmlFor={`status-${quoteRequest.id}`}
                >
                  Atualizar status
                </label>
                <select
                  className="min-h-9 rounded-md border border-paper-soft bg-white px-3 text-sm text-ink outline-none focus:border-leaf"
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
                className="inline-flex min-h-9 items-center justify-center rounded-md border border-paper-soft bg-white px-4 text-xs font-semibold text-ink transition hover:border-leaf hover:text-leaf"
                type="submit"
              >
                Salvar
              </button>
            </form>
          </div>

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
                    className="flex gap-3 border-l-2 border-paper-soft pl-3 text-sm"
                  >
                    <div>
                      <p className="font-semibold text-ink">
                        {history.fromStatus
                          ? `${statusLabels[history.fromStatus]} → ${statusLabels[history.toStatus]}`
                          : statusLabels[history.toStatus]}
                      </p>
                      <p className="mt-0.5 text-xs text-ink-muted">
                        {actorLabels[history.actor]} · {formatDate(history.createdAt)}
                      </p>
                      {history.note ? (
                        <p className="mt-0.5 text-xs text-ink-muted">{history.note}</p>
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
                    <p className="whitespace-pre-line text-sm leading-6 text-ink">
                      {note.content}
                    </p>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <span className="text-xs text-ink-muted">
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
                  className="inline-flex min-h-9 items-center justify-center rounded-md border border-paper-soft bg-white px-4 text-xs font-semibold text-ink transition hover:border-leaf hover:text-leaf"
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
