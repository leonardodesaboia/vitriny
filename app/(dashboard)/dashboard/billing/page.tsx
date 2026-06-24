import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { BillingCard } from "@/components/billing/BillingCard";
import { PlanUsageCard } from "@/components/billing/PlanUsageCard";
import { InvoiceList, type InvoiceItem } from "@/components/billing/InvoiceList";
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

  if (!profile) {
    redirect("/dashboard/perfil");
  }

  const limits = getPlanLimits(profile.plan);
  const monthlyQuoteRequests = profile.quoteRequests.filter(
    (r) => r.createdAt >= monthRange.start && r.createdAt < monthRange.end
  ).length;
  const monthlyProposals = profile.proposals.filter(
    (p) => p.createdAt >= monthRange.start && p.createdAt < monthRange.end
  ).length;

  let invoices: InvoiceItem[] = [];
  if (profile.stripeCustomerId) {
    const stripeInvoices = await stripe.invoices.list({
      customer: profile.stripeCustomerId,
      limit: 10
    });
    invoices = stripeInvoices.data.map((inv) => ({
      id: inv.id,
      created: inv.created,
      amountPaid: inv.amount_paid,
      currency: inv.currency,
      status: inv.status ?? null,
      hostedUrl: inv.hosted_invoice_url ?? null
    }));
  }

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

      <div className="mt-8">
        <BillingCard
          plan={profile.plan}
          subscriptionStatus={profile.subscriptionStatus}
          currentPeriodEnd={profile.currentPeriodEnd}
          cancelAtPeriodEnd={profile.cancelAtPeriodEnd}
        />
      </div>

      {invoices.length > 0 ? <InvoiceList invoices={invoices} /> : null}

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
    </div>
  );
}
