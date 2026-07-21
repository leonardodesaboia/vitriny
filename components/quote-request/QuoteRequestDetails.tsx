"use client";

import { useState, useTransition } from "react";
import Link from "next/link";

import {
  createQuoteRequestNote,
  deleteQuoteRequestNote,
  updateQuoteRequestNote
} from "@/lib/actions/quote-request-notes";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { CharCountTextarea } from "@/components/ui/CharCountTextarea";
import {
  buildWaUrl,
  pixDepositMessage,
  proposalApprovedMessage,
  proposalReadyMessage,
  proposalRejectedMessage
} from "@/lib/whatsapp-messages";
import { markDepositPaid } from "@/lib/actions/proposals";
import {
  markPixReservationPaid,
  reopenPixReservation
} from "@/lib/actions/quote-requests";
import { WhatsAppButton } from "@/components/whatsapp/WhatsAppButton";
import { formatPhoneBR, phoneToTelHref } from "@/lib/utils/phone";
import { isPixPaymentExpired } from "@/lib/utils/date";
import {
  actorLabels,
  formatDate,
  formatDateShort,
  proposalStatusBadge,
  proposalStatusLabel,
  splitServiceFromDescription,
  statusLabels
} from "@/components/quote-request/format";
import type { SerializedQuoteRequest } from "@/components/quote-request/serialize";

type Props = {
  quoteRequest: SerializedQuoteRequest;
  serviceNamesById: Record<string, string>;
  pixInfo?: { pixKey: string; pixHolderName: string } | null;
  // Página de origem para os redirects das actions (validado no servidor).
  returnTo?: string;
};

