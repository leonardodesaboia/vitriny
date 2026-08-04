"use client";

import { useEffect } from "react";
import { initMercadoPago, CardPayment } from "@mercadopago/sdk-react";
import type { ICardPaymentFormData, ICardPaymentBrickPayer } from "@mercadopago/sdk-react/esm/bricks/cardPayment/type";
import { createMpCardSubscription } from "@/lib/actions/mp-billing";

type Props = {
  amount: number;
  payerEmail: string;
  onClose: () => void;
  onSuccess: () => void;
  onError: (message: string) => void;
  // Reativar não "descancela" a preapproval antiga (isso é terminal no MP):
  // cria uma nova, com cobrança imediata. O texto muda para deixar isso claro.
  mode?: "subscribe" | "reactivate";
};

export function MpSubscriptionModal({
  amount,
  payerEmail,
  onClose,
  onSuccess,
  onError,
  mode = "subscribe"
}: Props) {
  const isReactivation = mode === "reactivate";
  useEffect(() => {
    initMercadoPago(process.env.NEXT_PUBLIC_MP_PUBLIC_KEY!, { locale: "pt-BR" });
  }, []);

  async function handleSubmit(formData: ICardPaymentFormData<ICardPaymentBrickPayer>) {
    try {
      const submittedEmail = formData.payer.email?.trim() || payerEmail;
      const result = await createMpCardSubscription(formData.token, submittedEmail);
      if ("error" in result) {
        onError(result.error);
        return;
      }
      onSuccess();
    } catch {
      onError("Não foi possível processar o pagamento. Tente novamente.");
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-2 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="my-auto max-h-[calc(100dvh-1rem)] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-4 shadow-xl sm:max-h-[calc(100dvh-2rem)] sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-fraunces text-xl font-bold text-ink">
            {isReactivation ? "Reativar assinatura PRO" : "Assinar PRO"}
          </h3>
          <button
            onClick={onClose}
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md text-2xl text-ink-muted transition hover:bg-paper hover:text-ink"
            aria-label="Fechar"
          >
            ×
          </button>
        </div>
        {isReactivation ? (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
            <p className="text-sm text-amber-900">
              Reativar cria uma assinatura nova: você é cobrado por um novo ciclo
              agora e os dias que restavam do período já pago não são
              aproveitados.
            </p>
          </div>
        ) : null}
        <CardPayment
          initialization={{ amount, payer: { email: payerEmail } }}
          onSubmit={handleSubmit}
          onError={() => onError("Não foi possível validar o cartão. Tente novamente.")}
        />
      </div>
    </div>
  );
}
