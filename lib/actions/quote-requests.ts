"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  getCurrentMonthRange,
  getPlanLimit,
  hasReachedLimit,
  PLAN_LIMIT_ERROR_CODES
} from "@/lib/plan-limits";
import { prisma } from "@/lib/prisma";
import { requireProviderProfile } from "@/lib/actions/auth-guard";
import type { ActionResult } from "@/types";
import { quoteRequestSchema } from "@/lib/validations/quote-request";

export async function createQuoteRequest(slug: string, formData: FormData) {
  const parsed = quoteRequestSchema.safeParse({
    customerName: formData.get("customerName"),
    customerEmail: formData.get("customerEmail"),
    customerPhone: formData.get("customerPhone"),
    serviceId: formData.get("serviceId"),
    description: formData.get("description")
  });

  if (!parsed.success) {
    redirect(`/u/${slug}/orcamento?error=invalid`);
  }

  const profile = await prisma.providerProfile.findUnique({
    where: {
      slug
    },
    select: {
      id: true,
      plan: true,
      isPublished: true
    }
  });

  if (!profile || !profile.isPublished) {
    redirect(`/u/${slug}/orcamento?error=unavailable`);
  }

  if (parsed.data.serviceId) {
    const service = await prisma.service.findFirst({
      where: {
        id: parsed.data.serviceId,
        providerId: profile.id,
        isActive: true
      },
      select: {
        id: true
      }
    });

    if (!service) {
      redirect(`/u/${slug}/orcamento?error=service`);
    }
  }

  const monthRange = getCurrentMonthRange();
  const created = await prisma.$transaction(async (tx) => {
    const monthlyRequestsCount = await tx.quoteRequest.count({
      where: {
        providerId: profile.id,
        createdAt: {
          gte: monthRange.start,
          lt: monthRange.end
        }
      }
    });
    const limit = getPlanLimit(profile.plan, "monthlyQuoteRequests");

    if (hasReachedLimit(monthlyRequestsCount, limit)) {
      return false;
    }

    await tx.quoteRequest.create({
      data: {
        providerId: profile.id,
        serviceId: parsed.data.serviceId,
        customerName: parsed.data.customerName,
        customerEmail: parsed.data.customerEmail,
        customerPhone: parsed.data.customerPhone,
        description: parsed.data.description,
        status: "NEW",
        statusHistory: {
          create: {
            toStatus: "NEW",
            actor: "CUSTOMER",
            note: "Pedido criado pelo formulario publico."
          }
        }
      }
    });

    return true;
  });

  if (!created) {
    redirect(
      `/u/${slug}/orcamento?error=${PLAN_LIMIT_ERROR_CODES.monthlyQuoteRequests}`
    );
  }

  redirect(`/u/${slug}/orcamento?success=1`);
}

export async function updateQuoteRequestDescription(
  _: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const { profile } = await requireProviderProfile();
  if (!profile) return { error: "Perfil não encontrado." };

  const requestId = String(formData.get("requestId") ?? "");
  const raw = String(formData.get("description") ?? "").trim();
  const description = raw || null;

  const quoteRequest = await prisma.quoteRequest.findFirst({
    where: { id: requestId, providerId: profile.id },
    select: { id: true }
  });

  if (!quoteRequest) return { error: "Pedido não encontrado." };

  await prisma.quoteRequest.update({
    where: { id: quoteRequest.id },
    data: { description }
  });

  revalidatePath("/dashboard/pedidos");
  return undefined;
}
