import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

export const metadata: Metadata = {
  robots: { index: false, follow: false }
};

import { CopyPixButton } from "./CopyPixButton";
import { createPixPayment } from "@/lib/pix";
import { prisma } from "@/lib/prisma";
import { getPublicThemePreset } from "@/lib/theme-presets";
import { phoneToWhatsAppNumber } from "@/lib/utils/phone";
import { isPixPaymentExpired } from "@/lib/utils/date";

type PixReservationPageProps = {
  params: Promise<{
    slug: string;
    requestId: string;
  }>;
};

function formatMoney(value: string) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(Number(value));
}

export default async function PixReservationPage({ params }: PixReservationPageProps) {
  const { slug, requestId } = await params;

  const profile = await prisma.providerProfile.findUnique({
    where: { slug },
    select: {
      id: true,
      businessName: true,
      isPublished: true,
      plan: true,
      themePreset: true,
      pixKey: true,
      pixHolderName: true,
      pixCity: true,
      phone: true
    }
  });

  if (!profile || !profile.isPublished) notFound();

  const quoteRequest = await prisma.quoteRequest.findFirst({
    where: { id: requestId, providerId: profile.id },
    select: {
      id: true,
      customerName: true,
      fixedServiceAmount: true,
      pixReservationRequestedAt: true,
      pixReservationPaidAt: true,
      service: {
        select: {
          id: true,
          name: true,
          pricingType: true
        }
      }
    }
  });

  if (
    !quoteRequest ||
    !quoteRequest.service ||
    quoteRequest.service.pricingType !== "FIXED" ||
    !quoteRequest.pixReservationRequestedAt ||
    !quoteRequest.fixedServiceAmount
  ) {
    notFound();
  }

  const pixConfigured = !!(
    profile.pixKey &&
    profile.pixHolderName &&
    profile.pixCity
  );

  if (!pixConfigured) notFound();

  const amount = quoteRequest.fixedServiceAmount.toString();

  const { copyPasteCode, qrCodeDataUrl } = await createPixPayment({
    pixKey: profile.pixKey!,
    pixHolderName: profile.pixHolderName!,
    pixCity: profile.pixCity!,
    amount,
    transactionId: quoteRequest.id.replace(/-/g, "").slice(0, 25),
    description: quoteRequest.service.name
  });

  const alreadyPaid = !!quoteRequest.pixReservationPaidAt;
  const expired =
    !alreadyPaid &&
    isPixPaymentExpired(quoteRequest.pixReservationRequestedAt);
  const theme = getPublicThemePreset(profile.plan, profile.themePreset);
  const whatsappNumber = profile.phone
    ? phoneToWhatsAppNumber(profile.phone)
    : null;

  return (
    <main className="min-h-screen bg-paper px-4 py-12 text-ink font-jakarta sm:px-6" data-brand-theme={theme.id}>
      <div className="mx-auto max-w-lg">
        <Link
          className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-widest text-ink-muted transition hover:text-leaf"
          href={`/u/${slug}`}
        >
          ← Voltar ao perfil
        </Link>

        <div className="mt-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-leaf">
            Pagamento antecipado via Pix
          </p>
          <h1 className="mt-2 font-fraunces text-4xl font-bold text-ink">
            {quoteRequest.service.name}
          </h1>
          <p className="mt-2 text-sm text-ink-muted">
            {profile.businessName}
          </p>
        </div>

        <div className="mt-6 flex gap-1">
          <div className="h-1 flex-1 rounded-full bg-amber" />
          <div className="h-1 flex-1 rounded-full bg-amber" />
          <div className="h-1 flex-1 rounded-full bg-paper-soft" />
        </div>

        {alreadyPaid ? (
          <div className="mt-8 rounded-xl border border-mint bg-mint/40 p-6">
            <p className="font-fraunces text-xl font-bold text-leaf">
              Pagamento confirmado!
            </p>
            <p className="mt-2 text-sm leading-6 text-ink-muted">
              O prestador confirmou o recebimento do Pix. Sua solicitação está confirmada.
            </p>
            <Link
              className="mt-4 inline-flex min-h-9 items-center justify-center rounded-md bg-leaf px-4 text-xs font-semibold text-white transition hover:bg-leaf-hover"
              href={`/u/${slug}`}
            >
              Voltar ao perfil
            </Link>
          </div>
        ) : expired ? (
          <div className="mt-8 rounded-xl border border-red-200 bg-red-50 p-6">
            <p className="font-fraunces text-xl font-bold text-red-700">
              Código Pix expirado
            </p>
            <p className="mt-2 text-sm leading-6 text-ink-muted">
              O prazo para realizar este pagamento encerrou. Faça uma nova solicitação se ainda precisar do serviço.
            </p>
            <Link
              className="mt-4 inline-flex min-h-9 items-center justify-center rounded-md bg-leaf px-4 text-xs font-semibold text-white transition hover:bg-leaf-hover"
              href={`/u/${slug}`}
            >
              Voltar ao perfil
            </Link>
          </div>
        ) : (
          <div className="mt-8 grid gap-6">
            <div className="rounded-xl border border-paper-soft bg-white p-5 shadow-card">
              <p className="text-xs font-semibold uppercase tracking-widest text-ink-muted">
                Valor a pagar
              </p>
              <p className="mt-1 font-fraunces text-3xl font-bold text-ink">
                {formatMoney(amount)}
              </p>
            </div>

            <div className="rounded-xl border border-paper-soft bg-white p-5 shadow-card">
              <p className="text-xs font-semibold uppercase tracking-widest text-ink-muted">
                QR Code Pix
              </p>
              <div className="mt-4 flex justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  alt="QR Code Pix"
                  className="h-56 w-56 rounded-lg"
                  src={qrCodeDataUrl}
                />
              </div>
              <p className="mt-4 text-center text-xs text-ink-muted">
                Escaneie o QR Code com o app do seu banco
              </p>
            </div>

            <div className="rounded-xl border border-paper-soft bg-white p-5 shadow-card">
              <p className="text-xs font-semibold uppercase tracking-widest text-ink-muted">
                Pix Copia e Cola
              </p>
              <p className="mt-2 break-all rounded-lg bg-paper px-3 py-3 text-xs text-ink">
                {copyPasteCode}
              </p>
              <CopyPixButton code={copyPasteCode} />
            </div>

            <div className="rounded-xl border border-amber/30 bg-amber/10 p-4">
              <p className="text-sm font-semibold text-ink">Próximos passos</p>
              <ol className="mt-2 grid gap-1.5 pl-4">
                {[
                  "Realize o pagamento via Pix usando o QR Code ou o código acima.",
                  "Após pagar, avise o prestador e envie o comprovante.",
                  "O prestador confirmará manualmente o recebimento nesta página."
                ].map((step, i) => (
                  <li key={i} className="list-decimal text-xs leading-5 text-ink-muted">
                    {step}
                  </li>
                ))}
              </ol>
              {whatsappNumber ? (
                <a
                  className="mt-4 inline-flex min-h-9 items-center justify-center rounded-md bg-leaf px-4 text-xs font-semibold text-white transition hover:bg-leaf-hover"
                  href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(`Olá! Realizei o pagamento Pix de ${formatMoney(amount)} referente ao serviço ${quoteRequest.service.name}. Vou enviar o comprovante por aqui.`)}`}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  Avisar prestador no WhatsApp
                </a>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
