import Link from "next/link";

import { AnimatedCounter } from "@/components/ui/AnimatedCounter";
import { Card } from "@/components/ui/Card";

export type DashboardMetric = {
  description: string;
  href: string;
  label: string;
  value: number;
};

type DashboardMetricGridProps = {
  metrics: DashboardMetric[];
};

export function DashboardMetricGrid({ metrics }: DashboardMetricGridProps) {
  return (
    <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
      {metrics.map((metric) => (
        <Link href={metric.href} key={metric.label}>
          <Card hoverable className="h-full p-4 sm:p-5">
            <p className="text-xs font-semibold uppercase tracking-widest text-ink-muted">
              {metric.label}
            </p>
            <p className="mt-2 font-fraunces text-3xl font-bold text-ink sm:text-4xl">
              <AnimatedCounter value={metric.value} />
            </p>
            <p className="mt-2 text-xs text-ink-muted">{metric.description}</p>
          </Card>
        </Link>
      ))}
    </div>
  );
}
