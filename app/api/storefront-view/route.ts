import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isCountableView, toDayBucket } from "@/lib/storefront-views";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let slug: unknown;
  try {
    const body = await request.json();
    slug = (body as { slug?: unknown } | null)?.slug;
  } catch {
    return new NextResponse(null, { status: 400 });
  }

  if (typeof slug !== "string" || slug.length === 0) {
    return new NextResponse(null, { status: 400 });
  }

  const profile = await prisma.providerProfile.findUnique({
    where: { slug },
    select: { id: true, userId: true, isPublished: true },
  });

  // Vitrine inexistente ou não publicada: silencioso, não conta.
  if (!profile || !profile.isPublished) {
    return new NextResponse(null, { status: 204 });
  }

  const session = await auth();
  const isOwner = session?.user?.id === profile.userId;
  const userAgent = request.headers.get("user-agent");

  if (!isCountableView({ userAgent, isOwner })) {
    return new NextResponse(null, { status: 204 });
  }

  const date = toDayBucket(new Date());
  try {
    await prisma.storefrontView.upsert({
      where: { providerId_date: { providerId: profile.id, date } },
      create: { providerId: profile.id, date, count: 1 },
      update: { count: { increment: 1 } },
    });
  } catch (error) {
    // A métrica nunca pode quebrar a vitrine; loga e segue.
    console.error("storefront-view upsert failed", error);
  }

  return new NextResponse(null, { status: 204 });
}
