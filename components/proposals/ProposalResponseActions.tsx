"use client";

import { useState, useTransition } from "react";

import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { respondToProposal } from "@/lib/actions/proposal-response";
import type { ProposalResponse } from "@/types";

type ProposalResponseActionsProps = {
  publicToken: string;
  totalAmountDisplay: string;
};

export function ProposalResponseActions({
  publicToken,
  totalAmountDisplay
}: ProposalResponseActionsProps) {
  const [confirming, setConfirming] = useState<ProposalResponse | null>(null);
  const [pending, startTransition] = useTransition();

  function handleConfirm() {
    if (!confirming) return;
    const response = confirming;
    startTransition(async () => {
      await respondToProposal(publicToken, response);
    });
  }

  return (
    <>
      <ConfirmModal
        open={confirming === "APPROVED"}
        eyebrow="Aprovar proposta"
        title="Confirmar aprovação?"
        description={
          <p>
            Você está aprovando esta proposta no valor de{" "}
            <span className="font-semibold text-ink">{totalAmountDisplay}</span>
            . O negócio será avisado e a decisão não poderá ser desfeita por
            aqui.
          </p>
        }
        confirmLabel="Aprovar proposta"
        cancelLabel="Voltar"
        pending={pending}
        pendingLabel="Aprovando..."
        variant="primary"
        onClose={() => setConfirming(null)}
        onConfirm={handleConfirm}
      />

      <ConfirmModal
        open={confirming === "REJECTED"}
        eyebrow="Recusar proposta"
        title="Confirmar recusa?"
        description={
          <p>
            Você está recusando esta proposta. O negócio será avisado e a
            decisão não poderá ser desfeita por aqui.
          </p>
        }
        confirmLabel="Recusar proposta"
        cancelLabel="Voltar"
        pending={pending}
        pendingLabel="Recusando..."
        variant="danger"
        onClose={() => setConfirming(null)}
        onConfirm={handleConfirm}
      />

      <div className="mt-8 flex flex-col gap-3 border-t border-paper-soft pt-6 sm:flex-row">
        <button
          className="inline-flex min-h-11 flex-1 items-center justify-center rounded-md bg-leaf px-5 text-sm font-semibold text-white transition hover:bg-leaf-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber focus-visible:ring-offset-2 disabled:opacity-60"
          disabled={pending}
          onClick={() => setConfirming("APPROVED")}
          type="button"
        >
          Aprovar proposta
        </button>
        <button
          className="inline-flex min-h-11 flex-1 items-center justify-center rounded-md border border-paper-soft bg-white px-5 text-sm font-semibold text-ink transition hover:border-red-300 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber focus-visible:ring-offset-2 disabled:opacity-60"
          disabled={pending}
          onClick={() => setConfirming("REJECTED")}
          type="button"
        >
          Recusar proposta
        </button>
      </div>
    </>
  );
}
