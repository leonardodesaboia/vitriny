import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { CopyButton } from "@/components/ui/CopyButton";
import { createPixPayment } from "@/lib/pix";
import { prisma } from "@/lib/prisma";
import { getPublicThemePreset } from "@/lib/theme-presets";

type PixPaymentPageProps = {
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

export default async function PixPaymentPage({ params }: PixPaymentPageProps) {
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
      pixCity: true
    }
  });

  if (!profile || !profile.isPublished) notFound();

  const quoteRequest = await prisma.quoteRequest.findFirst({
    where: { id: requestId, providerId: profile.id },
    select: {
      id: true,
      customerName: true,
      fixedServiceAmount: true,
      pixReservationPaidAt: true,
      service: {
        select: {
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
  const theme = getPublicThemePreset(profile.plan, profile.themePreset);

  return (
    <main className="min-h-screen bg-paper px-4 py-12 text-ink font-jakarta sm:px-6" data-brand-theme={theme.id}>
      <div className="mx-auto max-w-3xl">
        <div className="rounded-2xl border border-paper-soft bg-white shadow-card">
          {/* Green header */}
          <div className="grain flex items-start justify-between gap-4 rounded-t-2xl bg-leaf px-8 py-6">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/60">
                Pagamento via Pix
              </p>
              <h1 className="mt-1 break-words font-fraunces text-3xl font-bold text-white md:text-4xl">
                {quoteRequest.service.name}
              </h1>
              <p className="mt-2 text-sm font-medium text-white/70">
                {profile.businessName}
              </p>
            </div>
            <span
              className={`mt-1 flex-shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
                alreadyPaid
                  ? "bg-mint text-leaf"
                  : "bg-amber-soft text-amber"
              }`}
            >
              {alreadyPaid ? "Pago" : "Aguardando Pix"}
            </span>
          </div>

          <div className="p-8">
            {/* Client + amount summary */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-paper-soft bg-paper p-5">
                <p className="text-xs font-semibold uppercase tracking-widest text-ink-muted">
                  Cliente
                </p>
                <p className="mt-2 font-fraunces text-lg font-bold text-ink">
                  {quoteRequest.customerName}
                </p>
              </div>
              <div className="rounded-xl border border-paper-soft bg-paper p-5">
                <p className="text-xs font-semibold uppercase tracking-widest text-leaf">
                  Valor a pagar
                </p>
                <p className="mt-2 font-fraunces text-3xl font-bold text-ink">
                  {formatMoney(amount)}
                </p>
              </div>
            </div>

            {alreadyPaid ? (
              <div className="mt-6 rounded-xl border border-mint bg-mint/40 p-6">
                <p className="font-fraunces text-xl font-bold text-leaf">
                  Pagamento confirmado!
                </p>
                <p className="mt-2 text-sm leading-6 text-ink-muted">
                  O prestador confirmou o recebimento. Seu pedido está confirmado.
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
                {/* Pix payment section */}
                <div className="mt-6 overflow-hidden rounded-xl border border-amber-200">
                  <div className="flex flex-wrap items-center justify-between gap-3 bg-amber-50 px-5 py-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">
                        Entrada (sinal)
                      </p>
                      <p className="mt-1 font-fraunces text-3xl font-bold text-amber-800">
                        {formatMoney(amount)}
                      </p>
                    </div>
                    <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                      Aguardando pagamento
                    </span>
                  </div>

                  <div className="border-t border-amber-200 bg-white p-5">
                    <p className="text-sm leading-6 text-ink-muted">
                      Realize o pagamento via Pix para confirmar seu pedido.
                    </p>

                    <div className="mt-5 grid gap-5 lg:grid-cols-[220px_1fr]">
                      {/* QR code */}
                      <div className="rounded-xl border border-paper-soft bg-paper p-4">
                        <p className="text-xs font-semibold uppercase tracking-widest text-ink-muted">
                          QR Code Pix
                        </p>
                        <Image
                          alt="QR Code Pix para pagamento"
                          className="mt-3 h-auto w-full rounded-lg bg-white"
                          height={280}
                          src={qrCodeDataUrl}
                          unoptimized
                          width={280}
                        />
                      </div>

                      <div className="grid gap-4">
                        {/* Copy-paste code */}
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-widest text-ink-muted">
                            Código Pix copia e cola
                          </p>
                          <div className="mt-1.5 grid gap-2">
                            <code className="max-h-28 overflow-auto break-all rounded-lg border border-paper-soft bg-paper px-3 py-2 text-xs leading-5 text-ink">
                              {copyPasteCode}
                            </code>
                            <div className="flex justify-between">
                              <CopyButton
                                text={copyPasteCode}
                                label="Copiar código Pix"
                                className="inline-flex min-h-8 w-fit items-center justify-center rounded-md bg-leaf px-3 text-xs font-semibold text-white transition hover:bg-leaf-hover"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Holder info */}
                        <div className="flex gap-8 text-sm text-ink-muted">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-widest">
                              Titular
                            </p>
                            <p className="mt-1 text-ink">{profile.pixHolderName}</p>
                          </div>
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-widest">
                              Cidade
                            </p>
                            <p className="mt-1 text-ink">{profile.pixCity}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Disclaimer */}
                    <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800">
                      <p className="font-semibold">
                        Pagamento feito diretamente ao prestador.
                      </p>
                      <p>
                        O OrçaFácil não confirma esse pagamento automaticamente.
                      </p>
                      <p>
                        Após pagar, envie o comprovante ao prestador ou combine
                        a confirmação diretamente com ele.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Status history placeholder — instructions */}
                <div className="mt-6 rounded-xl border border-paper-soft bg-white p-5">
                  <p className="text-xs font-semibold uppercase tracking-widest text-ink-muted">
                    Próximos passos
                  </p>
                  <ol className="mt-4 grid gap-3">
                    {[
                      "Realize o pagamento via Pix usando o QR Code ou o código acima.",
                      "Após o pagamento, o prestador receberá uma notificação e confirmará manualmente.",
                      "Envie o comprovante no Whatsapp"
                    ].map((step, i) => (
                      <li
                        key={i}
                        className="border-l-2 border-paper-soft pl-3 text-sm leading-6 text-ink-muted"
                      >
                        {step}
                      </li>
                    ))}
                  </ol>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-xs text-ink-muted">
          Proposta gerada via{" "}
          <span className="font-fraunces font-semibold text-leaf">OrçaFácil</span>
        </p>
      </div>
    </main>
  );
}
