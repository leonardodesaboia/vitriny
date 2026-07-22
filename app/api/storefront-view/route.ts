import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isCountableView, toDayBucket } from "@/lib/storefront-views";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: { slug?: unknown; serviceId?: unknown } | null;
  try {
    body = (await request.json()) as {
      slug?: unknown;
      serviceId?: unknown;
    } | null;
  } catch {
    return new NextResponse(null, { status: 400 });
  }

  const slug = body?.slug;
  const serviceId = body?.serviceId;

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
    if (typeof serviceId === "string" && serviceId.length > 0) {
      // View de item: só conta se o item ativo pertence a ESTA vitrine.
      const service = await prisma.service.findFirst({
        where: { id: serviceId, providerId: profile.id, isActive: true },
        select: { id: true },
      });
      if (service) {
        await prisma.itemView.upsert({
          where: { serviceId_date: { serviceId: service.id, date } },
          create: { serviceId: service.id, date, count: 1 },
          update: { count: { increment: 1 } },
        });
      }
    } else {
      await prisma.storefrontView.upsert({
        where: { providerId_date: { providerId: profile.id, date } },
        create: { providerId: profile.id, date, count: 1 },
        update: { count: { increment: 1 } },
      });
    }
  } catch (error) {
    // A métrica nunca pode quebrar a vitrine; loga e segue.
    console.error("storefront-view upsert failed", error);
  }

  return new NextResponse(null, { status: 204 });
}
