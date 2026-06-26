"use client";

import { useActionState, useState } from "react";

import { createQuoteRequest, type QuoteRequestFormState } from "@/lib/actions/quote-requests";
import { DateInput } from "@/components/ui/DateInput";
import { PhoneInput } from "@/components/ui/PhoneInput";
import type { ServiceSummary } from "@/types";

type SelectedService = {
  id: string;
  name: string;
  description: string | null;
  pricingType: "FIXED" | "CUSTOM";
  basePrice: string | null;
  requiresSchedulingDetails: boolean;
};

type QuoteRequestFormProps = {
  slug: string;
  services: ServiceSummary[];
  selectedServiceId?: string | null;
  selectedService?: SelectedService | null;
  isPixReservation?: boolean;
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
  isPixReservation = false
}: QuoteRequestFormProps) {
  const boundAction = createQuoteRequest.bind(null, slug);
  const [state, formAction, isPending] = useActionState<QuoteRequestFormState, FormData>(
    boundAction,
    undefined
  );

  const [currentServiceId, setCurrentServiceId] = useState<string>(
    selectedServiceId ?? ""
  );

  const activeService: SelectedService | null =
    selectedService ??
    (currentServiceId
      ? (services.find((s) => s.id === currentServiceId) as SelectedService | undefined) ?? null
      : null);

  const isFixed = activeService?.pricingType === "FIXED";
  const showScheduling = activeService?.requiresSchedulingDetails === true;

  return (
    <form action={formAction} className="mt-8 grid gap-5">
      {isPixReservation ? (
        <input name="pixReservation" type="hidden" value="1" />
      ) : null}
      {state?.error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {state.error}
        </p>
      ) : null}
      {isPixReservation && selectedService?.basePrice ? (
        <div className="rounded-xl border border-leaf/30 bg-mint/30 p-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-leaf">
            Valor da reserva
          </p>
          <p className="mt-1 font-fraunces text-3xl font-bold text-ink">
            {formatMoney(selectedService.basePrice)}
          </p>
          <p className="mt-1 text-xs text-ink-muted">
            Você realizará o pagamento via Pix após preencher seus dados.
          </p>
        </div>
      ) : null}
      {selectedService ? (
        <div className="min-w-0 overflow-hidden rounded-xl border border-paper-soft bg-white p-4">
          <input name="serviceId" type="hidden" value={selectedService.id} />
          <p className="text-xs font-semibold uppercase tracking-widest text-ink-muted">
            Serviço selecionado
          </p>
          <p className="mt-1 break-words font-fraunces text-lg font-bold text-ink">
            {selectedService.name}
          </p>
          {selectedService.description ? (
            <p className="mt-2 break-words text-sm leading-6 text-ink-muted">
              {selectedService.description}
            </p>
          ) : null}
          {isFixed && selectedService.basePrice ? (
            <p className="mt-1 text-sm font-semibold text-leaf">
              {formatMoney(selectedService.basePrice)}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="grid gap-2">
        <label className={labelClass} htmlFor="customerName">
          Nome *
        </label>
        <input
          className={inputClass}
          id="customerName"
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

      {!selectedService && services.length > 0 ? (
        <div className="grid gap-2">
          <label className={labelClass} htmlFor="serviceId">
            Serviço
          </label>
          <select
            className={inputClass}
            defaultValue={selectedServiceId ?? ""}
            id="serviceId"
            name="serviceId"
            onChange={(e) => setCurrentServiceId(e.target.value)}
          >
            <option value="">Não sei informar / Outro</option>
            {services.map((service) => (
              <option key={service.id} value={service.id}>
                {service.name}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {showScheduling ? (
        <>
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="grid gap-2">
              <label className={labelClass} htmlFor="desiredDate">
                Data desejada *
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
                Horário ou período desejado *
              </label>
              <input
                className={inputClass}
                id="desiredTime"
                name="desiredTime"
                placeholder="Ex: manhã, 14h, tarde"
                required
                type="text"
                maxLength={100}
              />
            </div>
          </div>

          <div className="grid gap-2">
            <label className={labelClass} htmlFor="location">
              Local, bairro ou cidade *
            </label>
            <input
              className={inputClass}
              id="location"
              name="location"
              placeholder="Ex: Centro, São Paulo"
              required
              type="text"
              maxLength={200}
            />
          </div>
        </>
      ) : null}

      <div className="grid gap-2">
        <label className={labelClass} htmlFor="description">
          {isFixed
            ? "Observações adicionais"
            : "Descreva o que você precisa *"}
        </label>
        <textarea
          className="min-h-32 w-full rounded-lg border border-paper-soft bg-white px-3 py-3 text-sm text-ink outline-none ring-offset-paper transition focus:border-leaf focus:ring-2 focus:ring-leaf/20"
          id="description"
          name="description"
          placeholder={
            isFixed
              ? "Alguma observação sobre data, local ou preferências? (opcional)"
              : "Conte um pouco mais sobre o que você precisa, prazo, tamanho do projeto..."
          }
          required={!isFixed}
        />
      </div>

      <button
        className="inline-flex min-h-11 items-center justify-center rounded-md bg-leaf px-6 text-sm font-semibold text-white transition hover:bg-leaf-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber focus-visible:ring-offset-2 disabled:opacity-50"
        disabled={isPending}
        type="submit"
      >
        {isPending
          ? "Enviando..."
          : isPixReservation
            ? "Continuar para pagamento Pix →"
            : isFixed
              ? "Solicitar serviço"
              : "Enviar pedido"}
      </button>
    </form>
  );
}
