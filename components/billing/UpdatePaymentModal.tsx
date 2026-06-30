"use client";

import { useState } from "react";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements
} from "@stripe/react-stripe-js";
import type { Appearance } from "@stripe/stripe-js";
import { stripePromise } from "@/lib/stripe-client";
import { setDefaultPaymentMethod } from "@/lib/actions/billing";

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
    ".Input:hover": { borderColor: "#2D7A52" },
    ".Label": {
      fontWeight: "500",
      fontSize: "12px",
      color: "#1C1917",
      marginBottom: "6px"
    }
  }
};

type UpdatePaymentModalProps = {
  clientSecret: string;
  onClose: () => void;
  onSuccess: () => void;
};

function CardForm({
  onClose,
  onSuccess
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;

    setLoading(true);
    setError(null);

    const result = await stripe.confirmSetup({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/dashboard/billing`
      },
      redirect: "if_required"
    });

    if (result.error) {
      setError(result.error.message ?? "Erro ao atualizar cartão.");
      setLoading(false);
      return;
    }

    const pm = result.setupIntent?.payment_method;
    const paymentMethodId = typeof pm === "string" ? pm : pm?.id ?? null;

    if (!paymentMethodId) {
      setError("Não foi possível identificar o método de pagamento.");
      setLoading(false);
      return;
    }

    const actionResult = await setDefaultPaymentMethod(paymentMethodId);

    if ("error" in actionResult) {
      setError(actionResult.error);
      setLoading(false);
      return;
    }

    onSuccess();
  }

  return (
    <form onSubmit={handleSubmit}>
      <PaymentElement />
      {error ? (
        <p className="mt-3 text-xs font-semibold text-red-700">{error}</p>
      ) : null}
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
          disabled={loading || !stripe || !elements}
          className="inline-flex min-h-9 items-center justify-center rounded-md bg-leaf px-5 text-xs font-semibold text-white transition hover:bg-leaf-hover disabled:opacity-60"
        >
          {loading ? "Salvando..." : "Salvar cartão"}
        </button>
      </div>
    </form>
  );
}

export function UpdatePaymentModal({
  clientSecret,
  onClose,
  onSuccess
}: UpdatePaymentModalProps) {
  const options = {
    clientSecret,
    appearance,
    fonts: [
      {
        cssSrc:
          "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600&display=swap"
      }
    ]
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="update-payment-modal-title"
        tabIndex={-1}
        onKeyDown={(e) => e.key === "Escape" && onClose()}
        className="w-full max-w-md rounded-xl border border-paper-soft bg-white p-6 shadow-card"
      >
        <div className="mb-5 flex items-center justify-between">
          <h2
            id="update-payment-modal-title"
            className="font-fraunces text-xl font-bold text-ink"
          >
            Atualizar cartão
          </h2>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="flex h-8 w-8 items-center justify-center rounded-md text-ink-muted transition hover:bg-paper hover:text-ink"
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
        <Elements stripe={stripePromise} options={options}>
          <CardForm onClose={onClose} onSuccess={onSuccess} />
        </Elements>
      </div>
    </div>
  );
}
