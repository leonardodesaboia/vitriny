"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import type { ProposalResponse } from "@/types";
import { sendProposalResponseEmail } from "@/lib/email";

function appUrl(path: string) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.AUTH_URL ?? "";
  return `${baseUrl.replace(/\/$/, "")}${path}`;
}

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
          status: true,
          customerName: true
        }
      },
      provider: {
        select: {
          businessName: true,
          email: true,
          user: {
            select: {
              email: true
            }
          }
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

  const answeredAt = new Date();

  const answered = await prisma.$transaction(async (tx) => {
    const updateResult = await tx.proposal.updateMany({
      where: {
        id: proposal.id,
        status: {
          notIn: ["APPROVED", "REJECTED"]
        },
        validUntil: proposal.validUntil
          ? {
              gte: answeredAt
            }
          : undefined
      },
      data: {
        status: response,
        respondedAt: answeredAt
      }
    });

    if (updateResult.count === 0) {
      return false;
    }

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

    return true;
  });

  if (!answered) {
    redirect(`/proposta/${publicToken}?error=answered`);
  }

  const providerEmail = proposal.provider.email ?? proposal.provider.user.email;

  if (providerEmail) {
    try {
      await sendProposalResponseEmail({
        to: providerEmail,
        businessName: proposal.provider.businessName,
        customerName: proposal.quoteRequest.customerName,
        response,
        proposalUrl: appUrl(`/proposta/${publicToken}`)
      });
    } catch (error) {
      console.error("Falha ao enviar e-mail de resposta da proposta.", {
        error,
        proposalId: proposal.id,
        response
      });
    }
  }

  revalidatePath(`/proposta/${publicToken}`);
  redirect(`/proposta/${publicToken}?response=${response.toLowerCase()}`);
}
