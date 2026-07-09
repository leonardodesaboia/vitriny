import {
  QuoteRequestCard,
  type QuoteRequestSummary
} from "@/components/quote-request/QuoteRequestCard";
import {
  serializeQuoteRequest,
  type SerializableQuoteRequest
} from "@/components/quote-request/serialize";

type QuoteRequestListRow = SerializableQuoteRequest &
  Omit<QuoteRequestSummary, "service">;

type QuoteRequestListProps = {
  quoteRequests: QuoteRequestListRow[];
  services: { id: string; name: string }[];
  emptyDescription?: string;
  emptyTitle?: string;
};

export function QuoteRequestList({
  emptyDescription = "Quando um cliente preencher o formulário da sua vitrine, os pedidos aparecerão aqui.",
  emptyTitle = "Nenhum pedido ainda",
  quoteRequests,
  services
}: QuoteRequestListProps) {
  const serviceNamesById = Object.fromEntries(
    services.map((s) => [s.id, s.name])
  );

  if (quoteRequests.length === 0) {
    return (
      <div className="rounded-xl border border-paper-soft bg-white p-10 text-center shadow-card">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-mint">
          <svg className="h-6 w-6 text-leaf" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        </div>
        <p className="mt-4 font-fraunces text-lg font-bold text-ink">
          {emptyTitle}
        </p>
        <p className="mt-1 text-sm text-ink-muted">
          {emptyDescription}
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      {quoteRequests.map((quoteRequest) => (
        <QuoteRequestCard
          key={quoteRequest.id}
          quoteRequest={serializeQuoteRequest(quoteRequest)}
          serviceNamesById={serviceNamesById}
        />
      ))}
    </div>
  );
}
