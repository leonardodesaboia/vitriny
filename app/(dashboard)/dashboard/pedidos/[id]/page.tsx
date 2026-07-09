import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { auth } from "@/auth";
import { QuoteRequestDetails } from "@/components/quote-request/QuoteRequestDetails";
import { serializeQuoteRequest } from "@/components/quote-request/serialize";
import { statusBadge, statusLabels } from "@/components/quote-request/format";
import { prisma } from "@/lib/prisma";

type RequestDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function RequestDetailPage({ params }: RequestDetailPageProps) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { id } = await params;

  const profile = await prisma.providerProfile.findUnique({
    where: { userId: session.user.id },
    select: {
      id: true,
      pixKey: true,
      pixHolderName: true,
      services: { select: { id: true, name: true } }
    }
  });
  if (!profile) redirect("/dashboard/pedidos?error=profile");

  // Ownership: pedido de outro negócio é 404, não erro.
  const quoteRequest = await prisma.quoteRequest.findFirst({
    where: { id, providerId: profile.id },
    include: {
      service: {
        select: {
          id: true,
          name: true,
          itemType: true,
          pricingType: true,
          fixedServiceCheckoutMode: true,
          basePrice: true
        }
      },
      proposal: {
        select: {
          depositAmount: true,
          depositPaidAt: true,
          id: true,
          publicToken: true,
          respondedAt: true,
          status: true
        }
      },
      statusHistory: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          fromStatus: true,
          toStatus: true,
          actor: true,
          note: true,
          createdAt: true
        }
      },
      internalNotes: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          content: true,
          createdAt: true,
          author: { select: { name: true, email: true } }
        }
      }
    }
  });
  if (!quoteRequest) notFound();

  const serviceNamesById = Object.fromEntries(
    profile.services.map((service) => [service.id, service.name])
  );

  return (
    <div className="min-w-0 p-4 sm:p-6 md:p-8">
      <Link
        className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-widest text-ink-muted transition hover:text-leaf"
        href="/dashboard/pedidos"
      >
        ← Pedidos
      </Link>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <h1 className="font-fraunces text-3xl font-bold text-ink sm:text-4xl">
          {quoteRequest.customerName}
        </h1>
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusBadge[quoteRequest.status] ?? "bg-paper-soft text-ink-muted"}`}
        >
          {statusLabels[quoteRequest.status]}
        </span>
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border border-paper-soft bg-white shadow-card">
        <QuoteRequestDetails
          pixInfo={
            profile.pixKey && profile.pixHolderName
              ? { pixKey: profile.pixKey, pixHolderName: profile.pixHolderName }
              : null
          }
          quoteRequest={serializeQuoteRequest(quoteRequest)}
          serviceNamesById={serviceNamesById}
        />
      </div>
    </div>
  );
}
