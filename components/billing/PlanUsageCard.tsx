import type { PlanTier } from "@prisma/client";

import {
  formatUsage,
  hasReachedLimit,
  isNearLimit,
  PLAN_LIMIT_LABELS,
  PLAN_NAMES,
  type LimitedResource
} from "@/lib/plan-limits";

type PlanUsageItem = {
  current: number;
  limit: number | null;
  resource: LimitedResource;
};

type PlanUsageCardProps = {
  plan: PlanTier;
  usage: PlanUsageItem[];
};

export function PlanUsageCard({ plan, usage }: PlanUsageCardProps) {
  return (
    <section className="mt-8 rounded-xl border border-paper-soft bg-white p-6 shadow-card">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-leaf">
            Plano atual
          </p>
          <h2 className="mt-2 font-fraunces text-2xl font-bold text-ink">
            {PLAN_NAMES[plan]}
          </h2>
        </div>
        {plan === "FREE" ? (
          <p className="rounded-full bg-paper px-3 py-1 text-xs font-semibold text-ink-muted">
            Preparado para upgrade futuro
          </p>
        ) : null}
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-4">
        {usage.map((item) => {
          const reached = hasReachedLimit(item.current, item.limit);
          const near = isNearLimit(item.current, item.limit);

          return (
            <div
              className="rounded-lg border border-paper-soft bg-paper p-4"
              key={item.resource}
            >
              <p className="text-xs font-semibold uppercase tracking-widest text-ink-muted">
                {PLAN_LIMIT_LABELS[item.resource]}
              </p>
              <p className="mt-2 font-fraunces text-2xl font-bold text-ink">
                {formatUsage(item.current, item.limit)}
              </p>
              {reached ? (
                <p className="mt-2 text-xs font-semibold text-red-700">
                  Limite atingido
                </p>
              ) : near ? (
                <p className="mt-2 text-xs font-semibold text-amber">
                  Perto do limite
                </p>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}
