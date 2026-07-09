"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { quoteRequestStatusSchema } from "@/lib/validations/quote-request-status";
import { requireProviderProfile } from "@/lib/actions/auth-guard";
import { resolveQuoteRequestReturnPath } from "@/lib/actions/return-path";

export async function updateQuoteRequestStatus(formData: FormData) {
  const { profile } = await requireProviderProfile();
  const requestId = String(formData.get("requestId") ?? "");
  const returnTo = resolveQuoteRequestReturnPath(formData.get("returnTo"));
  const parsed = quoteRequestStatusSchema.safeParse(formData.get("status"));

  if (!profile) {
    redirect(`${returnTo}?error=profile`);
  }

  if (!requestId || !parsed.success) {
    redirect(`${returnTo}?error=invalid`);
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
    redirect(`${returnTo}?error=not-found`);
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
  revalidatePath("/dashboard/pedidos/[id]", "page");
  redirect(returnTo);
}
