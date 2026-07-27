import Link from "next/link";

import { Card } from "@/components/ui/Card";
import type { TopItem } from "@/lib/dashboard";

type DashboardTopItemsCardProps = {
  // Gate de acesso ao detalhe (hoje = PRO via canUseStorefrontAnalytics, mas o
  // nome não amarra a um tier específico caso o gating mude no futuro).
  canViewAnalytics: boolean;
  topItems: TopItem[];
};

export function DashboardTopItemsCard({
  canViewAnalytics,
  topItems,
}: DashboardTopItemsCardProps) {
  return (
    <Card className="mt-8 p-5 sm:p-6">
      <p className="text-xs font-semibold uppercase tracking-widest text-ink-muted">
        Itens mais vistos
      </p>

      {!canViewAnalytics ? (
        <>
          <p className="mt-2 text-sm text-ink">
            Descubra quais itens da sua vitrine geram mais interesse.
          </p>
          <Link
            className="mt-3 inline-flex min-h-9 items-center justify-center rounded-md bg-leaf px-4 text-xs font-semibold text-white transition hover:bg-leaf-hover"
            href="/dashboard/billing"
          >
            Descobrir no Pro →
          </Link>
        </>
      ) : topItems.length === 0 ? (
        <p className="mt-2 text-sm text-ink-muted">
          Ainda sem visitas em itens. Compartilhe os links dos seus itens.
        </p>
      ) : (
        <ol className="mt-3 grid gap-2">
          {topItems.map((item, index) => (
            <li
              className="flex items-center justify-between gap-3"
              key={item.serviceId}
            >
              <span className="flex min-w-0 items-center gap-2 text-sm text-ink">
                <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-mint text-xs font-semibold text-leaf">
                  {index + 1}
                </span>
                <span className="truncate">{item.name}</span>
              </span>
              <span className="shrink-0 font-fraunces text-base font-bold text-ink">
                {item.count}
              </span>
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}
