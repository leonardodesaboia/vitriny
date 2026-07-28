import type { Prisma, ProposalStatus, QuoteRequestStatus } from "@prisma/client";

export type DashboardActivityType =
  | "PROPOSAL_APPROVED"
  | "PROPOSAL_DEPOSIT_PAID"
  | "PROPOSAL_REJECTED"
  | "PROPOSAL_SENT"
  | "QUOTE_REQUEST_CREATED";

type ActivitySourceEvent = {
  customerName: string;
  id: string;
  occurredAt: Date;
};

type ProposalActivitySourceEvent = ActivitySourceEvent & {
  status: ProposalStatus;
};

type RecentActivityInput = {
  paidDeposits: ActivitySourceEvent[];
  proposalStatusEvents: ProposalActivitySourceEvent[];
  quoteRequests: ActivitySourceEvent[];
};

export type DashboardActivity = ActivitySourceEvent & {
  title: string;
  type: DashboardActivityType;
};

const PROPOSAL_ACTIVITY: Partial<
  Record<ProposalStatus, { title: string; type: DashboardActivityType }>
> = {
  APPROVED: { title: "Proposta aprovada", type: "PROPOSAL_APPROVED" },
  REJECTED: { title: "Proposta recusada", type: "PROPOSAL_REJECTED" },
  SENT: { title: "Proposta enviada", type: "PROPOSAL_SENT" }
};

export function buildRecentDashboardActivity({
  paidDeposits,
  proposalStatusEvents,
  quoteRequests
}: RecentActivityInput): DashboardActivity[] {
  const proposalActivities = proposalStatusEvents.flatMap((event) => {
    const activity = PROPOSAL_ACTIVITY[event.status];
    if (!activity) return [];

    return [
      {
        ...event,
        id: `proposal-status:${event.id}`,
        title: activity.title,
        type: activity.type
      }
    ];
  });

  const activities: DashboardActivity[] = [
    ...quoteRequests.map((event) => ({
      ...event,
      id: `quote-request:${event.id}`,
      title: "Novo pedido recebido",
      type: "QUOTE_REQUEST_CREATED" as const
    })),
    ...proposalActivities,
    ...paidDeposits.map((event) => ({
      ...event,
      id: `proposal-deposit:${event.id}`,
      title: "Entrada Pix confirmada",
      type: "PROPOSAL_DEPOSIT_PAID" as const
    }))
  ];

  return activities
    .sort((left, right) => right.occurredAt.getTime() - left.occurredAt.getTime())
    .slice(0, 5);
}

export type DashboardRequestView =
  | "APPROVED_MONTH"
  | "DEPOSIT"
  | "MONTH"
  | "OPEN";

type MonthRange = {
  end: Date;
  start: Date;
};

type DashboardRequest = {
  createdAt: Date;
  proposal: {
    depositAmount: number | string | { toString(): string } | null;
    depositPaidAt: Date | null;
    respondedAt: Date | null;
    status: ProposalStatus;
  } | null;
  status: QuoteRequestStatus;
};

type OnboardingOutcomeInput = {
  fixedRequestCount: number;
  hasActiveCustomService: boolean;
  hasActiveFixedService: boolean;
  proposalCount: number;
};

export type DashboardOnboardingOutcomeStep = {
  actionLabel: string;
  description: string;
  done: boolean;
  href: string;
  id: string;
  label: string;
};

const DASHBOARD_REQUEST_VIEWS: DashboardRequestView[] = [
  "APPROVED_MONTH",
  "DEPOSIT",
  "MONTH",
  "OPEN"
];

export const DASHBOARD_REQUEST_VIEW_LABELS: Record<
  DashboardRequestView,
  string
> = {
  APPROVED_MONTH: "Propostas aprovadas no mês",
  DEPOSIT: "Entradas Pix pendentes",
  MONTH: "Pedidos deste mês",
  OPEN: "Pedidos em aberto"
};

export function buildOnboardingOutcomeStep({
  fixedRequestCount,
  hasActiveCustomService,
  hasActiveFixedService,
  proposalCount
}: OnboardingOutcomeInput): DashboardOnboardingOutcomeStep {
  if (hasActiveFixedService && !hasActiveCustomService) {
    return {
      actionLabel: "Ver pedidos",
      description:
        "Quando um cliente solicitar um item com preço fixo, o pedido aparecerá no painel.",
      done: fixedRequestCount > 0,
      href: "/dashboard/pedidos",
      id: "fixed-request",
      label: "Receber primeiro pedido"
    };
  }

  if (hasActiveCustomService && !hasActiveFixedService) {
    return {
      actionLabel: "Ir para pedidos",
      description:
        "Responda um pedido com uma proposta e envie o link para o cliente.",
      done: proposalCount > 0,
      href: "/dashboard/pedidos",
      id: "proposal",
      label: "Criar primeira proposta"
    };
  }

  return {
    actionLabel: "Ir para pedidos",
    description:
      "Atenda um pedido de preço fixo ou envie uma proposta para um item sob consulta.",
    done: fixedRequestCount > 0 || proposalCount > 0,
    href: "/dashboard/pedidos",
    id: "first-service",
    label: "Concluir primeiro atendimento"
  };
}

