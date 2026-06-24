"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { providerProfileSchema } from "@/lib/validations/provider-profile";
import { requireAuth } from "@/lib/actions/auth-guard";
import type { ActionResult } from "@/types";

export async function saveProviderProfile(
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const userId = await requireAuth();

  const parsed = providerProfileSchema.safeParse({
    businessName: formData.get("businessName"),
    slug: formData.get("slug"),
    description: formData.get("description"),
    phone: formData.get("phone"),
    email: formData.get("email"),
    city: formData.get("city"),
    state: formData.get("state"),
    isPublished: formData.get("isPublished") === "on"
  });

  if (!parsed.success) {
    return { error: "Dados inválidos. Revise os campos e tente novamente." };
  }

  const existingSlug = await prisma.providerProfile.findUnique({
    where: { slug: parsed.data.slug },
    select: { userId: true }
  });

  if (existingSlug && existingSlug.userId !== userId) {
    return { error: "Este slug já está em uso. Escolha outro." };
  }

  await prisma.providerProfile.upsert({
    where: { userId },
    create: { ...parsed.data, userId },
    update: parsed.data
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/perfil");
  redirect("/dashboard");
}
