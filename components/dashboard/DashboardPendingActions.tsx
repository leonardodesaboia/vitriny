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

  if (visibleActions.length === 0) {
    return (
      <section
        aria-label="Status das pendências"
        className="mt-8 rounded-xl border border-mint bg-mint/40 px-5 py-4 sm:px-6"
      >
        <div className="flex items-start gap-3">
          <span
            aria-hidden="true"
            className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-leaf text-white"
          >
            <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none">
              <path
                d="m3.5 8.5 2.7 2.7 6.3-6.4"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.8"
              />
            </svg>
          </span>
          <div>
            <h2 className="text-sm font-semibold text-ink">Tudo em dia</h2>
            <p className="mt-0.5 text-xs leading-5 text-ink-muted">
              Não há pedidos ou propostas aguardando sua ação agora.
            </p>
          </div>
        </div>
      </section>
    );
  }

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
