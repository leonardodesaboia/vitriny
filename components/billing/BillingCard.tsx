"use client";

import { useState, useTransition } from "react";
import type { PlanTier, SubscriptionStatus } from "@prisma/client";
import { createCheckoutSession } from "@/lib/actions/billing";
import { PLAN_NAMES } from "@/lib/plan-limits";

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
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubscribe() {
    setError(null);
    startTransition(async () => {
      const result = await createCheckoutSession();
      if (result?.error) {
        setError(result.error);
      }
    });
  }

  return (
    <section className="rounded-xl border border-paper-soft bg-white p-6 shadow-card">
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
  );
}
