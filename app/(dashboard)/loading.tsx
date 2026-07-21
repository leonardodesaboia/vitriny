// Skeleton exibido durante a navegação entre páginas do dashboard.
// Ver docs/UX_UI_AUDIT.md P8.
export default function DashboardLoading() {
  return (
    <div className="min-w-0 p-4 sm:p-6 md:p-8" aria-busy="true">
      <div className="animate-pulse space-y-6">
        <div className="space-y-3">
          <div className="h-3 w-24 rounded bg-paper-soft" />
          <div className="h-9 w-56 rounded bg-paper-soft" />
          <div className="h-4 w-72 rounded bg-paper-soft" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-24 rounded-xl border border-paper-soft bg-white"
            />
          ))}
        </div>
        <div className="h-40 rounded-xl border border-paper-soft bg-white" />
      </div>
      <span className="sr-only">Carregando…</span>
    </div>
  );
}
