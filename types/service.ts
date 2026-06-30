export type FixedServiceCheckoutMode = "REQUEST_ONLY" | "REQUIRE_PIX_PAYMENT";

export type ServiceSummary = {
  id: string;
  name: string;
  pricingType: "FIXED" | "CUSTOM";
  fixedServiceCheckoutMode: FixedServiceCheckoutMode;
  basePrice: string | null;
  requiresSchedulingDetails: boolean;
};

export type PublicService = {
  id: string;
  name: string;
  description: string | null;
  pricingType: "FIXED" | "CUSTOM";
  fixedServiceCheckoutMode: FixedServiceCheckoutMode;
  basePrice: string | null;
  imageUrl: string | null;
  pixConfigured: boolean;
};

export type ServiceForClient = {
  id: string;
  name: string;
  description: string | null;
  pricingType: "FIXED" | "CUSTOM";
  fixedServiceCheckoutMode: FixedServiceCheckoutMode;
  basePrice: string | null;
  isActive: boolean;
  requiresSchedulingDetails: boolean;
  imageUrl: string | null;
};
