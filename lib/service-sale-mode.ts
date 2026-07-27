export type ServiceSaleMode = "CUSTOM" | "FIXED_REQUEST" | "FIXED_PIX";

type TechnicalFields = {
  pricingType: "CUSTOM" | "FIXED";
  fixedServiceCheckoutMode: "REQUEST_ONLY" | "REQUIRE_PIX_PAYMENT";
};

export function getServiceSaleMode({
  pricingType,
  fixedServiceCheckoutMode,
}: TechnicalFields): ServiceSaleMode {
  if (pricingType === "CUSTOM") return "CUSTOM";
  if (fixedServiceCheckoutMode === "REQUIRE_PIX_PAYMENT") return "FIXED_PIX";
  return "FIXED_REQUEST";
}

export function getTechnicalSaleMode(saleMode: ServiceSaleMode): TechnicalFields {
  if (saleMode === "FIXED_PIX") {
    return { pricingType: "FIXED", fixedServiceCheckoutMode: "REQUIRE_PIX_PAYMENT" };
  }
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
    label: "Preço fixo, solicitar primeiro",
    description:
      "Você informa o preço no cadastro. O cliente envia os dados sem pagar, e você entra em contato para confirmar o pedido.",
  },
  {
    value: "FIXED_PIX",
    label: "Preço fixo, pagar via Pix",
    description:
      "Você informa o preço no cadastro. Após enviar os dados, o cliente recebe o QR Code e o código Pix para pagar diretamente a você; a confirmação do pagamento é manual.",
  },
];

export const SALE_MODE_BADGE_LABEL: Record<ServiceSaleMode, string> = {
  CUSTOM: "Sob consulta",
  FIXED_REQUEST: "Preço fixo · Solicitação",
  FIXED_PIX: "Preço fixo · Pix",
};
