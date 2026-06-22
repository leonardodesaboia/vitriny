"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { serviceSchema } from "@/lib/validations/service";

async function getCurrentProviderProfile() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  return prisma.providerProfile.findUnique({
    where: {
      userId: session.user.id
    },
    select: {
      id: true
    }
  });
}

function parseServiceForm(formData: FormData) {
  return serviceSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
    basePrice: formData.get("basePrice"),
    isActive: formData.get("isActive") === "on"
  });
}

function toDecimal(value: string | null) {
  return value ? new Prisma.Decimal(value) : null;
}

export async function createService(formData: FormData) {
  const profile = await getCurrentProviderProfile();

  if (!profile) {
    redirect("/dashboard/servicos?error=profile");
  }

  const parsed = parseServiceForm(formData);

  if (!parsed.success) {
    redirect("/dashboard/servicos?error=invalid");
  }

  await prisma.service.create({
    data: {
      providerId: profile.id,
      name: parsed.data.name,
      description: parsed.data.description,
      basePrice: toDecimal(parsed.data.basePrice),
      isActive: parsed.data.isActive
    }
  });

  revalidatePath("/dashboard/servicos");
  redirect("/dashboard/servicos");
}

export async function updateService(formData: FormData) {
  const profile = await getCurrentProviderProfile();
  const serviceId = String(formData.get("serviceId") ?? "");

  if (!profile) {
    redirect("/dashboard/servicos?error=profile");
  }

  if (!serviceId) {
    redirect("/dashboard/servicos?error=invalid");
  }

  const parsed = parseServiceForm(formData);

  if (!parsed.success) {
    redirect("/dashboard/servicos?error=invalid");
  }

  const service = await prisma.service.findFirst({
    where: {
      id: serviceId,
      providerId: profile.id
    },
    select: {
      id: true
    }
  });

  if (!service) {
    redirect("/dashboard/servicos?error=not-found");
  }

  await prisma.service.update({
    where: {
      id: service.id
    },
    data: {
      name: parsed.data.name,
      description: parsed.data.description,
      basePrice: toDecimal(parsed.data.basePrice),
      isActive: parsed.data.isActive
    }
  });

  revalidatePath("/dashboard/servicos");
  redirect("/dashboard/servicos");
}

export async function toggleServiceStatus(formData: FormData) {
  const profile = await getCurrentProviderProfile();
  const serviceId = String(formData.get("serviceId") ?? "");
  const nextStatus = formData.get("nextStatus") === "true";

  if (!profile) {
    redirect("/dashboard/servicos?error=profile");
  }

  const service = await prisma.service.findFirst({
    where: {
      id: serviceId,
      providerId: profile.id
    },
    select: {
      id: true
    }
  });

  if (!service) {
    redirect("/dashboard/servicos?error=not-found");
  }

  await prisma.service.update({
    where: {
      id: service.id
    },
    data: {
      isActive: nextStatus
    }
  });

  revalidatePath("/dashboard/servicos");
  redirect("/dashboard/servicos");
}
