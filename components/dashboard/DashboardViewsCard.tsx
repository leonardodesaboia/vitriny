import Link from "next/link";

import { Card } from "@/components/ui/Card";
import type { StorefrontViewsSummary } from "@/lib/dashboard";

type DashboardViewsCardProps = {
  canViewAnalytics: boolean;
  summary: StorefrontViewsSummary;
};

export function DashboardViewsCard({
  canViewAnalytics,
  summary,
}: DashboardViewsCardProps) {
  const hasViews = summary.views7 > 0 || summary.views30 > 0;

  return (
    <Card className="mt-8 p-5 sm:p-6">
      <p className="text-xs font-semibold uppercase tracking-widest text-ink-muted">
        Visitas à vitrine
      </p>
      <p className="mt-2 font-fraunces text-4xl font-bold text-ink">
        {summary.views7}{" "}
        <span className="font-jakarta text-base font-semibold text-ink-muted">
          esta semana
        </span>
      </p>
      <p className="mt-2 text-xs text-ink-muted">{summary.message}</p>
      {!canViewAnalytics && hasViews ? (
        <Link
          className="mt-4 inline-flex min-h-9 items-center justify-center rounded-md border border-paper-soft px-4 text-xs font-semibold text-leaf transition hover:border-leaf hover:bg-mint/40"
          href="/dashboard/billing"
        >
          Ver itens mais vistos no PRO →
        </Link>
      ) : null}
    </Card>
  );
}
