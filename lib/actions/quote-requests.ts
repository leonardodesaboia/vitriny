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
import {
  quoteRequestSchema,
  validateQuoteRequestForService
} from "@/lib/validations/quote-request";
import {
  sendQuoteRequestConfirmationToCustomerEmail,
  sendQuoteRequestReceivedEmail
} from "@/lib/email";

function appUrl(path: string) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.AUTH_URL ?? "";
  return `${baseUrl.replace(/\/$/, "")}${path}`;
}

export type QuoteRequestFormState = { error: string } | undefined;

export async function createQuoteRequest(
  slug: string,
  _prevState: QuoteRequestFormState,
  formData: FormData
): Promise<QuoteRequestFormState> {
  const parsed = quoteRequestSchema.safeParse({
    customerName: formData.get("customerName"),
    customerEmail: formData.get("customerEmail"),
    customerPhone: formData.get("customerPhone"),
    serviceId: formData.get("serviceId"),
    description: formData.get("description"),
    desiredDate: formData.get("desiredDate"),
    desiredTime: formData.get("desiredTime"),
    location: formData.get("location")
  });

  if (!parsed.success) {
    return {
      error:
        parsed.error.issues[0]?.message ??
        "Preencha todos os campos obrigatórios corretamente."
    };
  }

  const profile = await prisma.providerProfile.findUnique({
    where: {
      slug
    },
    select: {
      id: true,
      plan: true,
      isPublished: true,
      businessName: true,
      email: true,
      pixKey: true,
      pixHolderName: true,
      pixCity: true,
      user: {
        select: {
          email: true
        }
      }
    }
  });

  if (!profile || !profile.isPublished) {
    redirect(`/u/${slug}/orcamento?error=unavailable`);
  }

  const service = parsed.data.serviceId
    ? await prisma.service.findFirst({
      where: {
        id: parsed.data.serviceId,
        providerId: profile.id,
        isActive: true
      },
      select: {
        id: true,
        name: true,
        pricingType: true,
        fixedServiceCheckoutMode: true,
        basePrice: true,
        requiresSchedulingDetails: true
      }
    })
    : null;

  if (parsed.data.serviceId) {
    if (!service) {
      redirect(`/u/${slug}/orcamento?error=service`);
    }
  }

  const businessRuleError = validateQuoteRequestForService(parsed.data, service);
  if (businessRuleError) return { error: businessRuleError };

  const pixConfigured = !!(
    profile.pixKey &&
    profile.pixHolderName &&
    profile.pixCity
  );

  const requiresPixPayment =
    service?.pricingType === "FIXED" &&
    service.fixedServiceCheckoutMode === "REQUIRE_PIX_PAYMENT";

  if (requiresPixPayment && (!service.basePrice || !pixConfigured)) {
    redirect(`/u/${slug}/orcamento?error=payment-unavailable`);
  }

  const isPixPayment = requiresPixPayment && !!service.basePrice && pixConfigured;

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

    return tx.quoteRequest.create({
      data: {
        providerId: profile.id,
        serviceId: parsed.data.serviceId,
        customerName: parsed.data.customerName,
        customerEmail: parsed.data.customerEmail,
        customerPhone: parsed.data.customerPhone,
        description: parsed.data.description,
        desiredDate: parsed.data.desiredDate,
        desiredTime: parsed.data.desiredTime,
        location: parsed.data.location,
        status: "NEW",
        ...(isPixPayment
          ? {
              fixedServiceAmount: service!.basePrice,
              pixReservationRequestedAt: new Date()
            }
          : {}),
        statusHistory: {
          create: {
            toStatus: "NEW",
            actor: "CUSTOMER",
            note: "Pedido criado pelo formulario publico."
          }
        }
      },
      select: {
        id: true,
        customerName: true
      }
    });
  });

  if (!created) {
    redirect(
      `/u/${slug}/orcamento?error=${PLAN_LIMIT_ERROR_CODES.monthlyQuoteRequests}`
    );
  }

  const providerEmail = profile.email ?? profile.user.email;

  if (providerEmail) {
    try {
      await sendQuoteRequestReceivedEmail({
        to: providerEmail,
        businessName: profile.businessName,
        customerName: created.customerName,
        serviceName: service?.name,
        dashboardUrl: appUrl("/dashboard/pedidos")
      });
    } catch (error) {
      console.error("Falha ao enviar e-mail de novo pedido.", {
        error,
        quoteRequestId: created.id
      });
    }
  }

  if (parsed.data.customerEmail) {
    try {
      await sendQuoteRequestConfirmationToCustomerEmail({
        to: parsed.data.customerEmail,
        customerName: created.customerName,
        businessName: profile.businessName,
        serviceName: service?.name,
        isPixPayment,
        profileUrl: appUrl(`/u/${slug}`),
        pixReservaUrl: isPixPayment ? appUrl(`/u/${slug}/reserva/${created.id}`) : null
      });
    } catch (error) {
      console.error("Falha ao enviar e-mail de confirmação ao cliente.", {
        error,
        quoteRequestId: created.id
      });
    }
  }

  if (isPixPayment) {
    redirect(`/u/${slug}/reserva/${created.id}`);
  }

  redirect(`/u/${slug}/orcamento?success=1`);
}

export async function markPixReservationPaid(formData: FormData) {
  const { profile } = await requireProviderProfile();
  if (!profile) redirect("/dashboard/pedidos?error=profile");

  const requestId = String(formData.get("requestId") ?? "");
  if (!requestId) redirect("/dashboard/pedidos?error=not-found");

  const quoteRequest = await prisma.quoteRequest.findFirst({
    where: { id: requestId, providerId: profile.id },
    select: {
      id: true,
      pixReservationRequestedAt: true,
      pixReservationPaidAt: true
    }
  });

  if (!quoteRequest || !quoteRequest.pixReservationRequestedAt) {
    redirect("/dashboard/pedidos?error=not-found");
  }

  if (quoteRequest.pixReservationPaidAt) {
    redirect("/dashboard/pedidos");
  }

  await prisma.quoteRequest.update({
    where: { id: quoteRequest.id },
    data: { pixReservationPaidAt: new Date() }
  });

  revalidatePath("/dashboard/pedidos");
  redirect("/dashboard/pedidos");
}

export async function updateQuoteRequestDescription(
  _: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const { profile } = await requireProviderProfile();
  if (!profile) return { error: "Dados do negócio não encontrados." };

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
