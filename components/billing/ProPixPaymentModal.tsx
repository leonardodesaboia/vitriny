"use client";

import { useState, useTransition } from "react";
import Image from "next/image";

import { CopyButton } from "@/components/ui/CopyButton";
import { markProPixPaymentClientPaid } from "@/lib/actions/billing";

type ProPixPaymentModalProps = {
  copyPasteCode: string;
  qrCodeDataUrl: string;
  paymentId: string;
  onClose: () => void;
  onConfirmed: () => void;
};

export function ProPixPaymentModal({
  copyPasteCode,
  qrCodeDataUrl,
  paymentId,
  onClose,
  onConfirmed
}: ProPixPaymentModalProps) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [informed, setInformed] = useState(false);

  function handleMarkPaid() {
    setError(null);
    startTransition(async () => {
      const result = await markProPixPaymentClientPaid(paymentId);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setInformed(true);
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="pro-pix-modal-title"
        tabIndex={-1}
        onKeyDown={(e) => e.key === "Escape" && onClose()}
        className="w-full max-w-md rounded-xl border border-paper-soft bg-white p-6 shadow-card"
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 id="pro-pix-modal-title" className="font-fraunces text-xl font-bold text-ink">
            Pagar 1 mês via Pix
          </h2>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="flex h-8 w-8 items-center justify-center rounded-md text-ink-muted transition hover:bg-paper hover:text-ink"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {informed ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
            <p className="text-sm font-semibold text-amber-800">
              Pagamento informado. O plano PRO será ativado depois da confirmação.
            </p>
            <button
              type="button"
              onClick={onConfirmed}
              className="mt-4 inline-flex min-h-9 items-center justify-center rounded-md bg-leaf px-4 text-xs font-semibold text-white transition hover:bg-leaf-hover"
            >
              Fechar
            </button>
          </div>
        ) : (
          <>
            <Image
              alt="QR Code Pix para pagamento da assinatura PRO"
              className="mx-auto h-auto w-full max-w-[280px] rounded-lg bg-white"
              height={280}
              src={qrCodeDataUrl}
              unoptimized
              width={280}
            />

            <div className="mt-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-ink-muted">
                Código Pix copia e cola
              </p>
              <code className="mt-1.5 block max-h-28 overflow-auto break-all rounded-lg border border-paper-soft bg-paper px-3 py-2 text-xs leading-5 text-ink">
                {copyPasteCode}
              </code>
              <div className="mt-2">
                <CopyButton
                  text={copyPasteCode}
                  label="Copiar código Pix"
                  className="inline-flex min-h-8 items-center justify-center rounded-md bg-leaf px-3 text-xs font-semibold text-white transition hover:bg-leaf-hover"
                />
              </div>
            </div>

            {error ? <p className="mt-3 text-xs font-semibold text-red-700">{error}</p> : null}

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={pending}
                className="inline-flex min-h-9 items-center justify-center rounded-md border border-paper-soft bg-white px-4 text-xs font-semibold text-ink-muted transition hover:border-leaf hover:text-leaf disabled:opacity-60"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleMarkPaid}
                disabled={pending}
                className="inline-flex min-h-9 items-center justify-center rounded-md bg-leaf px-5 text-xs font-semibold text-white transition hover:bg-leaf-hover disabled:opacity-60"
              >
                {pending ? "Enviando..." : "Já paguei"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
