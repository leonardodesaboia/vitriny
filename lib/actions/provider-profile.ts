"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { ProviderThemePreset } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { providerProfileSchema } from "@/lib/validations/provider-profile";
import { requireAuth } from "@/lib/actions/auth-guard";

export type ProviderProfileFormValues = {
  businessName: string;
  slug: string;
  description: string;
  phone: string;
  email: string;
  city: string;
  state: string;
  isPublished: boolean;
  pixKey: string;
  pixKeyType: string;
  pixHolderName: string;
  pixCity: string;
  themePreset: ProviderThemePreset;
};

export type ProviderProfileFormState =
  | {
      error: string;
      values: ProviderProfileFormValues;
      submittedAt: number;
    }
  | undefined;

function formValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function readProviderProfileFormValues(
  formData: FormData
): ProviderProfileFormValues {
  const themePreset = formValue(formData, "themePreset");

  return {
    businessName: formValue(formData, "businessName"),
    slug: formValue(formData, "slug"),
    description: formValue(formData, "description"),
    phone: formValue(formData, "phone"),
    email: formValue(formData, "email"),
    city: formValue(formData, "city"),
    state: formValue(formData, "state"),
    isPublished: formData.get("isPublished") === "on",
    pixKey: formValue(formData, "pixKey"),
    pixKeyType: formValue(formData, "pixKeyType"),
    pixHolderName: formValue(formData, "pixHolderName"),
    pixCity: formValue(formData, "pixCity"),
    themePreset: (themePreset || "DEFAULT") as ProviderThemePreset
  };
}

export async function saveProviderProfile(
  _prevState: ProviderProfileFormState,
  formData: FormData
): Promise<ProviderProfileFormState> {
  const userId = await requireAuth();
  const values = readProviderProfileFormValues(formData);

  const parsed = providerProfileSchema.safeParse(values);

  if (!parsed.success) {
    return {
      error: "Dados inválidos. Revise os campos e tente novamente.",
      values,
      submittedAt: Date.now()
    };
  }

  const currentProfile = await prisma.providerProfile.findUnique({
    where: { userId },
    select: { plan: true, themePreset: true }
  });

  const existingSlug = await prisma.providerProfile.findUnique({
    where: { slug: parsed.data.slug },
    select: { userId: true }
  });

  if (existingSlug && existingSlug.userId !== userId) {
    return {
      error: "Este endereço público já está em uso. Escolha outro.",
      values,
      submittedAt: Date.now()
    };
  }

  const dataToSave = {
    ...parsed.data,
    themePreset:
      currentProfile?.plan === "PRO"
        ? parsed.data.themePreset
        : currentProfile?.themePreset ?? "DEFAULT"
  };

  await prisma.providerProfile.upsert({
    where: { userId },
    create: { ...dataToSave, userId },
    update: dataToSave
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/perfil");
  redirect("/dashboard");
}
