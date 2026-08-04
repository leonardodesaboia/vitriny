"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { CopyButton } from "@/components/ui/CopyButton";
import { getMpPixPaymentStatus } from "@/lib/actions/mp-billing";

type Props = {
  qrCode: string;
  qrCodeBase64: string;
  paymentId: string;
  expiresAt: string;
  onClose: () => void;
  onRegenerate: () => void;
};

function formatRemaining(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(total / 60)}:${(total % 60).toString().padStart(2, "0")}`;
}

export function MpPixPaymentModal({
  qrCode,
  qrCodeBase64,
  paymentId,
  expiresAt,
  onClose,
  onRegenerate
}: Props) {
  const router = useRouter();
  const expiryMs = new Date(expiresAt).getTime();
  const [status, setStatus] = useState<"pending" | "confirmed" | "expired">("pending");
  const [remaining, setRemaining] = useState(() => expiryMs - Date.now());
  const confirmedRef = useRef(false);

  useEffect(() => {
    if (status !== "pending") return;
    const interval = setInterval(async () => {
      const result = await getMpPixPaymentStatus(paymentId);
      if ("error" in result) return;
      if (result.status === "confirmed" && !confirmedRef.current) {
        confirmedRef.current = true;
        setStatus("confirmed");
        router.refresh();
      } else if (result.status === "expired") {
        setStatus("expired");
      }
    }, 4000);
    return () => clearInterval(interval);
  }, [status, paymentId, router]);

  useEffect(() => {
    if (status !== "pending") return;
    const tick = setInterval(() => {
      const left = expiryMs - Date.now();
      setRemaining(left);
      if (left <= 0) setStatus("expired");
    }, 1000);
    return () => clearInterval(tick);
  }, [status, expiryMs]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="mp-pix-modal-title"
        tabIndex={-1}
        onKeyDown={(event) => event.key === "Escape" && onClose()}
        className="w-full max-w-md rounded-xl border border-paper-soft bg-white p-6 shadow-card"
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 id="mp-pix-modal-title" className="font-fraunces text-xl font-bold text-ink">
            Pagar 1 mês via Pix
          </h2>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="flex h-8 w-8 items-center justify-center rounded-md text-ink-muted transition hover:bg-paper hover:text-ink"
          >
            ×
          </button>
        </div>
        {status === "confirmed" ? (
          <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3">
            <p className="text-sm font-semibold text-green-800">
              Pagamento confirmado! Seu plano PRO já está ativo.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-4 inline-flex min-h-9 items-center justify-center rounded-md bg-leaf px-4 text-xs font-semibold text-white"
            >
              Fechar
            </button>
          </div>
        ) : status === "expired" ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
            <p className="text-sm font-semibold text-amber-800">
              O QR expirou. Gere um novo Pix para pagar.
            </p>
            <button
              type="button"
              onClick={onRegenerate}
              className="mt-4 inline-flex min-h-9 items-center justify-center rounded-md bg-leaf px-4 text-xs font-semibold text-white"
            >
              Gerar novo Pix
            </button>
          </div>
        ) : (
          <>
            <Image
              alt="QR Code Pix para pagamento da assinatura PRO"
              className="mx-auto h-auto w-full max-w-[280px] rounded-lg bg-white"
              height={280}
              src={`data:image/png;base64,${qrCodeBase64}`}
              unoptimized
              width={280}
            />
            <p className="mt-3 text-center text-xs text-ink-muted">
              Expira em <span className="font-semibold text-ink">{formatRemaining(remaining)}</span> · a
              confirmação aparece aqui automaticamente
            </p>
            <div className="mt-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-ink-muted">
                Código Pix copia e cola
              </p>
              <code className="mt-1.5 block max-h-28 overflow-auto break-all rounded-lg border border-paper-soft bg-paper px-3 py-2 text-xs leading-5 text-ink">
                {qrCode}
              </code>
              <div className="mt-2">
                <CopyButton
                  text={qrCode}
                  label="Copiar código Pix"
                  className="inline-flex min-h-8 items-center justify-center rounded-md bg-leaf px-3 text-xs font-semibold text-white"
                />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
