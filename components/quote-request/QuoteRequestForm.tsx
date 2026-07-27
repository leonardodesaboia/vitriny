"use client";

import { useActionState, useState } from "react";

import { createQuoteRequest, type QuoteRequestFormState } from "@/lib/actions/quote-requests";
import { DateInput } from "@/components/ui/DateInput";
import { PhoneInput } from "@/components/ui/PhoneInput";
import { CharCountTextarea } from "@/components/ui/CharCountTextarea";
import type { ServiceSummary } from "@/types";

type SelectedService = {
  id: string;
  name: string;
  description: string | null;
  itemType: "SERVICE" | "PRODUCT";
  pricingType: "FIXED" | "CUSTOM";
  basePrice: string | null;
  requiresSchedulingDetails: boolean;
  requiresLocation: boolean;
};

type QuoteRequestFormProps = {
  slug: string;
  services: ServiceSummary[];
  selectedServiceId?: string | null;
  selectedService?: SelectedService | null;
  requiresPixPayment?: boolean;
};

const inputClass =
  "min-h-11 w-full rounded-lg border border-paper-soft bg-white px-3 text-sm text-ink outline-none ring-offset-paper transition focus:border-leaf focus:ring-2 focus:ring-leaf/20";

const labelClass = "text-xs font-semibold uppercase tracking-widest text-ink-muted";

function formatMoney(value: string) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(Number(value));
}

