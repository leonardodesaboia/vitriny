"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { PlanTier, SubscriptionStatus } from "@prisma/client";
import {
  createCheckoutSession,
  cancelSubscription,
  reactivateSubscription,
  createSetupIntent
} from "@/lib/actions/billing";
import { PLAN_NAMES } from "@/lib/plan-limits";
import { SubscriptionModal } from "@/components/billing/SubscriptionModal";
import { UpdatePaymentModal } from "@/components/billing/UpdatePaymentModal";
import { ConfirmModal } from "@/components/ui/ConfirmModal";

const STATUS_LABELS: Record<SubscriptionStatus, string> = {
  ACTIVE: "Ativa",
  TRIALING: "Em período de teste",
  PAST_DUE: "Pagamento pendente",
  CANCELED: "Cancelada",
  INCOMPLETE: "Aguardando pagamento inicial",
  INCOMPLETE_EXPIRED: "Expirada",
  UNPAID: "Não paga",
  PAUSED: "Pausada"
};

type BillingCardProps = {
  plan: PlanTier;
  subscriptionStatus: SubscriptionStatus | null;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
};

export function BillingCard({
  plan,
  subscriptionStatus,
  currentPeriodEnd,
  cancelAtPeriodEnd
}: BillingCardProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Subscription checkout modal
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  // Cancel confirmation inline state
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  // Card update modal
  const [setupClientSecret, setSetupClientSecret] = useState<string | null>(null);
  const [showCardSuccess, setShowCardSuccess] = useState(false);

  function handleSubscribe() {
    setError(null);
    startTransition(async () => {
      const result = await createCheckoutSession();
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setClientSecret(result.clientSecret);
    });
  }

  function handleConfirmCancel() {
    setError(null);
    startTransition(async () => {
      const result = await cancelSubscription();
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setShowCancelConfirm(false);
      router.refresh();
    });
  }

  function handleReactivate() {
    setError(null);
    startTransition(async () => {
      const result = await reactivateSubscription();
      if ("error" in result) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  function handleUpdateCard() {
    setError(null);
    startTransition(async () => {
      const result = await createSetupIntent();
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setSetupClientSecret(result.clientSecret);
    });
  }

  function handleModalClose() {
    setClientSecret(null);
  }

  function handleSuccess() {
    setClientSecret(null);
    setShowSuccess(true);
    router.refresh();
  }

  function handleCardModalClose() {
    setSetupClientSecret(null);
  }

  function handleCardSuccess() {
    setSetupClientSecret(null);
    setShowCardSuccess(true);
    router.refresh();
  }

  const periodEndLabel = currentPeriodEnd
    ? currentPeriodEnd.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "long",
        year: "numeric"
      })
    : null;

  return (
    <>
      {clientSecret ? (
        <SubscriptionModal
          clientSecret={clientSecret}
          onClose={handleModalClose}
          onSuccess={handleSuccess}
        />
      ) : null}

      {setupClientSecret ? (
        <UpdatePaymentModal
          clientSecret={setupClientSecret}
          onClose={handleCardModalClose}
          onSuccess={handleCardSuccess}
        />
      ) : null}

      <ConfirmModal
        open={showCancelConfirm}
        eyebrow="Cancelar assinatura"
        title="Confirmar cancelamento do PRO?"
        description={
          <p>
            Você mantém o acesso ao plano PRO até{" "}
            <span className="font-semibold text-ink">
              {periodEndLabel ?? "o final do período atual"}
            </span>
            . Depois disso, sua conta volta para o plano FREE.
          </p>
        }
        confirmLabel="Confirmar cancelamento"
        cancelLabel="Manter assinatura"
        pending={pending}
        pendingLabel="Cancelando..."
        variant="danger"
        onClose={() => setShowCancelConfirm(false)}
        onConfirm={handleConfirmCancel}
      />

      <section className="rounded-xl border border-paper-soft bg-white p-6 shadow-card">
        {showSuccess ? (
          <div className="mb-5 rounded-lg border border-green-200 bg-green-50 px-4 py-3">
            <p className="text-sm font-semibold text-green-800">
              Assinatura realizada com sucesso! Seu plano será atualizado em
              instantes.
            </p>
          </div>
        ) : null}

        {showCardSuccess ? (
          <div className="mb-5 rounded-lg border border-green-200 bg-green-50 px-4 py-3">
            <p className="text-sm font-semibold text-green-800">
              Cartão atualizado com sucesso!
            </p>
          </div>
        ) : null}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-leaf">
              Plano atual
            </p>
            <h2 className="mt-2 font-fraunces text-2xl font-bold text-ink">
              {PLAN_NAMES[plan]}
            </h2>
            {subscriptionStatus ? (
              <p className="mt-1 text-sm text-ink-muted">
                Assinatura: {STATUS_LABELS[subscriptionStatus]}
              </p>
            ) : null}
            {currentPeriodEnd && plan === "PRO" ? (
              cancelAtPeriodEnd ? (
                <p className="mt-1 text-sm font-medium text-amber-700">
                  Cancela em {periodEndLabel}
                </p>
              ) : (
                <p className="mt-1 text-sm text-ink-muted">
                  Renova em {periodEndLabel}
                </p>
              )
            ) : null}
          </div>

          <div className="flex w-full flex-col items-start gap-2 sm:w-auto">
            {plan === "PRO" ? (
              <>
                {cancelAtPeriodEnd ? (
                  <button
                    onClick={handleReactivate}
                    disabled={pending}
                    className="inline-flex min-h-9 items-center justify-center rounded-md bg-leaf px-5 text-xs font-semibold text-white transition hover:bg-leaf-hover disabled:opacity-60"
                  >
                    {pending ? "Aguarde..." : "Reativar assinatura"}
                  </button>
                ) : (
                  <button
                    onClick={() => setShowCancelConfirm(true)}
                    disabled={pending}
                    className="inline-flex min-h-9 w-full items-center justify-center rounded-md border border-red-300 bg-white px-5 text-xs font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-60 sm:w-44"
                  >
                    Cancelar assinatura
                  </button>
                )}

                <button
                  onClick={handleUpdateCard}
                  disabled={pending}
                  className="inline-flex min-h-9 w-full items-center justify-center rounded-md border border-paper-soft bg-white px-5 text-xs font-semibold text-ink transition hover:border-leaf hover:text-leaf disabled:opacity-60 sm:w-44"
                >
                  {pending ? "Aguarde..." : "Atualizar cartão"}
                </button>
              </>
            ) : (
              <button
                onClick={handleSubscribe}
                disabled={pending}
                className="inline-flex min-h-9 items-center justify-center rounded-md bg-leaf px-5 text-xs font-semibold text-white transition hover:bg-leaf-hover disabled:opacity-60"
              >
                {pending ? "Aguarde..." : "Assinar PRO"}
              </button>
            )}

            {error ? (
              <p className="text-xs font-semibold text-red-700">{error}</p>
            ) : null}
          </div>
        </div>

        {plan === "FREE" ? (
          <div className="mt-5 rounded-lg border border-paper-soft bg-paper p-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-ink-muted">
              Plano PRO inclui
            </p>
            <ul className="mt-3 grid gap-2 text-sm text-ink sm:grid-cols-2">
              <li className="flex items-center gap-2">
                <span className="text-leaf">✓</span> Itens ativos ilimitados
              </li>
              <li className="flex items-center gap-2">
                <span className="text-leaf">✓</span> Pedidos ilimitados por mês
              </li>
              <li className="flex items-center gap-2">
                <span className="text-leaf">✓</span> Propostas ilimitadas por mês
              </li>
              <li className="flex items-center gap-2">
                <span className="text-leaf">✓</span> Templates ilimitados
              </li>
            </ul>
          </div>
        ) : null}
      </section>
    </>
  );
}
