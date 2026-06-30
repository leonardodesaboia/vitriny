import { redirect } from "next/navigation";
import Link from "next/link";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { BillingCard } from "@/components/billing/BillingCard";
import { PlanUsageCard } from "@/components/billing/PlanUsageCard";
import { AsyncInvoiceList } from "@/components/billing/AsyncInvoiceList";
import { getCurrentMonthRange, getPlanLimits } from "@/lib/plan-limits";

export default async function BillingPage({
  searchParams
}: {
  searchParams: Promise<{ success?: string; canceled?: string; session_id?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const params = await searchParams;
  const success = params.success === "1";
  const canceled = params.canceled === "1";
  const fromCheckoutRedirect = !!params.session_id;

  const monthRange = getCurrentMonthRange();

  const profile = await prisma.providerProfile.findUnique({
    where: { userId: session.user.id },
    include: {
      services: { select: { id: true, isActive: true } },
      quoteRequests: { select: { id: true, createdAt: true } },
      proposals: { select: { id: true, createdAt: true } },
      proposalTemplates: { select: { id: true } }
    }
  });

  const limits = profile ? getPlanLimits(profile.plan) : null;
  const monthlyQuoteRequests = profile
    ? profile.quoteRequests.filter(
        (r) => r.createdAt >= monthRange.start && r.createdAt < monthRange.end
      ).length
    : 0;
  const monthlyProposals = profile
    ? profile.proposals.filter(
        (p) => p.createdAt >= monthRange.start && p.createdAt < monthRange.end
      ).length
    : 0;

  return (
    <div className="p-8">
      <p className="text-xs font-semibold uppercase tracking-widest text-leaf">
        Assinatura
      </p>
      <h1 className="mt-2 font-fraunces text-4xl font-bold text-ink">
        Plano e assinatura
      </h1>
      <p className="mt-2 text-sm text-ink-muted">
        Gerencie seu plano e visualize o uso atual.
      </p>

      {success || fromCheckoutRedirect ? (
        <div className="mt-6 rounded-lg border border-green-200 bg-green-50 px-4 py-3">
          <p className="text-sm font-semibold text-green-800">
            Assinatura realizada com sucesso! Seu plano será atualizado em instantes.
          </p>
        </div>
      ) : null}

      {canceled ? (
        <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-sm font-semibold text-amber-800">
            Assinatura cancelada. Você continua no plano atual.
          </p>
        </div>
      ) : null}

      {!profile || !limits ? (
        <div className="mt-8 rounded-xl border border-paper-soft bg-white p-6 shadow-card">
          <h2 className="font-fraunces text-xl font-bold text-ink">
            Crie seu perfil primeiro
          </h2>
          <p className="mt-2 text-sm text-ink-muted">
            Assinatura e limites ficam vinculados ao perfil do prestador.
          </p>
          <Link
            className="mt-4 inline-flex min-h-9 items-center justify-center rounded-md bg-leaf px-4 text-xs font-semibold text-white transition hover:bg-leaf-hover"
            href="/dashboard/perfil"
          >
            Criar perfil
          </Link>
        </div>
      ) : (
        <>
          <div className="mt-8">
            <BillingCard
              plan={profile.plan}
              subscriptionStatus={profile.subscriptionStatus}
              currentPeriodEnd={profile.currentPeriodEnd}
              cancelAtPeriodEnd={profile.cancelAtPeriodEnd}
            />
          </div>

          <AsyncInvoiceList />

          <PlanUsageCard
            plan={profile.plan}
            usage={[
              {
                current: profile.services.filter((s) => s.isActive).length,
                limit: limits.activeServices,
                resource: "activeServices"
              },
              {
                current: monthlyQuoteRequests,
                limit: limits.monthlyQuoteRequests,
                resource: "monthlyQuoteRequests"
              },
              {
                current: monthlyProposals,
                limit: limits.monthlyProposals,
                resource: "monthlyProposals"
              },
              {
                current: profile.proposalTemplates.length,
                limit: limits.proposalTemplates,
                resource: "proposalTemplates"
              }
            ]}
          />
        </>
      )}
    </div>
  );
}
