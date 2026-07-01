import { randomUUID } from "crypto";
import { type NextRequest, NextResponse } from "next/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { uploadToStorage, deleteFromStorage } from "@/lib/storage";

const MAX_SIZE_BYTES = 2 * 1024 * 1024;

function detectImageMimeType(buf: Buffer): string | null {
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (
    buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47 &&
    buf[4] === 0x0d && buf[5] === 0x0a && buf[6] === 0x1a && buf[7] === 0x0a
  ) return "image/png";
  if (
    buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 &&
    buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50
  ) return "image/webp";
  return null;
}

type RouteContext = { params: Promise<{ id: string }> };

async function resolveService(userId: string, serviceId: string) {
  const profile = await prisma.providerProfile.findUnique({
    where: { userId },
    select: { id: true, plan: true }
  });

  if (!profile) return { profile: null, service: null };

  const service = await prisma.service.findFirst({
    where: { id: serviceId, providerId: profile.id },
    select: { id: true, imageStorageKey: true }
  });

  return { profile, service };
}

export async function POST(req: NextRequest, { params }: RouteContext) {
  const { id: serviceId } = await params;

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const { profile, service } = await resolveService(session.user.id, serviceId);

  if (!profile) {
    return NextResponse.json({ error: "Dados do negócio não encontrados." }, { status: 404 });
  }

  if (profile.plan !== "PRO") {
    return NextResponse.json(
      { error: "Recurso disponível apenas no plano PRO." },
      { status: 403 }
    );
  }

  if (!service) {
    return NextResponse.json({ error: "Item não encontrado." }, { status: 404 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Requisição inválida." }, { status: 400 });
  }

  const file = formData.get("image");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Nenhuma imagem enviada." }, { status: 400 });
  }

  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json(
      { error: "Imagem muito grande. Limite de 2 MB." },
      { status: 400 }
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const detectedMime = detectImageMimeType(buffer);

  if (!detectedMime) {
    return NextResponse.json(
      { error: "Arquivo inválido. Envie uma imagem JPEG, PNG ou WebP real." },
      { status: 400 }
    );
  }

  if (service.imageStorageKey) {
    try {
      await deleteFromStorage(service.imageStorageKey);
    } catch (err) {
      console.error("Falha ao deletar imagem anterior.", {
        key: service.imageStorageKey,
        err
      });
    }
  }

  const ext = detectedMime === "image/jpeg" ? "jpg" : detectedMime === "image/png" ? "png" : "webp";
  const storageKey = `services/${serviceId}/${randomUUID()}.${ext}`;

  let imageUrl: string;
  try {
    imageUrl = await uploadToStorage(storageKey, buffer, detectedMime);
  } catch (err) {
    console.error("Falha ao enviar imagem para o storage.", { err });
    return NextResponse.json(
      { error: "Falha ao enviar imagem. Tente novamente." },
      { status: 500 }
    );
  }

  await prisma.service.update({
    where: { id: service.id },
    data: { imageUrl, imageStorageKey: storageKey }
  });

  return NextResponse.json({ imageUrl });
}

export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  const { id: serviceId } = await params;

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const { profile, service } = await resolveService(session.user.id, serviceId);

  if (!profile) {
    return NextResponse.json({ error: "Dados do negócio não encontrados." }, { status: 404 });
  }

  if (profile.plan !== "PRO") {
    return NextResponse.json(
      { error: "Recurso disponível apenas no plano PRO." },
      { status: 403 }
    );
  }

  if (!service) {
    return NextResponse.json({ error: "Item não encontrado." }, { status: 404 });
  }

  if (!service.imageStorageKey) {
    return NextResponse.json({ error: "Este item não tem imagem." }, { status: 404 });
  }

  try {
    await deleteFromStorage(service.imageStorageKey);
  } catch (err) {
    console.error("Falha ao deletar imagem do storage.", {
      key: service.imageStorageKey,
      err
    });
    return NextResponse.json(
      { error: "Falha ao remover imagem. Tente novamente." },
      { status: 500 }
    );
  }

  await prisma.service.update({
    where: { id: service.id },
    data: { imageUrl: null, imageStorageKey: null }
  });

  return NextResponse.json({ success: true });
}
