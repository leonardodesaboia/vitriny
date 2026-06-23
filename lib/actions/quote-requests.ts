"use server";

import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
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

  await prisma.quoteRequest.create({
    data: {
      providerId: profile.id,
      serviceId: parsed.data.serviceId,
      customerName: parsed.data.customerName,
      customerEmail: parsed.data.customerEmail,
      customerPhone: parsed.data.customerPhone,
      description: parsed.data.serviceId
        ? `Serviço selecionado: ${parsed.data.serviceId}\n\n${parsed.data.description}`
        : parsed.data.description,
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

  redirect(`/u/${slug}/orcamento?success=1`);
}
