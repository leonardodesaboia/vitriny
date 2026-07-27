import type { QuoteRequestWithRelations } from "@/types";

// Campos Decimal viram string antes de cruzar a fronteira Server→Client.
export type SerializedProposal = {
  id: string;
  publicToken: string;
  status: string;
  depositAmount: string | null;
  depositPaidAt: Date | null;
};

export type SerializedService = {
  id: string;
  name: string;
  itemType: "SERVICE" | "PRODUCT";
  pricingType: "FIXED" | "CUSTOM";
  fixedServiceCheckoutMode: "REQUEST_ONLY" | "REQUIRE_PIX_PAYMENT";
  basePrice: string | null;
};

export type SerializedQuoteRequest = Omit<
  QuoteRequestWithRelations,
  "proposal" | "service" | "fixedServiceAmount"
> & {
  proposal: SerializedProposal | null;
  service: SerializedService | null;
  fixedServiceAmount: string | null;
};

// Aceita tanto a linha resumida da lista quanto a completa do detalhe.
export type SerializableQuoteRequest = {
  fixedServiceAmount: { toString(): string } | null;
  service:
    | (Omit<SerializedService, "basePrice"> & {
        basePrice: { toString(): string } | null;
      })
    | null;
  proposal:
    | (Omit<SerializedProposal, "depositAmount"> & {
        depositAmount: { toString(): string } | null;
      })
    | null;
};

export function serializeQuoteRequest<T extends SerializableQuoteRequest>(
  quoteRequest: T
): Omit<T, keyof SerializableQuoteRequest> & {
  fixedServiceAmount: string | null;
  service: SerializedService | null;
  proposal: SerializedProposal | null;
} {
  return {
    ...quoteRequest,
    fixedServiceAmount: quoteRequest.fixedServiceAmount?.toString() ?? null,
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
}
