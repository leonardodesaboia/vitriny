"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";

type ProposalResponse = "APPROVED" | "REJECTED";

export async function respondToProposal(
  publicToken: string,
  response: ProposalResponse
) {
  const proposal = await prisma.proposal.findUnique({
    where: {
      publicToken
    },
    select: {
      id: true,
      quoteRequestId: true,
      status: true,
      validUntil: true,
      quoteRequest: {
        select: {
          status: true
        }
      }
    }
  });

  if (!proposal) {
    redirect(`/proposta/${publicToken}?error=not-found`);
  }

  if (proposal.status === "APPROVED" || proposal.status === "REJECTED") {
    redirect(`/proposta/${publicToken}?error=answered`);
  }

  if (proposal.validUntil && proposal.validUntil < new Date()) {
    redirect(`/proposta/${publicToken}?error=expired`);
  }

  await prisma.$transaction(async (tx) => {
    await tx.proposal.update({
      where: {
        id: proposal.id
      },
      data: {
        status: response,
        respondedAt: new Date()
      }
    });

    await tx.proposalStatusHistory.create({
      data: {
        proposalId: proposal.id,
        fromStatus: proposal.status,
        toStatus: response,
        actor: "CUSTOMER",
        note:
          response === "APPROVED"
            ? "Cliente aprovou a proposta publica."
            : "Cliente recusou a proposta publica."
      }
    });

    await tx.quoteRequest.update({
      where: {
        id: proposal.quoteRequestId
      },
      data: {
        status: "CLOSED"
      }
    });

    if (proposal.quoteRequest.status !== "CLOSED") {
      await tx.quoteRequestStatusHistory.create({
        data: {
          quoteRequestId: proposal.quoteRequestId,
          fromStatus: proposal.quoteRequest.status,
          toStatus: "CLOSED",
          actor: "CUSTOMER",
          note:
            response === "APPROVED"
              ? "Cliente aprovou a proposta publica."
              : "Cliente recusou a proposta publica."
        }
      });
    }
  });

  revalidatePath(`/proposta/${publicToken}`);
  redirect(`/proposta/${publicToken}?response=${response.toLowerCase()}`);
}
