"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import type { BusinessType, ProviderThemePreset } from "@prisma/client";

import { canUseThemePresets } from "@/lib/plan-limits";
import { prisma } from "@/lib/prisma";
import { providerProfileSchema } from "@/lib/validations/provider-profile";
import { requireAuth } from "@/lib/actions/auth-guard";
import { sanitizeProfileLinks } from "@/lib/profile-links";

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
  businessType: BusinessType;
  address: string;
  instagram: string;
  facebook: string;
  tiktok: string;
  businessHours: string;
  links: { label: string; url: string }[];
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
  const businessType = formValue(formData, "businessType");

  const linkLabels = formData.getAll("linkLabel");
  const linkUrls = formData.getAll("linkUrl");
  const links = linkLabels.map((label, index) => ({
    label: typeof label === "string" ? label : "",
    url: typeof linkUrls[index] === "string" ? (linkUrls[index] as string) : "",
  }));

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
    themePreset: (themePreset || "DEFAULT") as ProviderThemePreset,
    businessType: (businessType || "SERVICES") as BusinessType,
    address: formValue(formData, "address"),
    instagram: formValue(formData, "instagram"),
    facebook: formValue(formData, "facebook"),
    tiktok: formValue(formData, "tiktok"),
    businessHours: formValue(formData, "businessHours"),
    links
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

  const { links: sanitizedLinks, errors: linkErrors } = sanitizeProfileLinks(
    values.links
  );
  if (linkErrors.length > 0) {
    return { error: linkErrors[0], values, submittedAt: Date.now() };
  }

  const { businessHours, ...profileData } = parsed.data;

  const dataToSave = {
    ...profileData,
    businessHours: businessHours ?? Prisma.DbNull,
    links: sanitizedLinks.length > 0 ? sanitizedLinks : Prisma.DbNull,
    themePreset:
      currentProfile?.plan && canUseThemePresets(currentProfile.plan)
        ? parsed.data.themePreset
        : currentProfile?.themePreset ?? "DEFAULT"
  };

  try {
    await prisma.providerProfile.upsert({
      where: { userId },
      create: { ...dataToSave, userId },
      update: dataToSave
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2003"
    ) {
      // Session references a user that no longer exists in the DB (stale JWT after a DB reset).
      redirect("/api/auth/signout?callbackUrl=/login");
    }
    throw error;
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/perfil");
  redirect("/dashboard");
}
