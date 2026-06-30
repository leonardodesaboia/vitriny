import Link from "next/link";

type PendingAction = {
  count: number;
  description: string;
  href: string;
  label: string;
};

type DashboardPendingActionsProps = {
  actions: PendingAction[];
};

export function DashboardPendingActions({
  actions
}: DashboardPendingActionsProps) {
  const visibleActions = actions.filter((action) => action.count > 0);

  if (visibleActions.length === 0) return null;

  return (
    <section className="mt-8 rounded-xl border border-amber-200 bg-amber-50/70 p-5 sm:p-6">
      <p className="text-xs font-semibold uppercase tracking-widest text-amber-800">
        Pendências
      </p>
      <h2 className="mt-2 font-fraunces text-xl font-bold text-ink">
        Ações que precisam da sua atenção
      </h2>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {visibleActions.map((action) => (
          <Link
            className="flex items-center justify-between gap-4 rounded-lg border border-amber-200 bg-white px-4 py-3 transition hover:border-amber-400"
            href={action.href}
            key={action.label}
          >
            <div className="min-w-0">
              <p className="text-sm font-semibold text-ink">{action.label}</p>
              <p className="mt-0.5 text-xs text-ink-muted">
                {action.description}
              </p>
            </div>
            <span className="inline-flex min-w-8 shrink-0 items-center justify-center rounded-full bg-amber-100 px-2 py-1 text-sm font-bold text-amber-800">
              {action.count}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
