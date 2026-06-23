"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { quoteRequestStatusSchema } from "@/lib/validations/quote-request-status";

export async function updateQuoteRequestStatus(formData: FormData) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const requestId = String(formData.get("requestId") ?? "");
  const parsed = quoteRequestStatusSchema.safeParse(formData.get("status"));

  if (!requestId || !parsed.success) {
    redirect("/dashboard/pedidos?error=invalid");
  }

  const profile = await prisma.providerProfile.findUnique({
    where: {
      userId: session.user.id
    },
    select: {
      id: true
    }
  });

  if (!profile) {
    redirect("/dashboard/pedidos?error=profile");
  }

  const quoteRequest = await prisma.quoteRequest.findFirst({
    where: {
      id: requestId,
      providerId: profile.id
    },
    select: {
      id: true,
      status: true
    }
  });

  if (!quoteRequest) {
    redirect("/dashboard/pedidos?error=not-found");
  }

  if (quoteRequest.status !== parsed.data) {
    await prisma.$transaction(async (tx) => {
      await tx.quoteRequest.update({
        where: {
          id: quoteRequest.id
        },
        data: {
          status: parsed.data
        }
      });

      await tx.quoteRequestStatusHistory.create({
        data: {
          quoteRequestId: quoteRequest.id,
          fromStatus: quoteRequest.status,
          toStatus: parsed.data,
          actor: "PROVIDER",
          note: "Status atualizado manualmente pelo prestador."
        }
      });
    });
  }

  revalidatePath("/dashboard/pedidos");
  redirect("/dashboard/pedidos");
}
