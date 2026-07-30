export type ServiceSaleMode = "CUSTOM" | "FIXED_REQUEST";

type TechnicalFields = {
  pricingType: "CUSTOM" | "FIXED";
  fixedServiceCheckoutMode: "REQUEST_ONLY" | "REQUIRE_PIX_PAYMENT";
};

export function getServiceSaleMode({
  pricingType,
}: TechnicalFields): ServiceSaleMode {
  // O Pix obrigatório (REQUIRE_PIX_PAYMENT) foi removido do fluxo do cliente.
  // Itens legados com esse modo degradam para "preço fixo, solicitar primeiro":
  // continuam com preço fixo, mas sem a etapa de pagamento antecipado.
  if (pricingType === "CUSTOM") return "CUSTOM";
  return "FIXED_REQUEST";
}

export function getTechnicalSaleMode(saleMode: ServiceSaleMode): TechnicalFields {
  if (saleMode === "FIXED_REQUEST") {
    return { pricingType: "FIXED", fixedServiceCheckoutMode: "REQUEST_ONLY" };
  }
  return { pricingType: "CUSTOM", fixedServiceCheckoutMode: "REQUEST_ONLY" };
}

export type SaleModeOption = {
  value: ServiceSaleMode;
  label: string;
  description: string;
};

export const SALE_MODE_OPTIONS: SaleModeOption[] = [
  {
    value: "CUSTOM",
    label: "Sob consulta",
    description:
      "O preço não é definido agora. O cliente descreve o que precisa, e você analisa o pedido antes de enviar uma proposta com valor e condições.",
  },
  {
    value: "FIXED_REQUEST",
    label: "Preço fixo",
    description:
      "Você informa o preço no cadastro. O cliente envia os dados e você entra em contato para confirmar o pedido e combinar o pagamento.",
  },
];

export const SALE_MODE_BADGE_LABEL: Record<ServiceSaleMode, string> = {
  CUSTOM: "Sob consulta",
  FIXED_REQUEST: "Preço fixo",
};
