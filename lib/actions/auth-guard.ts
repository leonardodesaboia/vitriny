"use server";

import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function requireAuth(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return session.user.id;
}

export async function requireProviderProfile() {
  const userId = await requireAuth();
  const profile = await prisma.providerProfile.findUnique({
    where: { userId },
    select: { id: true, plan: true }
  });
  return { userId, profile };
}
