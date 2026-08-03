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
};

export function MpSubscriptionModal({ amount, payerEmail, onClose, onSuccess, onError }: Props) {
  useEffect(() => {
    initMercadoPago(process.env.NEXT_PUBLIC_MP_PUBLIC_KEY!, { locale: "pt-BR" });
  }, []);

  async function handleSubmit(formData: ICardPaymentFormData<ICardPaymentBrickPayer>) {
    const result = await createMpCardSubscription(formData.token, payerEmail);
    if ("error" in result) {
      onError(result.error);
      return;
    }
    onSuccess();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-fraunces text-xl font-bold text-ink">Assinar PRO</h3>
          <button onClick={onClose} className="text-ink-muted hover:text-ink" aria-label="Fechar">
            ×
          </button>
        </div>
        <CardPayment
          initialization={{ amount }}
          onSubmit={handleSubmit}
          onError={() => onError("Não foi possível validar o cartão. Tente novamente.")}
        />
      </div>
    </div>
  );
}
