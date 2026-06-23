"use server";

import crypto from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";

import { auth } from "@/auth";
import {
  getCurrentMonthRange,
  getPlanLimit,
  hasReachedLimit,
  PLAN_LIMIT_ERROR_CODES
} from "@/lib/plan-limits";
import { prisma } from "@/lib/prisma";
import { proposalSchema } from "@/lib/validations/proposal";

function decimalFromString(value: string) {
  return new Prisma.Decimal(value);
}

function parseProposalForm(formData: FormData) {
  const descriptions = formData.getAll("itemDescription");
  const quantities = formData.getAll("itemQuantity");
  const unitPrices = formData.getAll("itemUnitPrice");

  const items = descriptions
    .map((description, index) => ({
      description,
      quantity: quantities[index],
      unitPrice: unitPrices[index]
    }))
    .filter((item) => {
      const description = String(item.description ?? "").trim();
      const unitPrice = String(item.unitPrice ?? "").trim();

      return description !== "" || unitPrice !== "";
    });

  return proposalSchema.safeParse({
    requestId: formData.get("requestId"),
    title: formData.get("title"),
    description: formData.get("description"),
    validUntil: formData.get("validUntil"),
    items
  });
}

export async function createProposal(formData: FormData) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const parsed = parseProposalForm(formData);

  if (!parsed.success) {
    const requestId = String(formData.get("requestId") ?? "");
    redirect(`/dashboard/propostas/nova?requestId=${requestId}&error=invalid`);
  }

  const profile = await prisma.providerProfile.findUnique({
    where: {
      userId: session.user.id
    },
    select: {
      id: true,
      plan: true
    }
  });

  if (!profile) {
    redirect("/dashboard/pedidos?error=profile");
  }

  const quoteRequest = await prisma.quoteRequest.findFirst({
    where: {
      id: parsed.data.requestId,
      providerId: profile.id
    },
    include: {
      proposal: {
        select: {
          id: true
        }
      }
    }
  });

  if (!quoteRequest) {
    redirect("/dashboard/pedidos?error=not-found");
  }

  if (quoteRequest.proposal) {
    redirect(`/dashboard/propostas/nova?requestId=${quoteRequest.id}&error=exists`);
  }

  const items = parsed.data.items.map((item) => {
    const unitPrice = decimalFromString(item.unitPrice);
    const totalPrice = unitPrice.mul(item.quantity);

    return {
      description: item.description,
      quantity: item.quantity,
      unitPrice,
      totalPrice
    };
  });

  const totalAmount = items.reduce(
    (total, item) => total.plus(item.totalPrice),
    new Prisma.Decimal(0)
  );

  const monthRange = getCurrentMonthRange();
  const created = await prisma.$transaction(async (tx) => {
    const monthlyProposalsCount = await tx.proposal.count({
      where: {
        providerId: profile.id,
        createdAt: {
          gte: monthRange.start,
          lt: monthRange.end
        }
      }
    });
    const limit = getPlanLimit(profile.plan, "monthlyProposals");

    if (hasReachedLimit(monthlyProposalsCount, limit)) {
      return false;
    }

    await tx.proposal.create({
      data: {
        providerId: profile.id,
        quoteRequestId: quoteRequest.id,
        publicToken: crypto.randomBytes(24).toString("hex"),
        title: parsed.data.title,
        description: parsed.data.description,
        totalAmount,
        status: "SENT",
        validUntil: parsed.data.validUntil
          ? new Date(`${parsed.data.validUntil}T00:00:00`)
          : null,
        items: {
          create: items
        },
        statusHistory: {
          create: {
            toStatus: "SENT",
            actor: "PROVIDER",
            note: "Proposta criada e enviada."
          }
        }
      }
    });

    await tx.quoteRequest.update({
      where: {
        id: quoteRequest.id
      },
      data: {
        status: "PROPOSAL_SENT"
      }
    });

    if (quoteRequest.status !== "PROPOSAL_SENT") {
      await tx.quoteRequestStatusHistory.create({
        data: {
          quoteRequestId: quoteRequest.id,
          fromStatus: quoteRequest.status,
          toStatus: "PROPOSAL_SENT",
          actor: "PROVIDER",
          note: "Proposta criada para o pedido."
        }
      });
    }

    return true;
  });

  if (!created) {
    redirect(
      `/dashboard/propostas/nova?requestId=${quoteRequest.id}&error=${PLAN_LIMIT_ERROR_CODES.monthlyProposals}`
    );
  }

  revalidatePath("/dashboard/pedidos");
  redirect("/dashboard/pedidos");
}
