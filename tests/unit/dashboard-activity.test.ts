import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  depositFindMany: vi.fn(),
  proposalHistoryFindMany: vi.fn(),
  quoteRequestFindMany: vi.fn(),
  transaction: vi.fn()
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: mocks.transaction,
    proposal: { findMany: mocks.depositFindMany },
    proposalStatusHistory: { findMany: mocks.proposalHistoryFindMany },
    quoteRequest: { findMany: mocks.quoteRequestFindMany }
  }
}));

import { getRecentDashboardActivity } from "@/lib/dashboard-activity";

describe("getRecentDashboardActivity", () => {
  beforeEach(() => {
    mocks.depositFindMany.mockReturnValue({});
    mocks.proposalHistoryFindMany.mockReturnValue({});
    mocks.quoteRequestFindMany.mockReturnValue({});
  });

  it("consulta somente o prestador e normaliza as fontes recentes", async () => {
    mocks.transaction.mockResolvedValue([
      [
        {
          createdAt: new Date("2026-06-30T08:00:00.000Z"),
          customerName: "Ana",
          id: "request-1"
        }
      ],
      [
        {
          createdAt: new Date("2026-06-30T09:00:00.000Z"),
          id: "history-1",
          proposal: { quoteRequest: { customerName: "Bruna" } },
          toStatus: "APPROVED"
        }
      ],
      [
        {
          customerName: "Carlos",
          id: "reservation-1",
          pixReservationPaidAt: new Date("2026-06-30T10:00:00.000Z")
        }
      ],
      [
        {
          depositPaidAt: new Date("2026-06-30T11:00:00.000Z"),
          id: "deposit-1",
          quoteRequest: { customerName: "Daniela" }
        }
      ]
    ]);

    const activity = await getRecentDashboardActivity("provider-1");

    expect(activity.map((event) => event.type)).toEqual([
      "PROPOSAL_DEPOSIT_PAID",
      "PIX_RESERVATION_PAID",
      "PROPOSAL_APPROVED",
      "QUOTE_REQUEST_CREATED"
    ]);
    expect(mocks.quoteRequestFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { providerId: "provider-1" } })
    );
    expect(mocks.proposalHistoryFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          proposal: { providerId: "provider-1" }
        })
      })
    );
    expect(mocks.depositFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ providerId: "provider-1" })
      })
    );
  });
});
