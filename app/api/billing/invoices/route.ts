import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const profile = await prisma.providerProfile.findUnique({
    where: { userId: session.user.id },
    select: { stripeCustomerId: true }
  });

  if (!profile?.stripeCustomerId) {
    return NextResponse.json({ invoices: [] });
  }

  const stripeInvoices = await stripe.invoices.list({
    customer: profile.stripeCustomerId,
    limit: 10
  });

  return NextResponse.json({
    invoices: stripeInvoices.data.map((inv) => ({
      id: inv.id,
      created: inv.created,
      amountPaid: inv.amount_paid,
      currency: inv.currency,
      status: inv.status ?? null,
      hostedUrl: inv.hosted_invoice_url ?? null
    }))
  });
}
