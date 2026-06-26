"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { quoteRequestNoteSchema } from "@/lib/validations/quote-request-note";
import { requireProviderProfile } from "@/lib/actions/auth-guard";

export async function createQuoteRequestNote(formData: FormData) {
  const { profile, userId } = await requireProviderProfile();

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
}

export async function updateQuoteRequestNote(formData: FormData) {
  const { profile } = await requireProviderProfile();
  const noteId = String(formData.get("noteId") ?? "");
  const content = String(formData.get("content") ?? "");

  if (!profile) redirect("/dashboard/pedidos?error=profile");
  if (!noteId) redirect("/dashboard/pedidos?error=invalid");

  const parsed = quoteRequestNoteSchema.shape.content.safeParse(content);
  if (!parsed.success) redirect("/dashboard/pedidos?error=invalid");

  const note = await prisma.quoteRequestInternalNote.findFirst({
    where: { id: noteId, quoteRequest: { providerId: profile.id } },
    select: { id: true }
  });

  if (!note) redirect("/dashboard/pedidos?error=not-found");

  await prisma.quoteRequestInternalNote.update({
    where: { id: note.id },
    data: { content: parsed.data }
  });

  revalidatePath("/dashboard/pedidos");
}

export async function deleteQuoteRequestNote(formData: FormData) {
  const { profile } = await requireProviderProfile();
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
