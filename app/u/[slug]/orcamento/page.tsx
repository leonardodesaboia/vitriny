import Link from "next/link";
import { notFound } from "next/navigation";

import { QuoteRequestForm } from "@/components/quote-request/QuoteRequestForm";
import { PUBLIC_LIMIT_ERROR_MESSAGES } from "@/lib/plan-limits";
import { prisma } from "@/lib/prisma";
import { getPublicThemePreset } from "@/lib/theme-presets";
import { phoneToWhatsAppNumber } from "@/lib/utils/phone";

type PublicQuoteRequestPageProps = {
  params: Promise<{
    slug: string;
  }>;
  searchParams: Promise<{
    error?: string;
    serviceId?: string;
    success?: string;
    modo?: string;
  }>;
};

const errorMessages: Record<string, string> = {
  invalid: "Revise os dados do pedido.",
  service: "O item selecionado não está disponível.",
  unavailable: "Esta vitrine não está disponível para pedidos.",
  "scheduling-required": "Preencha data, horário e local para este item.",
  "limit-monthly-quote-requests":
    PUBLIC_LIMIT_ERROR_MESSAGES["limit-monthly-quote-requests"],
};

export default async function PublicQuoteRequestPage({
  params,
  searchParams,
}: PublicQuoteRequestPageProps) {
  const { slug } = await params;
  const query = await searchParams;

  const profile = await prisma.providerProfile.findUnique({
    where: { slug },
    select: {
      businessName: true,
      isPublished: true,
      plan: true,
      themePreset: true,
      phone: true,
      email: true,
      pixKey: true,
      pixHolderName: true,
      pixCity: true,
      services: {
        where: { isActive: true },
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          description: true,
          pricingType: true,
          fixedServiceCheckoutMode: true,
          basePrice: true,
          requiresSchedulingDetails: true,
        },
      },
    },
  });

  if (!profile || !profile.isPublished) notFound();

  const selectedServiceId = profile.services.some(
    (service) => service.id === query.serviceId,
  )
    ? query.serviceId
    : null;

  const selectedService = selectedServiceId
    ? (profile.services.find((s) => s.id === selectedServiceId) ?? null)
    : null;

  const pixConfigured = !!(
    profile.pixKey &&
    profile.pixHolderName &&
    profile.pixCity
  );

  const requiresPixPayment =
    selectedService?.pricingType === "FIXED" &&
    selectedService?.fixedServiceCheckoutMode === "REQUIRE_PIX_PAYMENT" &&
    pixConfigured;
  const theme = getPublicThemePreset(profile.plan, profile.themePreset);

  return (
    <main
      className="min-h-screen bg-paper px-6 py-12 text-ink font-jakarta"
      data-brand-theme={theme.id}
    >
      <div className="mx-auto max-w-lg">
        {/* Back link */}
        <Link
          className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-widest text-ink-muted transition hover:text-leaf"
          href={`/u/${slug}`}
        >
          ← Voltar à vitrine
        </Link>

        {/* Header */}
        <div className="mt-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-leaf">
            {requiresPixPayment
              ? "Pagamento com Pix"
              : selectedService?.pricingType === "FIXED"
                ? "Solicitação de item"
                : "Pedido de orçamento"}
          </p>
          <h1 className="mt-2 break-words font-fraunces text-4xl font-bold text-ink">
            {profile.businessName}
          </h1>
          <p className="mt-3 text-sm leading-6 text-ink-muted">
            {requiresPixPayment
              ? "Preencha seus dados. O pagamento via Pix é obrigatório para concluir a solicitação."
              : "Envie as informações iniciais para que o negócio avalie seu pedido."}
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
          <div
            aria-live="polite"
            className="mt-8 rounded-xl border border-mint bg-mint/40 p-6"
          >
            <p className="font-fraunces text-xl font-bold text-leaf">
              Pedido enviado!
            </p>
            <p className="mt-2 text-sm leading-6 text-ink-muted">
              Seu pedido foi registrado. O negócio avaliará as informações e
              retornará pelo contato informado.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              {profile.phone ? (
                <a
                  href={`https://wa.me/${phoneToWhatsAppNumber(profile.phone)}?text=${encodeURIComponent(`Olá! Acabei de enviar um pedido pelo seu link no Vitriny. Pode confirmar o recebimento?`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-9 items-center justify-center gap-2 rounded-md bg-leaf px-4 text-xs font-semibold text-white transition hover:bg-leaf-hover"
                >
                  <svg
                    className="h-4 w-4"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                  Enviar mensagem
                </a>
              ) : null}
              <Link
                className="inline-flex min-h-9 items-center justify-center rounded-md border border-mint px-4 text-xs font-semibold text-leaf transition hover:bg-mint/60"
                href={`/u/${slug}`}
              >
                Voltar à vitrine
              </Link>
            </div>
          </div>
        ) : (
          <>
            {query.error ? (
              <div className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
                <p className="text-sm font-semibold text-red-700">
                  {errorMessages[query.error] ??
                    "Não foi possível enviar o pedido."}
                </p>
              </div>
            ) : null}
            <QuoteRequestForm
              requiresPixPayment={requiresPixPayment}
              selectedServiceId={selectedServiceId}
              selectedService={
                selectedService
                  ? {
                      id: selectedService.id,
                      name: selectedService.name,
                      description: selectedService.description,
                      pricingType: selectedService.pricingType,
                      basePrice: selectedService.basePrice?.toString() ?? null,
                      requiresSchedulingDetails:
                        selectedService.requiresSchedulingDetails,
                    }
                  : null
              }
              services={profile.services.map((s) => ({
                id: s.id,
                name: s.name,
                description: s.description,
                pricingType: s.pricingType,
                fixedServiceCheckoutMode: s.fixedServiceCheckoutMode,
                basePrice: s.basePrice?.toString() ?? null,
                requiresSchedulingDetails: s.requiresSchedulingDetails,
              }))}
              slug={slug}
            />
          </>
        )}
      </div>
    </main>
  );
}
