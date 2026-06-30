// app/api/proposals/[id]/pdf/route.ts
import { createElement, type ReactElement } from "react";

import { type NextRequest, NextResponse } from "next/server";
import { renderToBuffer, type DocumentProps } from "@react-pdf/renderer";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ProposalPdf, type ProposalPdfData } from "@/components/proposals/ProposalPdf";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: RouteContext) {
  const { id } = await params;

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const profile = await prisma.providerProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });

  if (!profile) {
    return NextResponse.json({ error: "Perfil não encontrado." }, { status: 404 });
  }

  const proposal = await prisma.proposal.findFirst({
    where: { id, providerId: profile.id },
    include: {
      provider: {
        select: {
          businessName: true,
          email: true,
          phone: true,
          city: true,
          state: true,
        },
      },
      quoteRequest: {
        include: {
          service: { select: { name: true } },
        },
      },
      items: { orderBy: { createdAt: "asc" } },
      statusHistory: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!proposal) {
    return NextResponse.json({ error: "Proposta não encontrada." }, { status: 404 });
  }

  if (proposal.status !== "APPROVED" && proposal.status !== "REJECTED") {
    return NextResponse.json(
      { error: "PDF disponível apenas para propostas aprovadas ou recusadas." },
      { status: 400 }
    );
  }

  const data: ProposalPdfData = {
    title: proposal.title,
    description: proposal.description,
    publicToken: proposal.publicToken,
    status: proposal.status,
    totalAmount: proposal.totalAmount,
    depositAmount: proposal.depositAmount,
    depositPaidAt: proposal.depositPaidAt,
    validUntil: proposal.validUntil,
    respondedAt: proposal.respondedAt,
    provider: proposal.provider,
    quoteRequest: {
      customerName: proposal.quoteRequest.customerName,
      customerEmail: proposal.quoteRequest.customerEmail,
      customerPhone: proposal.quoteRequest.customerPhone,
      desiredDate: proposal.quoteRequest.desiredDate,
      desiredTime: proposal.quoteRequest.desiredTime,
      location: proposal.quoteRequest.location,
      service: proposal.quoteRequest.service,
    },
    items: proposal.items.map((item) => ({
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      totalPrice: item.totalPrice,
    })),
    statusHistory: proposal.statusHistory.map((h) => ({
      fromStatus: h.fromStatus ?? null,
      toStatus: h.toStatus,
      actor: h.actor,
      createdAt: h.createdAt,
    })),
  };

  const buffer = await renderToBuffer(
    createElement(ProposalPdf, { proposal: data }) as ReactElement<DocumentProps>
  );

  const filename = `proposta-${proposal.publicToken}.pdf`;

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
