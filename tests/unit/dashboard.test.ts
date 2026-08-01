import { describe, expect, it } from "vitest";

import {
  buildMonthlyRevenueSummary,
  buildRecentDashboardActivity,
  buildOnboardingOutcomeSteps,
  dashboardRequestViewWhere,
  matchesDashboardRequestView,
  parseDashboardRequestView
} from "@/lib/dashboard";

describe("buildRecentDashboardActivity", () => {
  it("combina, ordena e limita os cinco eventos mais recentes", () => {
    const activity = buildRecentDashboardActivity({
      paidDeposits: [
        {
          customerName: "Fernanda",
          id: "deposit-1",
          occurredAt: new Date("2026-06-30T10:00:00.000Z")
        }
      ],
      proposalStatusEvents: [
        {
          customerName: "Daniela",
          id: "proposal-approved",
          occurredAt: new Date("2026-06-30T08:00:00.000Z"),
          status: "APPROVED"
        },
        {
          customerName: "Carlos",
          id: "proposal-rejected",
          occurredAt: new Date("2026-06-30T07:00:00.000Z"),
          status: "REJECTED"
        },
        {
          customerName: "Bruna",
          id: "proposal-sent",
          occurredAt: new Date("2026-06-30T06:00:00.000Z"),
          status: "SENT"
        }
      ],
      quoteRequests: [
        {
          customerName: "Ana",
          id: "request-1",
          occurredAt: new Date("2026-06-30T05:00:00.000Z")
        }
      ]
    });

    expect(activity).toHaveLength(5);
    expect(activity.map((event) => event.type)).toEqual([
      "PROPOSAL_DEPOSIT_PAID",
      "PROPOSAL_APPROVED",
      "PROPOSAL_REJECTED",
      "PROPOSAL_SENT",
      "QUOTE_REQUEST_CREATED"
    ]);
    expect(activity[0]).toMatchObject({
      customerName: "Fernanda",
      title: "Entrada Pix confirmada"
    });
  });

  it("ignora status de proposta que não representa atividade suportada", () => {
    const activity = buildRecentDashboardActivity({
      paidDeposits: [],
      proposalStatusEvents: [
        {
          customerName: "Ana",
          id: "proposal-draft",
          occurredAt: new Date(),
          status: "DRAFT"
        }
      ],
      quoteRequests: []
    });

    expect(activity).toEqual([]);
  });

  it("não altera a ordem das coleções recebidas", () => {
    const quoteRequests = [
      {
        customerName: "Antigo",
        id: "old",
        occurredAt: new Date("2026-06-01T00:00:00.000Z")
      },
      {
        customerName: "Novo",
        id: "new",
        occurredAt: new Date("2026-06-30T00:00:00.000Z")
      }
    ];

    buildRecentDashboardActivity({
      paidDeposits: [],
      proposalStatusEvents: [],
      quoteRequests
    });

    expect(quoteRequests.map((request) => request.id)).toEqual(["old", "new"]);
  });
});

describe("buildOnboardingOutcomeSteps", () => {
  it("orienta serviço CUSTOM a receber o primeiro pedido antes de propor", () => {
    const steps = buildOnboardingOutcomeSteps({
      customRequestCount: 0,
      fixedRequestCount: 0,
      hasActiveCustomService: true,
      hasActiveFixedService: false,
      proposalCount: 0
    });

    expect(steps.map((step) => step.id)).toEqual(["custom-request", "proposal"]);
    expect(steps[0]).toMatchObject({
      done: false,
      id: "custom-request",
      label: "Receber primeiro pedido"
    });
    expect(steps[1]).toMatchObject({
      done: false,
      id: "proposal",
      label: "Criar primeira proposta"
    });
  });

  it("marca o pedido CUSTOM como concluído e mantém a proposta pendente", () => {
    const steps = buildOnboardingOutcomeSteps({
      customRequestCount: 1,
      fixedRequestCount: 0,
      hasActiveCustomService: true,
      hasActiveFixedService: false,
      proposalCount: 0
    });

    expect(steps[0].done).toBe(true);
    expect(steps[1].done).toBe(false);
  });

  it("orienta serviço FIXED para o primeiro pedido sem exigir proposta", () => {
    const steps = buildOnboardingOutcomeSteps({
      customRequestCount: 0,
      fixedRequestCount: 1,
      hasActiveCustomService: false,
      hasActiveFixedService: true,
      proposalCount: 0
    });

    expect(steps).toHaveLength(1);
    expect(steps[0]).toMatchObject({
      done: true,
      id: "fixed-request",
      label: "Receber primeiro pedido"
    });
  });

  it("aceita proposta ou pedido FIXED quando o prestador oferece os dois tipos", () => {
    const base = {
      customRequestCount: 0,
      hasActiveCustomService: true,
      hasActiveFixedService: true
    };

    expect(
      buildOnboardingOutcomeSteps({
        ...base,
        fixedRequestCount: 0,
        proposalCount: 1
      })[0].done
    ).toBe(true);
    expect(
      buildOnboardingOutcomeSteps({
        ...base,
        fixedRequestCount: 1,
        proposalCount: 0
      })[0].done
    ).toBe(true);
  });
});

