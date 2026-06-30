import { describe, expect, it } from "vitest";

import {
  buildRecentDashboardActivity,
  buildOnboardingOutcomeStep,
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
      paidReservations: [
        {
          customerName: "Eduardo",
          id: "reservation-1",
          occurredAt: new Date("2026-06-30T09:00:00.000Z")
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
      "PIX_RESERVATION_PAID",
      "PROPOSAL_APPROVED",
      "PROPOSAL_REJECTED",
      "PROPOSAL_SENT"
    ]);
    expect(activity[0]).toMatchObject({
      customerName: "Fernanda",
      title: "Entrada Pix confirmada"
    });
  });

  it("ignora status de proposta que não representa atividade suportada", () => {
    const activity = buildRecentDashboardActivity({
      paidDeposits: [],
      paidReservations: [],
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
      paidReservations: [],
      proposalStatusEvents: [],
      quoteRequests
    });

    expect(quoteRequests.map((request) => request.id)).toEqual(["old", "new"]);
  });
});

describe("buildOnboardingOutcomeStep", () => {
  it("orienta serviço CUSTOM para a primeira proposta", () => {
    expect(
      buildOnboardingOutcomeStep({
        fixedRequestCount: 0,
        hasActiveCustomService: true,
        hasActiveFixedService: false,
        proposalCount: 0
      })
    ).toMatchObject({
      done: false,
      id: "proposal",
      label: "Criar primeira proposta"
    });
  });

  it("orienta serviço FIXED para o primeiro pedido sem exigir proposta", () => {
    expect(
      buildOnboardingOutcomeStep({
        fixedRequestCount: 1,
        hasActiveCustomService: false,
        hasActiveFixedService: true,
        proposalCount: 0
      })
    ).toMatchObject({
      done: true,
      id: "fixed-request",
      label: "Receber primeiro pedido de serviço"
    });
  });

  it("aceita proposta ou pedido FIXED quando o prestador oferece os dois tipos", () => {
    const base = {
      hasActiveCustomService: true,
      hasActiveFixedService: true
    };

    expect(
      buildOnboardingOutcomeStep({
        ...base,
        fixedRequestCount: 0,
        proposalCount: 1
      }).done
    ).toBe(true);
    expect(
      buildOnboardingOutcomeStep({
        ...base,
        fixedRequestCount: 1,
        proposalCount: 0
      }).done
    ).toBe(true);
  });
});

describe("parseDashboardRequestView", () => {
  it("aceita somente visões conhecidas", () => {
    expect(parseDashboardRequestView("OPEN")).toBe("OPEN");
    expect(parseDashboardRequestView("PIX_RESERVATION")).toBe("PIX_RESERVATION");
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
    pixReservationPaidAt: null,
    pixReservationRequestedAt: null,
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

  it("identifica pagamento Pix ainda não confirmado", () => {
    expect(
      matchesDashboardRequestView(
        { ...request, pixReservationRequestedAt: new Date() },
        "PIX_RESERVATION",
        month
      )
    ).toBe(true);
    expect(
      matchesDashboardRequestView(
        {
          ...request,
          pixReservationPaidAt: new Date(),
          pixReservationRequestedAt: new Date()
        },
        "PIX_RESERVATION",
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
