import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

export const metadata: Metadata = {
  robots: { index: false, follow: false }
};

import { MarkPaidButton } from "./MarkPaidButton";
import { CopyButton } from "@/components/ui/CopyButton";
import { markPixReservationClientPaid } from "@/lib/actions/quote-requests";
import { createPixPayment } from "@/lib/pix";
import { prisma } from "@/lib/prisma";
import { getPublicThemePreset } from "@/lib/theme-presets";
import { phoneToWhatsAppNumber } from "@/lib/utils/phone";
import {
  isPixPaymentExpired,
  PIX_PAYMENT_EXPIRY_HOURS
} from "@/lib/utils/date";

type PixReservationPageProps = {
  params: Promise<{
    slug: string;
    requestId: string;
  }>;
};

export const dynamic = "force-dynamic";

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

  // Não exige isPublished: o link de reserva já foi enviado ao cliente por
  // e-mail; despublicar a vitrine não pode matar um pagamento em andamento.
  if (!profile) notFound();

  const quoteRequest = await prisma.quoteRequest.findFirst({
    where: { id: requestId, providerId: profile.id },
    select: {
      id: true,
      customerName: true,
      serviceNameSnapshot: true,
      fixedServiceAmount: true,
      pixReservationRequestedAt: true,
      pixReservationPaidAt: true,
      pixReservationClientPaidAt: true,
      service: {
        select: {
          id: true,
          name: true
        }
      }
    }
  });

  // O valor e o estado da reserva vivem no snapshot do pedido; a página não
  // pode quebrar se o negócio excluir ou reconfigurar o item depois.
  if (
    !quoteRequest ||
    !quoteRequest.pixReservationRequestedAt ||
    !quoteRequest.fixedServiceAmount
  ) {
    notFound();
  }

  // Snapshot primeiro: o histórico conta a verdade da época do pedido.
  const itemName =
    quoteRequest.serviceNameSnapshot ??
    quoteRequest.service?.name ??
    "Seu pedido";

  const pixConfigured = !!(
    profile.pixKey &&
    profile.pixHolderName &&
    profile.pixCity
  );

  const amount = quoteRequest.fixedServiceAmount.toString();
  // Precedência: pago > informado > expirado > pendente. Se o cliente
  // informou e o prazo venceu depois, a bola está com o negócio — a página
  // continua mostrando "informado".
  const alreadyPaid = !!quoteRequest.pixReservationPaidAt;
  const clientInformed =
    !alreadyPaid && !!quoteRequest.pixReservationClientPaidAt;
  const expired =
    !alreadyPaid &&
    !clientInformed &&
    isPixPaymentExpired(quoteRequest.pixReservationRequestedAt);
  const pendingPayment = !alreadyPaid && !clientInformed && !expired;

  const paymentDeadline = new Date(
    quoteRequest.pixReservationRequestedAt.getTime() +
      PIX_PAYMENT_EXPIRY_HOURS * 60 * 60 * 1000
  );
  const paymentDeadlineDisplay = new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(paymentDeadline);

  const pixPayment =
    pendingPayment && pixConfigured
      ? await createPixPayment({
          pixKey: profile.pixKey!,
          pixHolderName: profile.pixHolderName!,
          pixCity: profile.pixCity!,
          amount,
          transactionId: quoteRequest.id.replace(/-/g, "").slice(0, 25),
          description:
            quoteRequest.serviceNameSnapshot ??
            quoteRequest.service?.name ??
            "Reserva"
        })
      : null;

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
          ← Voltar à vitrine
        </Link>

        <div className="mt-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-leaf">
            Pagamento via Pix
          </p>
          <h1 className="mt-2 font-fraunces text-4xl font-bold text-ink">
            {itemName}
          </h1>
          <p className="mt-2 text-sm text-ink-muted">
            {profile.businessName}
          </p>
        </div>


        {alreadyPaid ? (
          <div className="mt-8 rounded-xl border border-mint bg-mint/40 p-6">
            <p className="font-fraunces text-xl font-bold text-leaf">
              Pagamento confirmado!
            </p>
            <p className="mt-2 text-sm leading-6 text-ink-muted">
              O negócio confirmou o recebimento do Pix. Seu pedido está confirmado.
            </p>
            <Link
              className="mt-4 inline-flex min-h-9 items-center justify-center rounded-md bg-leaf px-4 text-xs font-semibold text-white transition hover:bg-leaf-hover"
              href={`/u/${slug}`}
            >
              Voltar à vitrine
            </Link>
          </div>
        ) : clientInformed ? (
          <div className="mt-8 rounded-xl border border-amber/30 bg-amber/10 p-6">
            <p className="font-fraunces text-xl font-bold text-ink">
              Pagamento informado
            </p>
            <p className="mt-2 text-sm leading-6 text-ink-muted">
              Avisamos o negócio de que você fez o pagamento. Seu pedido será
              confirmado assim que o recebimento for verificado.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              {whatsappNumber ? (
                <a
                  className="inline-flex min-h-9 items-center justify-center rounded-md bg-leaf px-4 text-xs font-semibold text-white transition hover:bg-leaf-hover"
                  href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(`Olá! Realizei o pagamento Pix de ${formatMoney(amount)} referente ao item ${itemName}. Vou enviar o comprovante por aqui.`)}`}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  Enviar comprovante no WhatsApp
                </a>
              ) : null}
              <Link
                className="inline-flex min-h-9 items-center justify-center rounded-md border border-paper-soft px-4 text-xs font-semibold text-ink transition hover:border-leaf hover:text-leaf"
                href={`/u/${slug}`}
              >
                Voltar à vitrine
              </Link>
            </div>
          </div>
        ) : expired ? (
          <div className="mt-8 rounded-xl border border-red-200 bg-red-50 p-6">
            <p className="font-fraunces text-xl font-bold text-red-700">
              Código Pix expirado
            </p>
            <p className="mt-2 text-sm leading-6 text-ink-muted">
              O prazo para realizar este pagamento encerrou. Faça uma nova solicitação se ainda quiser o item.
            </p>
            <Link
              className="mt-4 inline-flex min-h-9 items-center justify-center rounded-md bg-leaf px-4 text-xs font-semibold text-white transition hover:bg-leaf-hover"
              href={`/u/${slug}`}
            >
              Voltar à vitrine
            </Link>
          </div>
        ) : !pixPayment ? (
          <div className="mt-8 rounded-xl border border-amber/30 bg-amber/10 p-6">
            <p className="font-fraunces text-xl font-bold text-ink">
              Pagamento temporariamente indisponível
            </p>
            <p className="mt-2 text-sm leading-6 text-ink-muted">
              O negócio ainda não configurou o recebimento via Pix. Entre em
              contato para combinar o pagamento ou tente novamente mais tarde.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              {whatsappNumber ? (
                <a
                  className="inline-flex min-h-9 items-center justify-center rounded-md bg-leaf px-4 text-xs font-semibold text-white transition hover:bg-leaf-hover"
                  href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(`Olá! Fiz uma solicitação de ${itemName} no valor de ${formatMoney(amount)}, mas o pagamento Pix está indisponível. Como posso pagar?`)}`}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  Falar no WhatsApp
                </a>
              ) : null}
              <Link
                className="inline-flex min-h-9 items-center justify-center rounded-md border border-paper-soft px-4 text-xs font-semibold text-ink transition hover:border-leaf hover:text-leaf"
                href={`/u/${slug}`}
              >
                Voltar à vitrine
              </Link>
            </div>
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
              <p className="mt-2 text-xs text-ink-muted">
                Pague até{" "}
                <span className="font-semibold text-ink">
                  {paymentDeadlineDisplay}
                </span>
                . Depois desse prazo o código Pix expira e será necessário
                fazer uma nova solicitação.
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
                  src={pixPayment.qrCodeDataUrl}
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
                {pixPayment.copyPasteCode}
              </p>
              <CopyButton
                text={pixPayment.copyPasteCode}
                label="Copiar código"
                className="mt-3 inline-flex min-h-9 items-center justify-center rounded-md border border-paper-soft bg-paper px-4 text-xs font-semibold text-ink transition hover:border-leaf hover:text-leaf"
              />
              <div className="mt-4 flex gap-8 border-t border-paper-soft pt-4 text-sm text-ink-muted">
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

            <div className="rounded-xl border border-amber/30 bg-amber/10 p-4">
              <p className="text-sm font-semibold text-ink">Próximos passos</p>
              <ol className="mt-2 grid gap-1.5 pl-4">
                {[
                  "Realize o pagamento via Pix usando o QR Code ou o código acima.",
                  "Após pagar, avise o negócio e envie o comprovante.",
                  "O recebimento será confirmado manualmente nesta página."
                ].map((step, i) => (
                  <li key={i} className="list-decimal text-xs leading-5 text-ink-muted">
                    {step}
                  </li>
                ))}
              </ol>
              {whatsappNumber ? (
                <a
                  className="mt-4 inline-flex min-h-9 items-center justify-center rounded-md bg-leaf px-4 text-xs font-semibold text-white transition hover:bg-leaf-hover"
                  href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(`Olá! Realizei o pagamento Pix de ${formatMoney(amount)} referente ao item ${itemName}. Vou enviar o comprovante por aqui.`)}`}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  Avisar no WhatsApp
                </a>
              ) : null}
              <form
                action={markPixReservationClientPaid.bind(null, slug)}
                className="mt-3"
              >
                <input name="requestId" type="hidden" value={quoteRequest.id} />
                <MarkPaidButton />
              </form>
              <p className="mt-2 text-xs text-ink-muted">
                Ao marcar, o negócio é avisado; a confirmação do recebimento
                continua manual.
              </p>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
