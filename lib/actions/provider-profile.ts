"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { providerProfileSchema } from "@/lib/validations/provider-profile";

export async function saveProviderProfile(formData: FormData) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

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
    redirect("/dashboard/perfil?error=invalid");
  }

  const existingSlug = await prisma.providerProfile.findUnique({
    where: {
      slug: parsed.data.slug
    },
    select: {
      userId: true
    }
  });

  if (existingSlug && existingSlug.userId !== session.user.id) {
    redirect("/dashboard/perfil?error=slug");
  }

  await prisma.providerProfile.upsert({
    where: {
      userId: session.user.id
    },
    create: {
      ...parsed.data,
      userId: session.user.id
    },
    update: parsed.data
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/perfil");
  redirect("/dashboard");
}
