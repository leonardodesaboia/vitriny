import { createQuoteRequest } from "@/lib/actions/quote-requests";

type QuoteRequestService = {
  id: string;
  name: string;
};

type QuoteRequestFormProps = {
  slug: string;
  services: QuoteRequestService[];
  selectedServiceId?: string | null;
};

const inputClass =
  "min-h-11 w-full rounded-lg border border-paper-soft bg-white px-3 text-sm text-ink outline-none ring-offset-paper transition focus:border-leaf focus:ring-2 focus:ring-leaf/20";

const labelClass = "text-xs font-semibold uppercase tracking-widest text-ink-muted";

export function QuoteRequestForm({
  slug,
  services,
  selectedServiceId
}: QuoteRequestFormProps) {
  const action = createQuoteRequest.bind(null, slug);

  return (
    <form action={action} className="mt-8 grid gap-5">
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
          <input
            className={inputClass}
            id="customerPhone"
            name="customerPhone"
            placeholder="(11) 9 0000-0000"
            type="text"
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
              </option>
            ))}
          </select>
        </div>
      ) : null}

      <div className="grid gap-2">
        <label className={labelClass} htmlFor="description">
          Descreva o que você precisa *
        </label>
        <textarea
          className="min-h-32 w-full rounded-lg border border-paper-soft bg-white px-3 py-3 text-sm text-ink outline-none ring-offset-paper transition focus:border-leaf focus:ring-2 focus:ring-leaf/20"
          id="description"
          name="description"
          placeholder="Conte um pouco mais sobre o que você precisa, prazo, tamanho do projeto..."
          required
        />
      </div>

      <button
        className="inline-flex min-h-11 items-center justify-center rounded-md bg-leaf px-6 text-sm font-semibold text-white transition hover:bg-leaf-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber focus-visible:ring-offset-2"
        type="submit"
      >
        Enviar pedido
      </button>
    </form>
  );
}
