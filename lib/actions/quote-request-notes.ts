"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { quoteRequestNoteSchema } from "@/lib/validations/quote-request-note";
import { requireProviderProfile } from "@/lib/actions/auth-guard";
import { resolveQuoteRequestReturnPath } from "@/lib/actions/return-path";

function revalidateQuoteRequestPages() {
  revalidatePath("/dashboard/pedidos");
  revalidatePath("/dashboard/pedidos/[id]", "page");
}

export async function createQuoteRequestNote(formData: FormData) {
  const { profile, userId } = await requireProviderProfile();
  const returnTo = resolveQuoteRequestReturnPath(formData.get("returnTo"));

  if (!profile) {
    redirect(`${returnTo}?error=profile`);
  }

  const parsed = quoteRequestNoteSchema.safeParse({
    requestId: formData.get("requestId"),
    content: formData.get("content")
  });

  if (!parsed.success) {
    redirect(`${returnTo}?error=invalid`);
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
    redirect(`${returnTo}?error=not-found`);
  }

  await prisma.quoteRequestInternalNote.create({
    data: {
      quoteRequestId: quoteRequest.id,
      authorUserId: userId,
      content: parsed.data.content
    }
  });

  revalidateQuoteRequestPages();
}

export async function updateQuoteRequestNote(formData: FormData) {
  const { profile } = await requireProviderProfile();
  const noteId = String(formData.get("noteId") ?? "");
  const content = String(formData.get("content") ?? "");
  const returnTo = resolveQuoteRequestReturnPath(formData.get("returnTo"));

  if (!profile) redirect(`${returnTo}?error=profile`);
  if (!noteId) redirect(`${returnTo}?error=invalid`);

  const parsed = quoteRequestNoteSchema.shape.content.safeParse(content);
  if (!parsed.success) redirect(`${returnTo}?error=invalid`);

  const note = await prisma.quoteRequestInternalNote.findFirst({
    where: { id: noteId, quoteRequest: { providerId: profile.id } },
    select: { id: true }
  });

  if (!note) redirect(`${returnTo}?error=not-found`);

  await prisma.quoteRequestInternalNote.update({
    where: { id: note.id },
    data: { content: parsed.data }
  });

  revalidateQuoteRequestPages();
}

export async function deleteQuoteRequestNote(formData: FormData) {
  const { profile } = await requireProviderProfile();
  const noteId = String(formData.get("noteId") ?? "");
  const returnTo = resolveQuoteRequestReturnPath(formData.get("returnTo"));

  if (!profile) {
    redirect(`${returnTo}?error=profile`);
  }

  if (!noteId) {
    redirect(`${returnTo}?error=invalid`);
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
    redirect(`${returnTo}?error=not-found`);
  }

  await prisma.quoteRequestInternalNote.delete({
    where: {
      id: note.id
    }
  });

  revalidateQuoteRequestPages();
  redirect(returnTo);
}
