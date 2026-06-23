"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { PlanTier, SubscriptionStatus } from "@prisma/client";
import { createSubscriptionIntent } from "@/lib/actions/billing";
import { PLAN_NAMES } from "@/lib/plan-limits";
import { SubscriptionModal } from "@/components/billing/SubscriptionModal";

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
};

export function BillingCard({
  plan,
  subscriptionStatus,
  currentPeriodEnd
}: BillingCardProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  function handleSubscribe() {
    setError(null);
    startTransition(async () => {
      const result = await createSubscriptionIntent();
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setClientSecret(result.clientSecret);
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

  return (
    <>
      {clientSecret ? (
        <SubscriptionModal
          clientSecret={clientSecret}
          onClose={handleModalClose}
          onSuccess={handleSuccess}
        />
      ) : null}

      <section className="rounded-xl border border-paper-soft bg-white p-6 shadow-card">
        {showSuccess ? (
          <div className="mb-5 rounded-lg border border-green-200 bg-green-50 px-4 py-3">
            <p className="text-sm font-semibold text-green-800">
              Assinatura realizada com sucesso! Seu plano será atualizado em
              instantes.
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
              <p className="mt-1 text-sm text-ink-muted">
                Renova em{" "}
                {currentPeriodEnd.toLocaleDateString("pt-BR", {
                  day: "2-digit",
                  month: "long",
                  year: "numeric"
                })}
              </p>
            ) : null}
          </div>

          {plan === "FREE" ? (
            <div className="flex flex-col gap-2">
              <button
                onClick={handleSubscribe}
                disabled={pending}
                className="inline-flex min-h-9 items-center justify-center rounded-md bg-leaf px-5 text-xs font-semibold text-white transition hover:bg-leaf-hover disabled:opacity-60"
              >
                {pending ? "Aguarde..." : "Assinar PRO"}
              </button>
              {error ? (
                <p className="text-xs font-semibold text-red-700">{error}</p>
              ) : null}
            </div>
          ) : null}
        </div>

        {plan === "FREE" ? (
          <div className="mt-5 rounded-lg border border-paper-soft bg-paper p-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-ink-muted">
              Plano PRO inclui
            </p>
            <ul className="mt-3 grid gap-2 text-sm text-ink sm:grid-cols-2">
              <li className="flex items-center gap-2">
                <span className="text-leaf">✓</span> Serviços ativos ilimitados
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
