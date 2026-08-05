import { NextResponse } from "next/server";
import { Payment } from "mercadopago";

import { auth } from "@/auth";
import { getMercadoPago } from "@/lib/mercadopago";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type InvoiceItem = {
  id: string;
  created: number;
  amountPaid: number;
  currency: string;
  status: string | null;
  hostedUrl: string | null;
};

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const profile = await prisma.providerProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true }
  });

  if (!profile) {
    return NextResponse.json({ invoices: [] });
  }

  let mpInvoices: InvoiceItem[] = [];
  try {
    const payment = new Payment(getMercadoPago());
    const mpSearch = await payment.search({
      options: { external_reference: profile.id, sort: "date_created", criteria: "desc", limit: 10 }
    });

    mpInvoices = (mpSearch.results ?? []).map((p) => ({
      id: String(p.id),
      created: p.date_created ? Math.floor(new Date(p.date_created).getTime() / 1000) : 0,
      amountPaid: Math.round((p.transaction_amount ?? 0) * 100),
      currency: (p.currency_id ?? "BRL").toLowerCase(),
      status: p.status ?? null,
      hostedUrl: null
    }));
  } catch (error) {
    console.error("Erro ao buscar pagamentos Mercado Pago para faturas.", {
      profileId: profile.id,
      errorName: error instanceof Error ? error.name : "UnknownError",
      errorMessage: error instanceof Error ? error.message : "Erro desconhecido"
    });
  }

  const invoices = mpInvoices.sort((a, b) => b.created - a.created);

  return NextResponse.json({ invoices });
}
