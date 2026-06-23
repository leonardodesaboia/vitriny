"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { proposalTemplateSchema } from "@/lib/validations/proposal-template";

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

function decimalFromString(value: string) {
  return new Prisma.Decimal(value);
}

function parseTemplateForm(formData: FormData) {
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

  return proposalTemplateSchema.safeParse({
    templateId: formData.get("templateId") || undefined,
    name: formData.get("name"),
    title: formData.get("title"),
    description: formData.get("description"),
    items
  });
}

function mapTemplateItems(
  items: Array<{ description: string; quantity: number; unitPrice: string }>
) {
  return items.map((item) => ({
    description: item.description,
    quantity: item.quantity,
    unitPrice: decimalFromString(item.unitPrice)
  }));
}

export async function createProposalTemplate(formData: FormData) {
  const profile = await getCurrentProviderProfile();

  if (!profile) {
    redirect("/dashboard/pedidos?error=profile");
  }

  const parsed = parseTemplateForm(formData);

  if (!parsed.success) {
    redirect("/dashboard/pedidos?error=invalid");
  }

  await prisma.proposalTemplate.create({
    data: {
      providerId: profile.id,
      name: parsed.data.name,
      title: parsed.data.title,
      description: parsed.data.description,
      items: {
        create: mapTemplateItems(parsed.data.items)
      }
    }
  });

  revalidatePath("/dashboard/pedidos");
  redirect("/dashboard/pedidos");
}

export async function updateProposalTemplate(formData: FormData) {
  const profile = await getCurrentProviderProfile();
  const parsed = parseTemplateForm(formData);

  if (!profile) {
    redirect("/dashboard/pedidos?error=profile");
  }

  if (!parsed.success || !parsed.data.templateId) {
    redirect("/dashboard/pedidos?error=invalid");
  }

  const template = await prisma.proposalTemplate.findFirst({
    where: {
      id: parsed.data.templateId,
      providerId: profile.id
    },
    select: {
      id: true
    }
  });

  if (!template) {
    redirect("/dashboard/pedidos?error=not-found");
  }

  await prisma.$transaction(async (tx) => {
    await tx.proposalTemplate.update({
      where: {
        id: template.id
      },
      data: {
        name: parsed.data.name,
        title: parsed.data.title,
        description: parsed.data.description
      }
    });

    await tx.proposalTemplateItem.deleteMany({
      where: {
        templateId: template.id
      }
    });

    await tx.proposalTemplateItem.createMany({
      data: mapTemplateItems(parsed.data.items).map((item) => ({
        ...item,
        templateId: template.id
      }))
    });
  });

  revalidatePath("/dashboard/pedidos");
  redirect("/dashboard/pedidos");
}

export async function deleteProposalTemplate(formData: FormData) {
  const profile = await getCurrentProviderProfile();
  const templateId = String(formData.get("templateId") ?? "");

  if (!profile) {
    redirect("/dashboard/pedidos?error=profile");
  }

  if (!templateId) {
    redirect("/dashboard/pedidos?error=invalid");
  }

  const template = await prisma.proposalTemplate.findFirst({
    where: {
      id: templateId,
      providerId: profile.id
    },
    select: {
      id: true
    }
  });

  if (!template) {
    redirect("/dashboard/pedidos?error=not-found");
  }

  await prisma.proposalTemplate.delete({
    where: {
      id: template.id
    }
  });

  revalidatePath("/dashboard/pedidos");
  redirect("/dashboard/pedidos");
}
