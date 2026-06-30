"use client";

import { useState } from "react";
import {
  CheckoutElementsProvider,
  useCheckoutElements,
  PaymentElement
} from "@stripe/react-stripe-js/checkout";
import type { Appearance } from "@stripe/stripe-js";
import { stripePromise } from "@/lib/stripe-client";

const appearance: Appearance = {
  theme: "stripe",
  variables: {
    colorPrimary: "#1B5E3B",
    colorBackground: "#FFFFFF",
    colorText: "#1C1917",
    colorDanger: "#DC2626",
    colorTextPlaceholder: "#78716C",
    colorTextSecondary: "#78716C",
    fontFamily: "var(--font-brand-body), system-ui, sans-serif",
    fontSizeBase: "14px",
    spacingUnit: "4px",
    borderRadius: "6px"
  },
  rules: {
    ".Input": {
      border: "1px solid #EDE8DE",
      boxShadow: "none",
      transition: "border-color 0.15s ease, box-shadow 0.15s ease"
    },
    ".Input:focus": {
      border: "1px solid #1B5E3B",
      boxShadow: "0 0 0 3px rgba(27,94,59,0.12)",
      outline: "none"
    },
    ".Input:hover": {
      borderColor: "#2D7A52"
    },
    ".Label": {
      fontWeight: "500",
      fontSize: "12px",
      color: "#1C1917",
      marginBottom: "6px"
    },
    ".Tab": {
      border: "1px solid #EDE8DE",
      borderRadius: "6px",
      padding: "10px 16px",
      boxShadow: "none",
      transition: "border-color 0.15s ease"
    },
    ".Tab:hover": {
      borderColor: "#2D7A52",
      color: "#1B5E3B"
    },
    ".Tab--selected": {
      borderColor: "#1B5E3B",
      backgroundColor: "#D4EBD9",
      color: "#1B5E3B",
      boxShadow: "none"
    },
    ".Tab--selected:focus": {
      boxShadow: "0 0 0 3px rgba(27,94,59,0.18)"
    },
    ".TabIcon--selected": {
      fill: "#1B5E3B"
    },
    ".TabLabel--selected": {
      color: "#1B5E3B",
      fontWeight: "600"
    },
    ".Error": {
      fontSize: "12px",
      color: "#DC2626"
    },
    ".Block": {
      borderRadius: "6px",
      backgroundColor: "#F5F0E8"
    },
    ".AccordionItem": {
      borderRadius: "6px",
      border: "1px solid #EDE8DE"
    },
    ".AccordionItem--selected": {
      borderColor: "#1B5E3B",
      backgroundColor: "#F5F0E8"
    }
  }
};

const elementsOptions = {
  appearance,
  fonts: [
    {
      cssSrc:
        "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600&display=swap"
    }
  ]
};

type SubscriptionModalProps = {
  clientSecret: string;
  onClose: () => void;
  onSuccess: () => void;
};

function PaymentForm({
  onClose,
  onSuccess
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const checkoutState = useCheckoutElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (checkoutState.type !== "success") return;

    setLoading(true);
    setError(null);

    const result = await checkoutState.checkout.confirm();

    if (result.type === "error") {
      setError(result.error.message ?? "Erro ao processar pagamento.");
      setLoading(false);
      return;
    }

    // For async methods (Pix), keep modal open so QR code stays visible.
    // For card, payment is done — user clicks Fechar to trigger router.refresh().
    setLoading(false);
    setConfirmed(true);
  }

  return (
    <form onSubmit={handleSubmit}>
      <PaymentElement />
      {error ? (
        <p className="mt-3 text-xs font-semibold text-red-700">{error}</p>
      ) : null}
      {confirmed ? (
        <>
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
            <p className="text-sm font-semibold text-amber-800">
              Pagamento iniciado. Se escolheu Pix, escaneie o QR code acima. O
              plano PRO será ativado automaticamente após a confirmação.
            </p>
          </div>
          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={onSuccess}
              className="inline-flex min-h-9 items-center justify-center rounded-md border border-paper-soft bg-white px-4 text-xs font-semibold text-ink-muted transition hover:border-leaf hover:text-leaf"
            >
              Fechar
            </button>
          </div>
        </>
      ) : (
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="inline-flex min-h-9 items-center justify-center rounded-md border border-paper-soft bg-white px-4 text-xs font-semibold text-ink-muted transition hover:border-leaf hover:text-leaf disabled:opacity-60"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={
              loading ||
              checkoutState.type !== "success" ||
              !checkoutState.checkout.canConfirm
            }
            className="inline-flex min-h-9 items-center justify-center rounded-md bg-leaf px-5 text-xs font-semibold text-white transition hover:bg-leaf-hover disabled:opacity-60"
          >
            {loading ? "Processando..." : "Confirmar assinatura"}
          </button>
        </div>
      )}
    </form>
  );
}

export function SubscriptionModal({
  clientSecret,
  onClose,
  onSuccess
}: SubscriptionModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="subscription-modal-title"
        tabIndex={-1}
        onKeyDown={(e) => e.key === "Escape" && onClose()}
        className="w-full max-w-md rounded-xl border border-paper-soft bg-white p-6 shadow-card"
      >
        <div className="mb-5 flex items-center justify-between">
          <h2
            id="subscription-modal-title"
            className="font-fraunces text-xl font-bold text-ink"
          >
            Assinar plano PRO
          </h2>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-md text-ink-muted transition hover:bg-paper hover:text-ink"
            aria-label="Fechar"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
        <CheckoutElementsProvider
          stripe={stripePromise}
          options={{ clientSecret, elementsOptions }}
        >
          <PaymentForm onClose={onClose} onSuccess={onSuccess} />
        </CheckoutElementsProvider>
      </div>
    </div>
  );
}
