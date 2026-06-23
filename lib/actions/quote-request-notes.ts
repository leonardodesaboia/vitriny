"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { quoteRequestNoteSchema } from "@/lib/validations/quote-request-note";

async function getCurrentProviderProfile() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const profile = await prisma.providerProfile.findUnique({
    where: {
      userId: session.user.id
    },
    select: {
      id: true
    }
  });

  return {
    profile,
    userId: session.user.id
  };
}

export async function createQuoteRequestNote(formData: FormData) {
  const { profile, userId } = await getCurrentProviderProfile();

  if (!profile) {
    redirect("/dashboard/pedidos?error=profile");
  }

  const parsed = quoteRequestNoteSchema.safeParse({
    requestId: formData.get("requestId"),
    content: formData.get("content")
  });

  if (!parsed.success) {
    redirect("/dashboard/pedidos?error=invalid");
  }

  const quoteRequest = await prisma.quoteRequest.findFirst({
    where: {
      id: parsed.data.requestId,
      providerId: profile.id
    },
    select: {
      id: true
    }
  });

  if (!quoteRequest) {
    redirect("/dashboard/pedidos?error=not-found");
  }

  await prisma.quoteRequestInternalNote.create({
    data: {
      quoteRequestId: quoteRequest.id,
      authorUserId: userId,
      content: parsed.data.content
    }
  });

  revalidatePath("/dashboard/pedidos");
  redirect("/dashboard/pedidos");
}

export async function deleteQuoteRequestNote(formData: FormData) {
  const { profile } = await getCurrentProviderProfile();
  const noteId = String(formData.get("noteId") ?? "");

  if (!profile) {
    redirect("/dashboard/pedidos?error=profile");
  }

  if (!noteId) {
    redirect("/dashboard/pedidos?error=invalid");
  }

  const note = await prisma.quoteRequestInternalNote.findFirst({
    where: {
      id: noteId,
      quoteRequest: {
        providerId: profile.id
      }
    },
    select: {
      id: true
    }
  });

  if (!note) {
    redirect("/dashboard/pedidos?error=not-found");
  }

  await prisma.quoteRequestInternalNote.delete({
    where: {
      id: note.id
    }
  });

  revalidatePath("/dashboard/pedidos");
  redirect("/dashboard/pedidos");
}
