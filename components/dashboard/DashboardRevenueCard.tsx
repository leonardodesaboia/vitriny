import { Card } from "@/components/ui/Card";
import type { MonthlyRevenueSummary } from "@/lib/dashboard";

type DashboardRevenueCardProps = {
  summary: MonthlyRevenueSummary;
};

export function DashboardRevenueCard({ summary }: DashboardRevenueCardProps) {
  return (
    <Card className="mt-8 p-5 sm:p-6">
      <p className="text-xs font-semibold uppercase tracking-widest text-ink-muted">
        Movimentado no mês
      </p>
      <p className="mt-2 font-fraunces text-4xl font-bold text-ink">
        {summary.total}
      </p>
      <p className="mt-2 text-xs text-ink-muted">
        Em propostas aprovadas no mês
      </p>
    </Card>
  );
}
