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
      "O cliente envia uma solicitação e você responde com uma proposta.",
  },
  {
    value: "FIXED_REQUEST",
    label: "Preço fixo, solicitar primeiro",
    description:
      "O cliente envia uma solicitação com os dados. Você confirma depois.",
  },
  {
    value: "FIXED_PIX",
    label: "Preço fixo, pagar via Pix",
    description:
      "O cliente preenche os dados e recebe o Pix para pagar diretamente para você. A confirmação continua manual.",
  },
];

export const SALE_MODE_BADGE_LABEL: Record<ServiceSaleMode, string> = {
  CUSTOM: "Sob consulta",
  FIXED_REQUEST: "Preço fixo · Solicitação",
  FIXED_PIX: "Preço fixo · Pix",
};
