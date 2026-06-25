import Link from "next/link";
import { notFound } from "next/navigation";

import { QuoteRequestForm } from "@/components/quote-request/QuoteRequestForm";
import { PUBLIC_LIMIT_ERROR_MESSAGES } from "@/lib/plan-limits";
import { prisma } from "@/lib/prisma";

type PublicQuoteRequestPageProps = {
  params: Promise<{
    slug: string;
  }>;
  searchParams: Promise<{
    error?: string;
    serviceId?: string;
    success?: string;
  }>;
};

const errorMessages: Record<string, string> = {
  invalid: "Revise os dados do pedido.",
  service: "O serviço selecionado não está disponível.",
  unavailable: "Este perfil não está disponível para pedidos.",
  "limit-monthly-quote-requests":
    PUBLIC_LIMIT_ERROR_MESSAGES["limit-monthly-quote-requests"]
};

export default async function PublicQuoteRequestPage({
  params,
  searchParams
}: PublicQuoteRequestPageProps) {
  const { slug } = await params;
  const query = await searchParams;

  const profile = await prisma.providerProfile.findUnique({
    where: { slug },
    select: {
      businessName: true,
      isPublished: true,
      services: {
        where: { isActive: true },
        orderBy: { name: "asc" },
        select: { id: true, name: true, pricingType: true, basePrice: true }
      }
    }
  });

  if (!profile || !profile.isPublished) notFound();

  const selectedServiceId = profile.services.some(
    (service) => service.id === query.serviceId
  )
    ? query.serviceId
    : null;

  const selectedService = selectedServiceId
    ? profile.services.find((s) => s.id === selectedServiceId) ?? null
    : null;

  return (
    <main className="min-h-screen bg-paper px-6 py-12 text-ink">
      <div className="mx-auto max-w-lg">
        {/* Back link */}
        <Link
          className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-widest text-ink-muted transition hover:text-leaf"
          href={`/u/${slug}`}
        >
          ← Voltar ao perfil
        </Link>

        {/* Header */}
        <div className="mt-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-leaf">
            {selectedService?.pricingType === "FIXED"
              ? "Solicitação de serviço"
              : "Pedido de orçamento"}
          </p>
          <h1 className="mt-2 font-fraunces text-4xl font-bold text-ink">
            {profile.businessName}
          </h1>
          <p className="mt-3 text-sm leading-6 text-ink-muted">
            Envie as informações iniciais para que o prestador avalie seu pedido.
          </p>
        </div>

        {/* Progress bar decoration */}
        <div className="mt-6 flex gap-1">
          <div className="h-1 flex-1 rounded-full bg-amber" />
          <div className="h-1 flex-1 rounded-full bg-paper-soft" />
          <div className="h-1 flex-1 rounded-full bg-paper-soft" />
        </div>

        {/* Success state */}
        {query.success ? (
          <div className="mt-8 rounded-xl border border-mint bg-mint/40 p-6">
            <p className="font-fraunces text-xl font-bold text-leaf">
              Pedido enviado!
            </p>
            <p className="mt-2 text-sm leading-6 text-ink-muted">
              Seu pedido foi registrado. O prestador avaliará as informações e
              retornará pelo contato informado.
            </p>
            <Link
              className="mt-4 inline-flex min-h-9 items-center justify-center rounded-md bg-leaf px-4 text-xs font-semibold text-white transition hover:bg-leaf-hover"
              href={`/u/${slug}`}
            >
              Voltar ao perfil
            </Link>
          </div>
        ) : (
          <>
            {query.error ? (
              <div className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
                <p className="text-sm font-semibold text-red-700">
                  {errorMessages[query.error] ?? "Não foi possível enviar o pedido."}
                </p>
              </div>
            ) : null}
            <QuoteRequestForm
              selectedServiceId={selectedServiceId}
              selectedService={
                selectedService
                  ? {
                      id: selectedService.id,
                      name: selectedService.name,
                      pricingType: selectedService.pricingType,
                      basePrice: selectedService.basePrice?.toString() ?? null
                    }
                  : null
              }
              services={profile.services.map((s) => ({
                id: s.id,
                name: s.name,
                pricingType: s.pricingType,
                basePrice: s.basePrice?.toString() ?? null
              }))}
              slug={slug}
            />
          </>
        )}
      </div>
    </main>
  );
}