export function QuoteRequestDetails({
  quoteRequest,
  serviceNamesById,
  pixInfo = null,
  returnTo
}: Props) {
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [noteToDelete, setNoteToDelete] = useState<string | null>(null);
  const [deletePending, startDeleteTransition] = useTransition();

  const legacyService = splitServiceFromDescription(
    quoteRequest.description ?? "",
    serviceNamesById
  );
  // Snapshot primeiro: o histórico conta a verdade da época do pedido.
  const serviceLabel =
    quoteRequest.serviceNameSnapshot ??
    quoteRequest.service?.name ??
    legacyService.serviceLabel;
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
        `Oi, ${quoteRequest.customerName}! Recebi seu pedido e vou te responder por aqui.`
      )
    : "";

  return (
    <div className="bg-white p-4 sm:p-6">
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
            Item
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
          Descrição do pedido
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

                {depositPending && quoteRequest.customerPhone && pixInfo ? (
                  <div className="mt-2">
                    <WhatsAppButton
                      label="Enviar instruções de Pix"
                      message={pixDepositMessage(
                        quoteRequest.customerName,
                        formattedDeposit,
                        pixInfo.pixKey,
                        pixInfo.pixHolderName
                      )}
                      waUrl={buildWaUrl(
                        quoteRequest.customerPhone,
                        pixDepositMessage(
                          quoteRequest.customerName,
                          formattedDeposit,
                          pixInfo.pixKey,
                          pixInfo.pixHolderName
                        )
                      )}
                    />
                  </div>
                ) : depositPending && !pixInfo ? (
                  <p className="mt-2 text-xs text-ink-muted">
                    Configure sua chave Pix em{" "}
                    <Link
                      className="font-semibold text-leaf hover:underline"
                      href="/dashboard/perfil"
                    >
                      dados do negócio
                    </Link>{" "}
                    para enviar as instruções de pagamento ao cliente.
                  </p>
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
                Item com preço fixo. Este pedido não precisa de proposta.
              </p>
            </div>
          )}

          {/* Pix reservation section */}
          {quoteRequest.pixReservationRequestedAt ? (
            <div className="rounded-xl border border-paper-soft bg-paper p-4 sm:p-5">
              <p className="text-xs font-semibold uppercase tracking-widest text-leaf">
                Pagamento Pix do pedido
              </p>
              {quoteRequest.fixedServiceAmount ? (
                <p className="mt-1 font-fraunces text-xl font-bold text-ink">
                  {new Intl.NumberFormat("pt-BR", {
                    style: "currency",
                    currency: "BRL"
                  }).format(Number(quoteRequest.fixedServiceAmount))}
                </p>
              ) : null}
              {quoteRequest.pixReservationPaidAt ? (
                <div className="mt-3 flex items-center gap-2 rounded-lg border border-mint bg-mint/40 px-3 py-2">
                  <span className="text-xs font-semibold text-leaf">
                    ✓ Pix confirmado em{" "}
                    {formatDateShort(quoteRequest.pixReservationPaidAt)}
                  </span>
                </div>
              ) : quoteRequest.pixReservationClientPaidAt ? (
                <div className="mt-3 flex flex-col items-start gap-3 rounded-lg border border-amber-300 bg-amber-100 px-3 py-2 sm:flex-row sm:items-center">
                  <span className="text-xs font-semibold text-amber-800">
                    Cliente informou pagamento em{" "}
                    {formatDateShort(quoteRequest.pixReservationClientPaidAt)}{" "}
                    — confira o recebimento no seu banco.
                  </span>
                  <form action={markPixReservationPaid}>
                    <input type="hidden" name="requestId" value={quoteRequest.id} />
                    {returnTo ? (
                      <input type="hidden" name="returnTo" value={returnTo} />
                    ) : null}
                    <button
                      type="submit"
                      className="inline-flex min-h-8 w-full items-center justify-center rounded-md bg-leaf px-3 text-xs font-semibold text-white transition hover:bg-leaf-hover sm:w-auto"
                    >
                      Confirmar recebimento
                    </button>
                  </form>
                </div>
              ) : isPixPaymentExpired(quoteRequest.pixReservationRequestedAt) ? (
                <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2">
                  <span className="text-xs font-semibold text-red-700">
                    Pix expirado — o cliente não realizou o pagamento no prazo.
                  </span>
                  <p className="mt-1 text-xs text-ink-muted">
                    Gere um novo prazo de 48h para o cliente pagar, ou encerre
                    o pedido via alteração de status.
                  </p>
                  <form action={reopenPixReservation} className="mt-2">
                    <input type="hidden" name="requestId" value={quoteRequest.id} />
                    {returnTo ? (
                      <input type="hidden" name="returnTo" value={returnTo} />
                    ) : null}
                    <button
                      type="submit"
                      className="inline-flex min-h-8 items-center justify-center rounded-md border border-leaf bg-white px-3 text-xs font-semibold text-leaf transition hover:bg-mint"
                    >
                      Gerar novo prazo
                    </button>
                  </form>
                </div>
              ) : (
                <div className="mt-3 flex flex-col items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 sm:flex-row sm:items-center">
                  <span className="text-xs font-semibold text-amber-700">
                    Aguardando confirmação do Pix
                  </span>
                  <form action={markPixReservationPaid}>
                    <input type="hidden" name="requestId" value={quoteRequest.id} />
                    {returnTo ? (
                      <input type="hidden" name="returnTo" value={returnTo} />
                    ) : null}
                    <button
                      type="submit"
                      className="inline-flex min-h-8 w-full items-center justify-center rounded-md bg-leaf px-3 text-xs font-semibold text-white transition hover:bg-leaf-hover sm:w-auto"
                    >
                      Confirmar recebimento
                    </button>
                  </form>
                </div>
              )}
            </div>
          ) : null}
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
                {editingNoteId === note.id ? (
                  <form action={updateQuoteRequestNote} onSubmit={() => setEditingNoteId(null)}>
                    <input type="hidden" name="noteId" value={note.id} />
                    {returnTo ? (
                      <input type="hidden" name="returnTo" value={returnTo} />
                    ) : null}
                    <CharCountTextarea
                      name="content"
                      defaultValue={note.content}
                      maxLength={1000}
                      required
                      className="min-h-20 w-full rounded-md border border-paper-soft bg-white px-3 py-3 text-sm text-ink outline-none focus:border-leaf"
                    />
                    <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                      <button
                        type="submit"
                        className="inline-flex min-h-9 w-full items-center justify-center rounded-md bg-leaf px-4 text-xs font-semibold text-white transition hover:bg-leaf-hover sm:w-auto"
                      >
                        Salvar
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingNoteId(null)}
                        className="inline-flex min-h-9 w-full items-center justify-center rounded-md border border-paper-soft bg-white px-4 text-xs font-semibold text-ink transition hover:border-stone-300 sm:w-auto"
                      >
                        Cancelar
                      </button>
                    </div>
                  </form>
                ) : (
                  <>
                    <p className="max-h-36 overflow-auto whitespace-pre-line break-words text-sm leading-6 text-ink">
                      {note.content}
                    </p>
                    <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <span className="break-words text-xs text-ink-muted">
                        {note.author.name ?? note.author.email ?? "Profissional"} ·{" "}
                        {formatDate(note.createdAt)}
                      </span>
                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={() => setEditingNoteId(note.id)}
                          className="text-xs font-semibold text-leaf transition hover:underline"
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => setNoteToDelete(note.id)}
                          className="text-xs font-semibold text-red-500 transition hover:text-red-700"
                        >
                          Excluir
                        </button>
                      </div>
                    </div>
                  </>
                )}
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
          {returnTo ? (
            <input type="hidden" name="returnTo" value={returnTo} />
          ) : null}
          <label
            className="text-xs font-semibold uppercase tracking-widest text-ink-muted"
            htmlFor={`note-${quoteRequest.id}`}
          >
            Nova nota interna
          </label>
          <CharCountTextarea
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

      <ConfirmModal
        open={noteToDelete !== null}
        title="Excluir nota"
        description="Esta nota será removida permanentemente. Esta ação não pode ser desfeita."
        eyebrow="Notas internas"
        confirmLabel="Excluir"
        cancelLabel="Cancelar"
        variant="danger"
        pending={deletePending}
        pendingLabel="Excluindo..."
        onClose={() => setNoteToDelete(null)}
        onConfirm={() => {
          if (!noteToDelete) return;
          const id = noteToDelete;
          setNoteToDelete(null);
          startDeleteTransition(async () => {
            const formData = new FormData();
            formData.set("noteId", id);
            if (returnTo) formData.set("returnTo", returnTo);
            await deleteQuoteRequestNote(formData);
          });
        }}
      />
    </div>
  );
}
