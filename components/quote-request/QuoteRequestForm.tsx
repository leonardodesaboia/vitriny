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

export function QuoteRequestForm({
  slug,
  services,
  selectedServiceId
}: QuoteRequestFormProps) {
  const action = createQuoteRequest.bind(null, slug);

  return (
    <form action={action} className="mt-8 grid gap-5">
      <div className="grid gap-2">
        <label className="text-sm font-semibold text-ink" htmlFor="customerName">
          Nome
        </label>
        <input
          className="min-h-11 rounded-md border border-stone-300 bg-white px-3 text-sm outline-none focus:border-leaf"
          id="customerName"
          name="customerName"
          required
          type="text"
        />
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <div className="grid gap-2">
          <label className="text-sm font-semibold text-ink" htmlFor="customerEmail">
            E-mail
          </label>
          <input
            className="min-h-11 rounded-md border border-stone-300 bg-white px-3 text-sm outline-none focus:border-leaf"
            id="customerEmail"
            name="customerEmail"
            type="email"
          />
        </div>

        <div className="grid gap-2">
          <label className="text-sm font-semibold text-ink" htmlFor="customerPhone">
            Telefone
          </label>
          <input
            className="min-h-11 rounded-md border border-stone-300 bg-white px-3 text-sm outline-none focus:border-leaf"
            id="customerPhone"
            name="customerPhone"
            type="text"
          />
        </div>
      </div>

      <div className="grid gap-2">
        <label className="text-sm font-semibold text-ink" htmlFor="serviceId">
          Serviço
        </label>
        <select
          className="min-h-11 rounded-md border border-stone-300 bg-white px-3 text-sm outline-none focus:border-leaf"
          defaultValue={selectedServiceId ?? ""}
          id="serviceId"
          name="serviceId"
        >
          <option value="">Não sei informar</option>
          {services.map((service) => (
            <option key={service.id} value={service.id}>
              {service.name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-2">
        <label className="text-sm font-semibold text-ink" htmlFor="description">
          Descreva o que você precisa
        </label>
        <textarea
          className="min-h-36 rounded-md border border-stone-300 bg-white px-3 py-3 text-sm outline-none focus:border-leaf"
          id="description"
          name="description"
          required
        />
      </div>

      <button
        className="inline-flex min-h-11 w-full items-center justify-center rounded-md bg-leaf px-5 text-sm font-semibold text-white transition hover:bg-[#1d6443] md:w-fit"
        type="submit"
      >
        Enviar pedido
      </button>
    </form>
  );
}
