import { Card } from "@/components/ui/Card";
import type { StorefrontViewsSummary } from "@/lib/dashboard";

type DashboardViewsCardProps = {
  summary: StorefrontViewsSummary;
};

export function DashboardViewsCard({ summary }: DashboardViewsCardProps) {
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
    </Card>
  );
}
