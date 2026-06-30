import Link from "next/link";

import type {
  DashboardActivity,
  DashboardActivityType
} from "@/lib/dashboard";

type DashboardRecentActivityProps = {
  activities: DashboardActivity[];
};

const activityDotClasses: Record<DashboardActivityType, string> = {
  PIX_RESERVATION_PAID: "bg-leaf",
  PROPOSAL_APPROVED: "bg-leaf",
  PROPOSAL_DEPOSIT_PAID: "bg-leaf",
  PROPOSAL_REJECTED: "bg-red-500",
  PROPOSAL_SENT: "bg-blue-500",
  QUOTE_REQUEST_CREATED: "bg-amber-500"
};

function formatActivityDate(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(date);
}

export function DashboardRecentActivity({
  activities
}: DashboardRecentActivityProps) {
  if (activities.length === 0) return null;

  return (
    <section className="mt-8 rounded-xl border border-paper-soft bg-white p-5 shadow-card sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-leaf">
            Atividade recente
          </p>
          <h2 className="mt-2 font-fraunces text-xl font-bold text-ink">
            Últimas movimentações
          </h2>
        </div>
        <Link
          className="text-xs font-semibold text-leaf underline-offset-4 hover:underline"
          href="/dashboard/pedidos"
        >
          Ver todos os pedidos
        </Link>
      </div>

      <ol className="mt-5 divide-y divide-paper-soft">
        {activities.map((activity) => (
          <li className="flex gap-3 py-3 first:pt-0 last:pb-0" key={activity.id}>
            <span
              aria-hidden="true"
              className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${activityDotClasses[activity.type]}`}
            />
            <div className="flex min-w-0 flex-1 flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-ink">{activity.title}</p>
                <p className="truncate text-xs text-ink-muted">
                  Cliente: {activity.customerName}
                </p>
              </div>
              <time
                className="shrink-0 text-xs text-ink-muted"
                dateTime={activity.occurredAt.toISOString()}
              >
                {formatActivityDate(activity.occurredAt)}
              </time>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