describe("parseDashboardRequestView", () => {
  it("aceita somente visões conhecidas", () => {
    expect(parseDashboardRequestView("OPEN")).toBe("OPEN");
    expect(parseDashboardRequestView("DEPOSIT")).toBe("DEPOSIT");
    expect(parseDashboardRequestView("invalid")).toBeNull();
    expect(parseDashboardRequestView(undefined)).toBeNull();
  });
});

describe("matchesDashboardRequestView", () => {
  const month = {
    end: new Date("2026-07-01T00:00:00.000Z"),
    start: new Date("2026-06-01T00:00:00.000Z")
  };
  const request = {
    createdAt: new Date("2026-06-15T12:00:00.000Z"),
    proposal: null,
    status: "NEW" as const
  };

  it("filtra pedidos do mês e pedidos em aberto", () => {
    expect(matchesDashboardRequestView(request, "MONTH", month)).toBe(true);
    expect(matchesDashboardRequestView(request, "OPEN", month)).toBe(true);
    expect(
      matchesDashboardRequestView(
        { ...request, status: "CLOSED" },
        "OPEN",
        month
      )
    ).toBe(false);
  });

  it("identifica entrada aprovada ainda não confirmada", () => {
    expect(
      matchesDashboardRequestView(
        {
          ...request,
          proposal: {
            depositAmount: 100,
            depositPaidAt: null,
            respondedAt: new Date("2026-06-20T12:00:00.000Z"),
            status: "APPROVED"
          }
        },
        "DEPOSIT",
        month
      )
    ).toBe(true);
  });

  it("identifica propostas aprovadas no mês pela data de resposta", () => {
    expect(
      matchesDashboardRequestView(
        {
          ...request,
          proposal: {
            depositAmount: null,
            depositPaidAt: null,
            respondedAt: new Date("2026-06-20T12:00:00.000Z"),
            status: "APPROVED"
          }
        },
        "APPROVED_MONTH",
        month
      )
    ).toBe(true);
  });
});

describe("dashboardRequestViewWhere", () => {
  const monthRange = {
    start: new Date("2026-07-01T00:00:00Z"),
    end: new Date("2026-08-01T00:00:00Z")
  };

  it("MONTH filtra por createdAt no mês", () => {
    expect(dashboardRequestViewWhere("MONTH", monthRange)).toEqual({
      createdAt: { gte: monthRange.start, lt: monthRange.end }
    });
  });

  it("OPEN exclui fechados", () => {
    expect(dashboardRequestViewWhere("OPEN", monthRange)).toEqual({
      status: { not: "CLOSED" }
    });
  });

  it("DEPOSIT espelha entrada aprovada não recebida", () => {
    expect(dashboardRequestViewWhere("DEPOSIT", monthRange)).toEqual({
      proposal: {
        is: {
          status: "APPROVED",
          depositAmount: { gt: 0 },
          depositPaidAt: null
        }
      }
    });
  });

  it("APPROVED_MONTH espelha aprovadas pelo respondedAt", () => {
    expect(
      dashboardRequestViewWhere("APPROVED_MONTH", monthRange)
    ).toEqual({
      proposal: {
        is: {
          status: "APPROVED",
          respondedAt: { gte: monthRange.start, lt: monthRange.end }
        }
      }
    });
  });
});

describe("buildMonthlyRevenueSummary", () => {
  // Moeda pt-BR usa espaço não separável — comparar com o mesmo formatador.
  const brl = (value: number) =>
    new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL"
    }).format(value);

  it("formata o total de propostas aprovadas no mês", () => {
    expect(buildMonthlyRevenueSummary("1500.5")).toEqual({
      total: brl(1500.5)
    });
  });

  it("trata soma nula como zero", () => {
    expect(buildMonthlyRevenueSummary(null)).toEqual({
      total: brl(0)
    });
  });
});
