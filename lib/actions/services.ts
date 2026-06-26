"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";

import {
  getPlanLimit,
  hasReachedLimit,
  PLAN_LIMIT_ERROR_CODES,
  LIMIT_ERROR_MESSAGES
} from "@/lib/plan-limits";
import { prisma } from "@/lib/prisma";
import { serviceSchema } from "@/lib/validations/service";
import { requireProviderProfile } from "@/lib/actions/auth-guard";
import type { ActionResult } from "@/types";

function parseServiceForm(formData: FormData) {
  const pricingType = formData.get("pricingType");
  return serviceSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
    basePrice: formData.get("basePrice"),
    isActive: formData.get("isActive") === "on",
    pricingType,
    fixedServiceCheckoutMode:
      pricingType === "FIXED"
        ? (formData.get("fixedServiceCheckoutMode") ?? "REQUEST_ONLY")
        : "REQUEST_ONLY",
    requiresSchedulingDetails: formData.get("requiresSchedulingDetails") === "on"
  });
}

function toDecimal(value: string | null) {
  return value ? new Prisma.Decimal(value) : null;
}

export async function createService(
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const { profile } = await requireProviderProfile();

  if (!profile) {
    redirect("/dashboard/servicos?error=profile");
  }

  const parsed = parseServiceForm(formData);
  if (!parsed.success) {
    return { error: "Dados inválidos. Revise os campos e tente novamente." };
  }

  if (parsed.data.fixedServiceCheckoutMode === "ALLOW_PIX_RESERVATION") {
    const profilePix = await prisma.providerProfile.findUnique({
      where: { id: profile.id },
      select: { pixKey: true, pixHolderName: true, pixCity: true }
    });
    const pixConfigured = !!(
      profilePix?.pixKey &&
      profilePix?.pixHolderName &&
      profilePix?.pixCity
    );
    if (!pixConfigured) {
      return {
        error:
          "Configure sua chave Pix, nome do titular e cidade no perfil antes de ativar pagamento via Pix."
      };
    }
  }

  if (parsed.data.isActive) {
    const activeServicesCount = await prisma.service.count({
      where: { providerId: profile.id, isActive: true }
    });
    const limit = getPlanLimit(profile.plan, "activeServices");
    if (hasReachedLimit(activeServicesCount, limit)) {
      return { error: LIMIT_ERROR_MESSAGES[PLAN_LIMIT_ERROR_CODES.activeServices] };
    }
  }

  const newService = await prisma.service.create({
    data: {
      providerId: profile.id,
      name: parsed.data.name,
      description: parsed.data.description,
      basePrice: toDecimal(parsed.data.basePrice),
      isActive: parsed.data.isActive,
      pricingType: parsed.data.pricingType,
      fixedServiceCheckoutMode: parsed.data.fixedServiceCheckoutMode,
      requiresSchedulingDetails: parsed.data.requiresSchedulingDetails
    },
    select: { id: true }
  });

  revalidatePath("/dashboard/servicos");
  return { serviceId: newService.id };
}

export async function updateService(
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const { profile } = await requireProviderProfile();
  const serviceId = String(formData.get("serviceId") ?? "");

  if (!profile) {
    redirect("/dashboard/servicos?error=profile");
  }

  if (!serviceId) {
    return { error: "Dados inválidos. Revise os campos e tente novamente." };
  }

  const parsed = parseServiceForm(formData);
  if (!parsed.success) {
    return { error: "Dados inválidos. Revise os campos e tente novamente." };
  }

  if (parsed.data.fixedServiceCheckoutMode === "ALLOW_PIX_RESERVATION") {
    const profilePix = await prisma.providerProfile.findUnique({
      where: { id: profile.id },
      select: { pixKey: true, pixHolderName: true, pixCity: true }
    });
    const pixConfigured = !!(
      profilePix?.pixKey &&
      profilePix?.pixHolderName &&
      profilePix?.pixCity
    );
    if (!pixConfigured) {
      return {
        error:
          "Configure sua chave Pix, nome do titular e cidade no perfil antes de ativar pagamento via Pix."
      };
    }
  }

  const service = await prisma.service.findFirst({
    where: { id: serviceId, providerId: profile.id },
    select: { id: true, isActive: true }
  });

  if (!service) {
    redirect("/dashboard/servicos?error=not-found");
  }

  if (!service.isActive && parsed.data.isActive) {
    const activeServicesCount = await prisma.service.count({
      where: { providerId: profile.id, isActive: true }
    });
    const limit = getPlanLimit(profile.plan, "activeServices");
    if (hasReachedLimit(activeServicesCount, limit)) {
      return { error: LIMIT_ERROR_MESSAGES[PLAN_LIMIT_ERROR_CODES.activeServices] };
    }
  }

  await prisma.service.update({
    where: { id: service.id },
    data: {
      name: parsed.data.name,
      description: parsed.data.description,
      basePrice: toDecimal(parsed.data.basePrice),
      isActive: parsed.data.isActive,
      pricingType: parsed.data.pricingType,
      fixedServiceCheckoutMode: parsed.data.fixedServiceCheckoutMode,
      requiresSchedulingDetails: parsed.data.requiresSchedulingDetails
    }
  });

  revalidatePath("/dashboard/servicos");
  return { serviceId: service.id };
}

export async function deleteService(formData: FormData) {
  const { profile } = await requireProviderProfile();
  const serviceId = String(formData.get("serviceId") ?? "");

  if (!profile) {
    redirect("/dashboard/servicos?error=profile");
  }

  const service = await prisma.service.findFirst({
    where: { id: serviceId, providerId: profile.id },
    select: { id: true }
  });

  if (!service) {
    redirect("/dashboard/servicos?error=not-found");
  }

  await prisma.service.delete({ where: { id: service.id } });

  revalidatePath("/dashboard/servicos");
  redirect("/dashboard/servicos");
}

export async function toggleServiceStatus(formData: FormData) {
  const { profile } = await requireProviderProfile();
  const serviceId = String(formData.get("serviceId") ?? "");
  const nextStatus = formData.get("nextStatus") === "true";

  if (!profile) {
    redirect("/dashboard/servicos?error=profile");
  }

  const service = await prisma.service.findFirst({
    where: { id: serviceId, providerId: profile.id },
    select: { id: true, isActive: true }
  });

  if (!service) {
    redirect("/dashboard/servicos?error=not-found");
  }

  if (!service.isActive && nextStatus) {
    const activeServicesCount = await prisma.service.count({
      where: { providerId: profile.id, isActive: true }
    });
    const limit = getPlanLimit(profile.plan, "activeServices");
    if (hasReachedLimit(activeServicesCount, limit)) {
      redirect(`/dashboard/servicos?error=${PLAN_LIMIT_ERROR_CODES.activeServices}`);
    }
  }

  await prisma.service.update({
    where: { id: service.id },
    data: { isActive: nextStatus }
  });

  revalidatePath("/dashboard/servicos");
  redirect("/dashboard/servicos");
}
