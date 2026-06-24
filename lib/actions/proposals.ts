"use server";

import crypto from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";

import {
  getCurrentMonthRange,
  getPlanLimit,
  hasReachedLimit,
  PLAN_LIMIT_ERROR_CODES
} from "@/lib/plan-limits";
import { prisma } from "@/lib/prisma";
import { proposalSchema } from "@/lib/validations/proposal";
import { requireAuth } from "@/lib/actions/auth-guard";

function decimalFromString(value: string) {
  return new Prisma.Decimal(value);
}

function parseProposalForm(formData: FormData) {
  const pricingMode = formData.get("pricingMode");

  if (pricingMode === "SIMPLE") {
    return proposalSchema.safeParse({
      pricingMode: "SIMPLE",
      requestId: formData.get("requestId"),
      title: formData.get("title"),
      description: formData.get("description"),
      validUntil: formData.get("validUntil"),
      totalAmount: formData.get("totalAmount"),
      depositAmount: formData.get("depositAmount")
    });
  }

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
      const desc = String(item.description ?? "").trim();
      const price = String(item.unitPrice ?? "").trim();
      return desc !== "" || price !== "";
    });

  return proposalSchema.safeParse({
    pricingMode: "ITEMIZED",
    requestId: formData.get("requestId"),
    title: formData.get("title"),
    description: formData.get("description"),
    validUntil: formData.get("validUntil"),
    depositAmount: formData.get("depositAmount"),
    items
  });
}

export async function createProposal(formData: FormData) {
  const userId = await requireAuth();
  const parsed = parseProposalForm(formData);

  if (!parsed.success) {
    const requestId = String(formData.get("requestId") ?? "");
    redirect(`/dashboard/propostas/nova?requestId=${requestId}&error=invalid`);
  }

  const profile = await prisma.providerProfile.findUnique({
    where: { userId },
    select: { id: true, plan: true }
  });

  if (!profile) {
    redirect("/dashboard/pedidos?error=profile");
  }

  const quoteRequest = await prisma.quoteRequest.findFirst({
    where: { id: parsed.data.requestId, providerId: profile.id },
    include: { proposal: { select: { id: true } } }
  });

  if (!quoteRequest) {
    redirect("/dashboard/pedidos?error=not-found");
  }

  if (quoteRequest.proposal) {
    redirect(`/dashboard/propostas/nova?requestId=${quoteRequest.id}&error=exists`);
  }

  let totalAmount: Prisma.Decimal;
  let itemsToCreate: Array<{
    description: string;
    quantity: number;
    unitPrice: Prisma.Decimal;
    totalPrice: Prisma.Decimal;
  }> = [];

  if (parsed.data.pricingMode === "SIMPLE") {
    totalAmount = decimalFromString(parsed.data.totalAmount);
  } else {
    itemsToCreate = parsed.data.items.map((item) => {
      const unitPrice = decimalFromString(item.unitPrice);
      const totalPrice = unitPrice.mul(item.quantity);
      return { description: item.description, quantity: item.quantity, unitPrice, totalPrice };
    });
    totalAmount = itemsToCreate.reduce(
      (sum, item) => sum.plus(item.totalPrice),
      new Prisma.Decimal(0)
    );
  }

  const monthRange = getCurrentMonthRange();
  const created = await prisma.$transaction(async (tx) => {
    const monthlyProposalsCount = await tx.proposal.count({
      where: {
        providerId: profile.id,
        createdAt: { gte: monthRange.start, lt: monthRange.end }
      }
    });

    if (hasReachedLimit(monthlyProposalsCount, getPlanLimit(profile.plan, "monthlyProposals"))) {
      return false;
    }

    await tx.proposal.create({
      data: {
        providerId: profile.id,
        quoteRequestId: quoteRequest.id,
        publicToken: crypto.randomBytes(24).toString("hex"),
        pricingMode: parsed.data.pricingMode,
        title: parsed.data.title,
        description: parsed.data.description,
        totalAmount,
        depositAmount: parsed.data.depositAmount
          ? decimalFromString(parsed.data.depositAmount)
          : null,
        status: "SENT",
        validUntil: parsed.data.validUntil
          ? new Date(`${parsed.data.validUntil}T00:00:00`)
          : null,
        items: { create: itemsToCreate },
        statusHistory: {
          create: { toStatus: "SENT", actor: "PROVIDER", note: "Proposta criada e enviada." }
        }
      }
    });

    await tx.quoteRequest.update({
      where: { id: quoteRequest.id },
      data: { status: "PROPOSAL_SENT" }
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

export async function markDepositPaid(formData: FormData) {
  const userId = await requireAuth();
  const proposalId = String(formData.get("proposalId") ?? "");

  if (!proposalId) return;

  const profile = await prisma.providerProfile.findUnique({
    where: { userId },
    select: { id: true }
  });

  if (!profile) return;

  const proposal = await prisma.proposal.findFirst({
    where: { id: proposalId, providerId: profile.id, status: "APPROVED" },
    select: { id: true }
  });

  if (!proposal) return;

  await prisma.proposal.update({
    where: { id: proposal.id },
    data: { depositPaidAt: new Date() }
  });

  revalidatePath("/dashboard/pedidos");
}
