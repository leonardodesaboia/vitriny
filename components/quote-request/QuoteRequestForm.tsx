import { createQuoteRequest } from "@/lib/actions/quote-requests";
import { PhoneInput } from "@/components/ui/PhoneInput";
import type { ServiceSummary } from "@/types";

type SelectedService = {
  id: string;
  name: string;
  pricingType: "FIXED" | "CUSTOM";
  basePrice: string | null;
};

type QuoteRequestFormProps = {
  slug: string;
  services: ServiceSummary[];
  selectedServiceId?: string | null;
  selectedService?: SelectedService | null;
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
  selectedService
}: QuoteRequestFormProps) {
  const action = createQuoteRequest.bind(null, slug);
  const isFixed = selectedService?.pricingType === "FIXED";

  return (
    <form action={action} className="mt-8 grid gap-5">
      {selectedService ? (
        <div className="rounded-xl border border-paper-soft bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-ink-muted">
            Serviço selecionado
          </p>
          <p className="mt-1 font-fraunces text-lg font-bold text-ink">
            {selectedService.name}
          </p>
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

      {services.length > 0 ? (
        <div className="grid gap-2">
          <label className={labelClass} htmlFor="serviceId">
            Serviço
          </label>
          <select
            className={inputClass}
            defaultValue={selectedServiceId ?? ""}
            id="serviceId"
            name="serviceId"
          >
            <option value="">Não sei informar / Outro</option>
            {services.map((service) => (
              <option key={service.id} value={service.id}>
                {service.name}
                {service.pricingType === "FIXED" && service.basePrice
                  ? ` — ${formatMoney(service.basePrice)}`
                  : ""}
              </option>
            ))}
          </select>
        </div>
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
        className="inline-flex min-h-11 items-center justify-center rounded-md bg-leaf px-6 text-sm font-semibold text-white transition hover:bg-leaf-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber focus-visible:ring-offset-2"
        type="submit"
      >
        {isFixed ? "Solicitar serviço" : "Enviar pedido"}
      </button>
    </form>
  );
}