export function QuoteRequestForm({
  slug,
  services,
  selectedServiceId,
  selectedService,
  requiresPixPayment = false
}: QuoteRequestFormProps) {
  const boundAction = createQuoteRequest.bind(null, slug);
  const [state, formAction, isPending] = useActionState<QuoteRequestFormState, FormData>(
    boundAction,
    undefined
  );

  const [currentServiceId, setCurrentServiceId] = useState<string>(
    selectedServiceId ?? ""
  );

  const dropdownService = currentServiceId
    ? (services.find((s) => s.id === currentServiceId) ?? null)
    : null;

  const activeService = selectedService ?? dropdownService;

  const isFixed = activeService?.pricingType === "FIXED";
  const showScheduling = activeService?.requiresSchedulingDetails === true;
  const showLocation = activeService?.requiresLocation === true;
  // Vocabulário por tipo: produto fala de entrega/retirada, serviço de
  // agendamento e local de atendimento.
  const isProduct = activeService?.itemType === "PRODUCT";

  // O item escolhido no dropdown também pode exigir pagamento Pix; o aviso
  // precisa aparecer antes do envio, não só quando o item vem da URL.
  const willRequirePixPayment =
    requiresPixPayment ||
    (dropdownService?.pricingType === "FIXED" &&
      dropdownService.fixedServiceCheckoutMode === "REQUIRE_PIX_PAYMENT");

  return (
    <form action={formAction} className="mt-8 grid gap-5">
      {state?.error ? (
        <p
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700"
        >
          {state.error}
        </p>
      ) : null}
      {/* Quando o item vem da URL, o card da página já mostra nome, descrição
          e preço — o formulário guarda apenas o vínculo. */}
      {selectedService ? (
        <input name="serviceId" type="hidden" value={selectedService.id} />
      ) : null}
      {!selectedService && willRequirePixPayment && activeService?.basePrice ? (
        <div className="rounded-xl border border-leaf/30 bg-mint/30 p-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-leaf">
            Valor do pedido
          </p>
          <p className="mt-1 font-fraunces text-3xl font-bold text-ink">
            {formatMoney(activeService.basePrice)}
          </p>
          <p className="mt-1 text-xs text-ink-muted">
            Você realizará o pagamento via Pix após preencher seus dados.
          </p>
        </div>
      ) : null}

      <div className="grid gap-2">
        <label className={labelClass} htmlFor="customerName">
          Nome *
        </label>
        <input
          className={inputClass}
          id="customerName"
          maxLength={120}
          name="customerName"
          placeholder="Seu nome completo"
          required
          type="text"
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="grid gap-2">
          <label className={labelClass} htmlFor="customerEmail">
            E-mail
          </label>
          <input
            className={inputClass}
            id="customerEmail"
            maxLength={120}
            name="customerEmail"
            placeholder="seu@email.com"
            type="email"
          />
        </div>

        <div className="grid gap-2">
          <label className={labelClass} htmlFor="customerPhone">
            Telefone
          </label>
          <PhoneInput
            className={inputClass}
            id="customerPhone"
            name="customerPhone"
          />
        </div>
      </div>
      <p className="-mt-3 text-xs text-ink-muted">
        Informe ao menos um: e-mail ou telefone.
      </p>

      {!selectedService && services.length > 0 ? (
        <div className="grid gap-2">
          <label className={labelClass} htmlFor="serviceId">
            Item *
          </label>
          <select
            className={inputClass}
            defaultValue={selectedServiceId ?? ""}
            id="serviceId"
            name="serviceId"
            onChange={(e) => setCurrentServiceId(e.target.value)}
            required
          >
            <option disabled value="">
              Selecione um item
            </option>
            {services.map((service) => (
              <option key={service.id} value={service.id}>
                {service.name}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {showScheduling ? (
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="grid gap-2">
            <label className={labelClass} htmlFor="desiredDate">
              {isProduct ? "Data de entrega ou retirada *" : "Data desejada *"}
            </label>
            <DateInput
              className={inputClass}
              id="desiredDate"
              name="desiredDate"
              required
            />
          </div>

          <div className="grid gap-2">
            <label className={labelClass} htmlFor="desiredTime">
              {isProduct ? "Período *" : "Horário ou período desejado *"}
            </label>
            <input
              className={inputClass}
              id="desiredTime"
              name="desiredTime"
              placeholder={
                isProduct ? "Ex: manhã, até as 14h" : "Ex: manhã, 14h, tarde"
              }
              required
              type="text"
              maxLength={100}
            />
          </div>
        </div>
      ) : null}

      {showLocation ? (
        <div className="grid gap-2">
          <label className={labelClass} htmlFor="location">
            {isProduct
              ? "Endereço de entrega ou retirada *"
              : "Local, bairro ou cidade *"}
          </label>
          <input
            className={inputClass}
            id="location"
            name="location"
            placeholder={
              isProduct ? "Ex: Rua, número e bairro" : "Ex: Centro, São Paulo"
            }
            required
            type="text"
            maxLength={200}
          />
        </div>
      ) : null}

      <div className="grid gap-2">
        <label className={labelClass} htmlFor="description">
          {activeService?.pricingType === "CUSTOM"
            ? "Descreva o que você precisa *"
            : "Observações adicionais"}
        </label>
        <CharCountTextarea
          className="min-h-32 w-full rounded-lg border border-paper-soft bg-white px-3 py-3 text-sm text-ink outline-none ring-offset-paper transition focus:border-leaf focus:ring-2 focus:ring-leaf/20"
          id="description"
          maxLength={1200}
          name="description"
          placeholder={
            activeService?.pricingType === "CUSTOM"
              ? "Conte um pouco mais sobre o que você precisa, prazo, tamanho do projeto..."
              : "Alguma observação sobre data, local ou preferências? (opcional)"
          }
          required={activeService?.pricingType === "CUSTOM"}
        />
      </div>

      <button
        className="inline-flex min-h-11 items-center justify-center rounded-md bg-leaf px-6 text-sm font-semibold text-white transition hover:bg-leaf-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber focus-visible:ring-offset-2 disabled:opacity-50"
        disabled={isPending}
        type="submit"
      >
        {isPending
          ? "Enviando..."
          : willRequirePixPayment
            ? "Continuar para pagar com Pix →"
            : isFixed
              ? "Solicitar"
              : "Enviar pedido"}
      </button>
    </form>
  );
}