const formatBRL = (value: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(value);

export type MonthlyRevenueSummary = {
  total: string;
};

// A soma Decimal chega como string (fronteira server→client) e sai formatada
// em BRL, pronta para renderizar. Hoje o movimentado do mês vem só das
// propostas aprovadas — o pagamento Pix do cliente foi removido do fluxo.
export function buildMonthlyRevenueSummary(
  approvedSum: string | null
): MonthlyRevenueSummary {
  return {
    total: formatBRL(Number(approvedSum ?? 0))
  };
}

export type StorefrontViewsSummary = {
  views7: number;
  message: string;
};

// View model do card de visitas. O framing evita desânimo: nunca acusa
// "views sem pedido", vira dica acionável.
export function buildStorefrontViewsSummary(input: {
  views7: number;
  views30: number;
  hasRecentOrders: boolean;
}): StorefrontViewsSummary {
  const { views7, views30, hasRecentOrders } = input;

  if (views30 === 0) {
    return { views7, message: "Comece a divulgar o link da sua vitrine." };
  }

  if (views7 > 0 && !hasRecentOrders) {
    return {
      views7,
      message:
        "Sua vitrine está recebendo visitas — boas fotos e descrições ajudam a virar pedido.",
    };
  }

  return { views7, message: `${views30} nos últimos 30 dias` };
}

// Espelho Prisma de matchesDashboardRequestView (fonte de verdade testada):
// permite filtrar no banco para paginar sem carregar tudo.
export function dashboardRequestViewWhere(
  view: DashboardRequestView,
  monthRange: MonthRange
): Prisma.QuoteRequestWhereInput {
  switch (view) {
    case "MONTH":
      return { createdAt: { gte: monthRange.start, lt: monthRange.end } };
    case "OPEN":
      return { status: { not: "CLOSED" } };
    case "DEPOSIT":
      return {
        proposal: {
          is: {
            status: "APPROVED",
            depositAmount: { gt: 0 },
            depositPaidAt: null
          }
        }
      };
    case "APPROVED_MONTH":
      return {
        proposal: {
          is: {
            status: "APPROVED",
            respondedAt: { gte: monthRange.start, lt: monthRange.end }
          }
        }
      };
  }
}

export type TopItem = { serviceId: string; name: string; count: number };

// Junta o resultado do groupBy com os nomes, preservando a ordem do ranking
// (o groupBy já vem ordenado por count desc) e descartando itens sem nome
// (removidos entre a agregação e a leitura).
export function mergeItemViewRanking(
  groups: Array<{ serviceId: string; _sum: { count: number | null } }>,
  names: Array<{ id: string; name: string }>
): TopItem[] {
  const nameById = new Map(names.map((n) => [n.id, n.name]));
  return groups.flatMap((group) => {
    const name = nameById.get(group.serviceId);
    if (name === undefined) return [];
    return [{ serviceId: group.serviceId, name, count: group._sum.count ?? 0 }];
  });
}

export function parseDashboardRequestView(
  value: string | undefined
): DashboardRequestView | null {
  return DASHBOARD_REQUEST_VIEWS.includes(value as DashboardRequestView)
    ? (value as DashboardRequestView)
    : null;
}

function isWithinMonth(date: Date | null, monthRange: MonthRange) {
  return !!date && date >= monthRange.start && date < monthRange.end;
}

export function matchesDashboardRequestView(
  request: DashboardRequest,
  view: DashboardRequestView,
  monthRange: MonthRange
) {
  switch (view) {
    case "MONTH":
      return isWithinMonth(request.createdAt, monthRange);
    case "OPEN":
      return request.status !== "CLOSED";
    case "DEPOSIT":
      return (
        request.proposal?.status === "APPROVED" &&
        Number(request.proposal.depositAmount ?? 0) > 0 &&
        request.proposal.depositPaidAt === null
      );
    case "APPROVED_MONTH":
      return (
        request.proposal?.status === "APPROVED" &&
        isWithinMonth(request.proposal.respondedAt, monthRange)
      );
  }
}
