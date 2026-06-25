import { QuoteRequestCard, type SerializedQuoteRequest } from "@/components/quote-request/QuoteRequestCard";
import type { QuoteRequestWithRelations, ServiceSummary } from "@/types";

type QuoteRequestListProps = {
  quoteRequests: QuoteRequestWithRelations[];
  services: ServiceSummary[];
};

export function QuoteRequestList({ quoteRequests, services }: QuoteRequestListProps) {
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
          Nenhum pedido ainda
        </p>
        <p className="mt-1 text-sm text-ink-muted">
          Quando um cliente preencher o formulário do seu perfil, os pedidos aparecerão aqui.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      {quoteRequests.map((quoteRequest) => {
        const serialized: SerializedQuoteRequest = {
          ...quoteRequest,
          service: quoteRequest.service
            ? {
                ...quoteRequest.service,
                basePrice: quoteRequest.service.basePrice?.toString() ?? null
              }
            : null,
          proposal: quoteRequest.proposal
            ? {
                ...quoteRequest.proposal,
                depositAmount: quoteRequest.proposal.depositAmount?.toString() ?? null
              }
            : null
        };
        return (
          <QuoteRequestCard
            key={quoteRequest.id}
            quoteRequest={serialized}
            serviceNamesById={serviceNamesById}
          />
        );
      })}
    </div>
  );
}
