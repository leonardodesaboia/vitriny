import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { PlanUsageCard } from "@/components/billing/PlanUsageCard";
import {
  DashboardMetricGrid,
  type DashboardMetric
} from "@/components/dashboard/DashboardMetricGrid";
import { DashboardPendingActions } from "@/components/dashboard/DashboardPendingActions";
import { DashboardRecentActivity } from "@/components/dashboard/DashboardRecentActivity";
import { DashboardRevenueCard } from "@/components/dashboard/DashboardRevenueCard";
import { DashboardTopItemsCard } from "@/components/dashboard/DashboardTopItemsCard";
import { DashboardViewsCard } from "@/components/dashboard/DashboardViewsCard";
import {
  OnboardingChecklist,
  type OnboardingStep
} from "@/components/onboarding/OnboardingChecklist";
import { PublicLinkCard } from "@/components/onboarding/PublicLinkCard";
import { profileLinkMessage } from "@/lib/whatsapp-messages";
import { getRecentDashboardActivity } from "@/lib/dashboard-activity";
import {
  buildMonthlyRevenueSummary,
  buildOnboardingOutcomeStep,
  buildStorefrontViewsSummary,
  mergeItemViewRanking,
  type TopItem
} from "@/lib/dashboard";
import { toDayBucket } from "@/lib/storefront-views";
import { canUseStorefrontAnalytics, getCurrentMonthRange, getPlanLimits } from "@/lib/plan-limits";
import { pixPaymentExpiryCutoff } from "@/lib/utils/date";
import { prisma } from "@/lib/prisma";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const monthRange = getCurrentMonthRange();
  // Reservas Pix além deste corte já expiraram e saem das pendências.
  const pixExpiryCutoff = pixPaymentExpiryCutoff();
  const profile = await prisma.providerProfile.findUnique({
    where: { userId: session.user.id },
    select: {
      _count: {
        select: {
          proposalTemplates: true,
          proposals: true
        }
      },
      businessName: true,
      businessType: true,
      id: true,
      isPublished: true,
      plan: true,
      services: {
        select: {
          isActive: true,
          pricingType: true
        }
      },
      slug: true
    }
  });

  const [
    monthlyQuoteRequests,
    openQuoteRequests,
    newQuoteRequests,
    waitingProposals,
    approvedProposalsThisMonth,
    monthlyProposals,
    pendingPixReservations,
    clientInformedPixReservations,
    pendingProposalDeposits,
    fixedRequestCount,
    approvedRevenue,
    pixRevenue
  ] = profile
    ? await prisma.$transaction([
        prisma.quoteRequest.count({
          where: {
            createdAt: { gte: monthRange.start, lt: monthRange.end },
            providerId: profile.id
          }
        }),
        prisma.quoteRequest.count({
          where: {
            providerId: profile.id,
            status: { not: "CLOSED" }
          }
        }),
        prisma.quoteRequest.count({
          where: { providerId: profile.id, status: "NEW" }
        }),
        prisma.proposal.count({
          where: { providerId: profile.id, status: "SENT" }
        }),
        prisma.proposal.count({
          where: {
            providerId: profile.id,
            respondedAt: { gte: monthRange.start, lt: monthRange.end },
            status: "APPROVED"
          }
        }),
        prisma.proposal.count({
          where: {
            createdAt: { gte: monthRange.start, lt: monthRange.end },
            providerId: profile.id
          }
        }),
        prisma.quoteRequest.count({
          where: {
            pixReservationPaidAt: null,
            providerId: profile.id,
            // Consistente com a view PIX_RESERVATION: expiradas só contam
            // quando o cliente informou o pagamento.
            OR: [
              { pixReservationRequestedAt: { gte: pixExpiryCutoff } },
              { pixReservationClientPaidAt: { not: null } }
            ]
          }
        }),
        prisma.quoteRequest.count({
          where: {
            pixReservationPaidAt: null,
            pixReservationClientPaidAt: { not: null },
            providerId: profile.id
          }
        }),
        prisma.proposal.count({
          where: {
            depositAmount: { gt: 0 },
            depositPaidAt: null,
            providerId: profile.id,
            status: "APPROVED"
          }
        }),
        prisma.quoteRequest.count({
          where: {
            providerId: profile.id,
            service: { pricingType: "FIXED" }
          }
        }),
        prisma.proposal.aggregate({
          _sum: { totalAmount: true },
          where: {
            providerId: profile.id,
            respondedAt: { gte: monthRange.start, lt: monthRange.end },
            status: "APPROVED"
          }
        }),
        prisma.quoteRequest.aggregate({
          _sum: { fixedServiceAmount: true },
          where: {
            providerId: profile.id,
            pixReservationPaidAt: { gte: monthRange.start, lt: monthRange.end }
          }
        })
      ])
    : [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, null, null];

  const recentActivity = profile
    ? await getRecentDashboardActivity(profile.id)
    : [];

  // Decimal → string na fronteira; o resumo sai pronto em BRL.
  const revenueSummary = buildMonthlyRevenueSummary(
    approvedRevenue?._sum.totalAmount?.toString() ?? null,
    pixRevenue?._sum.fixedServiceAmount?.toString() ?? null
  );

  const today = toDayBucket(new Date());
  const viewsCutoff7 = new Date(today);
  viewsCutoff7.setUTCDate(viewsCutoff7.getUTCDate() - 6); // janela de 7 dias incl. hoje
  const viewsCutoff30 = new Date(today);
  viewsCutoff30.setUTCDate(viewsCutoff30.getUTCDate() - 29);

  const [views7Agg, views30Agg] = profile
    ? await Promise.all([
        prisma.storefrontView.aggregate({
          _sum: { count: true },
          where: { providerId: profile.id, date: { gte: viewsCutoff7 } },
        }),
        prisma.storefrontView.aggregate({
          _sum: { count: true },
          where: { providerId: profile.id, date: { gte: viewsCutoff30 } },
        }),
      ])
    : [{ _sum: { count: null } }, { _sum: { count: null } }];

  const recentOrdersCount = profile
    ? await prisma.quoteRequest.count({
        where: { providerId: profile.id, createdAt: { gte: viewsCutoff30 } },
      })
    : 0;

  const viewsSummary = buildStorefrontViewsSummary({
    views7: views7Agg._sum.count ?? 0,
    views30: views30Agg._sum.count ?? 0,
    hasRecentOrders: recentOrdersCount > 0,
  });

  const canSeeItemViews = profile
    ? canUseStorefrontAnalytics(profile.plan)
    : false;

  let topItems: TopItem[] = [];
  if (profile && canSeeItemViews) {
    const itemViewGroups = await prisma.itemView.groupBy({
      by: ["serviceId"],
      where: {
        service: { providerId: profile.id },
        date: { gte: viewsCutoff30 },
      },
      _sum: { count: true },
      orderBy: { _sum: { count: "desc" } },
      take: 5,
    });
    const itemNames = await prisma.service.findMany({
      where: { id: { in: itemViewGroups.map((g) => g.serviceId) } },
      select: { id: true, name: true },
    });
    topItems = mergeItemViewRanking(itemViewGroups, itemNames);
  }

  const limits = profile ? getPlanLimits(profile.plan) : null;
  const activeServices = profile?.services.filter((service) => service.isActive) ?? [];
  const activeServicesCount = activeServices.length;
  const onboardingOutcomeStep = buildOnboardingOutcomeStep({
    fixedRequestCount,
    hasActiveCustomService: activeServices.some(
      (service) => service.pricingType === "CUSTOM"
    ),
    hasActiveFixedService: activeServices.some(
      (service) => service.pricingType === "FIXED"
    ),
    proposalCount: profile?._count.proposals ?? 0
  });

  const onboardingSteps: OnboardingStep[] = [
    {
      id: "profile",
      label: "Cadastrar dados do negócio",
      description:
        "Adicione o nome do seu negócio, descrição e informações de contato.",
      done: !!profile,
      href: "/dashboard/perfil",
      actionLabel: "Cadastrar negócio"
    },
    {
      id: "publish",
      label: "Publicar vitrine",
      description: "Ative sua vitrine pública para que clientes encontrem seu negócio.",
      done: profile?.isPublished ?? false,
      href: "/dashboard/perfil",
      actionLabel: "Publicar vitrine"
    },
    {
      id: "service",
      label:
        profile?.businessType === "PRODUCTS"
          ? "Cadastrar pelo menos 1 produto ativo"
          : profile?.businessType === "SERVICES"
            ? "Cadastrar pelo menos 1 serviço ativo"
            : "Cadastrar pelo menos 1 item ativo",
      description:
        "Os itens aparecem na vitrine pública e ajudam clientes a entender o que você oferece.",
      done: activeServicesCount > 0,
      href: "/dashboard/servicos",
      actionLabel:
        profile?.businessType === "PRODUCTS"
          ? "Cadastrar produto"
          : profile?.businessType === "SERVICES"
            ? "Cadastrar serviço"
            : "Cadastrar item"
    },
    {
      id: "link",
      label: "Copiar ou acessar link público",
      description:
        "Compartilhe o link da sua vitrine com clientes para receber pedidos.",
      done: false,
      isCopyStep: true,
      actionLabel: "Copiar link"
    },
    onboardingOutcomeStep
  ];

  const metrics: DashboardMetric[] = [
    {
      description: "Criados no mês atual",
      href: "/dashboard/pedidos?view=MONTH",
      label: "Pedidos no mês",
      value: monthlyQuoteRequests
    },
    {
      description: "Novos, em análise ou com proposta",
      href: "/dashboard/pedidos?view=OPEN",
      label: "Pedidos em aberto",
      value: openQuoteRequests
    },
    {
      description: "Aguardando resposta do cliente",
      href: "/dashboard/pedidos?status=PROPOSAL_SENT",
      label: "Propostas aguardando",
      value: waitingProposals
    },
    {
      description: "Respondidas no mês atual",
      href: "/dashboard/pedidos?view=APPROVED_MONTH",
      label: "Aprovadas no mês",
      value: approvedProposalsThisMonth
    }
  ];

  const pendingActions = [
    {
      count: newQuoteRequests,
      description: "Revise os pedidos que acabaram de chegar.",
      href: "/dashboard/pedidos?status=NEW",
      label: "Novos pedidos"
    },
    {
      count: waitingProposals,
      description: "Acompanhe propostas que aguardam o cliente.",
      href: "/dashboard/pedidos?status=PROPOSAL_SENT",
      label: "Propostas aguardando resposta"
    },
    {
      count: pendingPixReservations,
      description:
        clientInformedPixReservations > 0
          ? `${clientInformedPixReservations} pagamento${clientInformedPixReservations > 1 ? "s" : ""} informado${clientInformedPixReservations > 1 ? "s" : ""} pelo cliente aguardando sua confirmação.`
          : "Confirme os recebimentos informados pelos clientes.",
      href: "/dashboard/pedidos?view=PIX_RESERVATION",
      label: "Pagamentos Pix para confirmar"
    },
    {
      count: pendingProposalDeposits,
      description: "Marque as entradas recebidas nas propostas aprovadas.",
      href: "/dashboard/pedidos?view=DEPOSIT",
      label: "Entradas Pix para confirmar"
    }
  ];

  return (
    <div className="min-w-0 p-4 sm:p-6 md:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-leaf">
            Dashboard
          </p>
          <h1 className="mt-2 font-fraunces text-4xl font-bold text-ink">
            Olá, {session.user.name?.split(" ")[0]}
          </h1>
          <p className="mt-2 text-sm text-ink-muted">
            Gerencie sua vitrine, seus itens e pedidos em um único painel.
          </p>
        </div>
        <LogoutButton className="inline-flex min-h-9 items-center justify-center rounded-md border border-paper-soft bg-white px-4 text-xs font-semibold text-ink-muted transition hover:border-leaf hover:text-leaf" />
      </div>

      {profile?.isPublished && profile.slug ? (
        <PublicLinkCard
          message={profileLinkMessage(
            `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/u/${profile.slug}`
          )}
          storageScope={session.user.id}
          url={`${process.env.NEXT_PUBLIC_APP_URL ?? ""}/u/${profile.slug}`}
        />
      ) : null}

      <OnboardingChecklist
        steps={onboardingSteps}
        slug={profile?.slug}
        storageScope={session.user.id}
      />

      <DashboardPendingActions actions={pendingActions} />

      <DashboardViewsCard summary={viewsSummary} />
      <DashboardTopItemsCard
        canViewAnalytics={canSeeItemViews}
        topItems={topItems}
      />
      <DashboardRevenueCard summary={revenueSummary} />

      <DashboardMetricGrid metrics={metrics} />

      <DashboardRecentActivity activities={recentActivity} />

      {profile && limits ? (
        <PlanUsageCard
          plan={profile.plan}
          usage={[
            {
              current: activeServicesCount,
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
              current: profile._count.proposalTemplates,
              limit: limits.proposalTemplates,
              resource: "proposalTemplates"
            }
          ]}
        />
      ) : null}
    </div>
  );
}
