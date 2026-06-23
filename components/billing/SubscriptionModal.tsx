"use client";

import { useState } from "react";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements
} from "@stripe/react-stripe-js";
import { stripePromise } from "@/lib/stripe-client";

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
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;

    setLoading(true);
    setError(null);

    const { error: stripeError } = await stripe.confirmPayment({
      elements,
      confirmParams: {},
      redirect: "if_required"
    });

    if (stripeError) {
      setError(stripeError.message ?? "Erro ao processar pagamento.");
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
          disabled={loading || !stripe}
          className="inline-flex min-h-9 items-center justify-center rounded-md bg-leaf px-5 text-xs font-semibold text-white transition hover:bg-leaf-hover disabled:opacity-60"
        >
          {loading ? "Processando..." : "Confirmar assinatura"}
        </button>
      </div>
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
      <div className="w-full max-w-md rounded-xl border border-paper-soft bg-white p-6 shadow-card">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-fraunces text-xl font-bold text-ink">
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
        <Elements stripe={stripePromise} options={{ clientSecret }}>
          <PaymentForm onClose={onClose} onSuccess={onSuccess} />
        </Elements>
      </div>
    </div>
  );
}
