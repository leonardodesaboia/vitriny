"use client";

import { useState, useTransition } from "react";
import { confirmProPixPayment } from "@/lib/actions/admin-pix-payments";

export function ConfirmProPixPaymentButton({ paymentId }: { paymentId: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  function handleConfirm() {
    setError(null);
    startTransition(async () => {
      const result = await confirmProPixPayment(paymentId);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setConfirmed(true);
    });
  }

  if (confirmed) {
    return <span className="text-xs font-semibold text-leaf">Confirmado</span>;
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={handleConfirm}
        disabled={pending}
        className="inline-flex min-h-8 items-center justify-center rounded-md bg-leaf px-3 text-xs font-semibold text-white transition hover:bg-leaf-hover disabled:opacity-60"
      >
        {pending ? "Confirmando..." : "Confirmar"}
      </button>
      {error ? <p className="text-xs font-semibold text-red-700">{error}</p> : null}
    </div>
  );
}
