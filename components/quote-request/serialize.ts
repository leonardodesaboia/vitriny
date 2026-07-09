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

export function serializeQuoteRequest(
  quoteRequest: QuoteRequestWithRelations
): SerializedQuoteRequest {
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
