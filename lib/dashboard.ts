import type { ProposalStatus, QuoteRequestStatus } from "@prisma/client";

export type DashboardActivityType =
  | "PIX_RESERVATION_PAID"
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
  paidReservations: ActivitySourceEvent[];
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
  paidReservations,
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
    ...paidReservations.map((event) => ({
      ...event,
      id: `pix-reservation:${event.id}`,
      title: "Pagamento Pix confirmado",
      type: "PIX_RESERVATION_PAID" as const
    })),
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
  | "OPEN"
  | "PIX_RESERVATION";

type MonthRange = {
  end: Date;
  start: Date;
};

type DashboardRequest = {
  createdAt: Date;
  pixReservationPaidAt: Date | null;
  pixReservationRequestedAt: Date | null;
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
  "OPEN",
  "PIX_RESERVATION"
];

export const DASHBOARD_REQUEST_VIEW_LABELS: Record<
  DashboardRequestView,
  string
> = {
  APPROVED_MONTH: "Propostas aprovadas no mês",
  DEPOSIT: "Entradas Pix pendentes",
  MONTH: "Pedidos deste mês",
  OPEN: "Pedidos em aberto",
  PIX_RESERVATION: "Pagamentos Pix pendentes"
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
    case "PIX_RESERVATION":
      return (
        request.pixReservationRequestedAt !== null &&
        request.pixReservationPaidAt === null
      );
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
