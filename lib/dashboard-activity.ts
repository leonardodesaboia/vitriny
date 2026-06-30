import { buildRecentDashboardActivity } from "@/lib/dashboard";
import { prisma } from "@/lib/prisma";

export async function getRecentDashboardActivity(providerId: string) {
  const [quoteRequests, proposalStatusEvents, paidReservations, paidDeposits] =
    await prisma.$transaction([
      prisma.quoteRequest.findMany({
        orderBy: { createdAt: "desc" },
        select: { createdAt: true, customerName: true, id: true },
        take: 5,
        where: { providerId }
      }),
      prisma.proposalStatusHistory.findMany({
        orderBy: { createdAt: "desc" },
        select: {
          createdAt: true,
          id: true,
          proposal: {
            select: {
              quoteRequest: { select: { customerName: true } }
            }
          },
          toStatus: true
        },
        take: 5,
        where: {
          proposal: { providerId },
          toStatus: { in: ["SENT", "APPROVED", "REJECTED"] }
        }
      }),
      prisma.quoteRequest.findMany({
        orderBy: { pixReservationPaidAt: "desc" },
        select: {
          customerName: true,
          id: true,
          pixReservationPaidAt: true
        },
        take: 5,
        where: {
          pixReservationPaidAt: { not: null },
          providerId
        }
      }),
      prisma.proposal.findMany({
        orderBy: { depositPaidAt: "desc" },
        select: {
          depositPaidAt: true,
          id: true,
          quoteRequest: { select: { customerName: true } }
        },
        take: 5,
        where: {
          depositPaidAt: { not: null },
          providerId
        }
      })
    ]);

  return buildRecentDashboardActivity({
    paidDeposits: paidDeposits.flatMap((proposal) =>
      proposal.depositPaidAt
        ? [
            {
              customerName: proposal.quoteRequest.customerName,
              id: proposal.id,
              occurredAt: proposal.depositPaidAt
            }
          ]
        : []
    ),
    paidReservations: paidReservations.flatMap((request) =>
      request.pixReservationPaidAt
        ? [
            {
              customerName: request.customerName,
              id: request.id,
              occurredAt: request.pixReservationPaidAt
            }
          ]
        : []
    ),
    proposalStatusEvents: proposalStatusEvents.map((history) => ({
      customerName: history.proposal.quoteRequest.customerName,
      id: history.id,
      occurredAt: history.createdAt,
      status: history.toStatus
    })),
    quoteRequests: quoteRequests.map((request) => ({
      customerName: request.customerName,
      id: request.id,
      occurredAt: request.createdAt
    }))
  });
}
