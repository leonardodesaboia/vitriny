export type ServiceSummary = {
  id: string;
  name: string;
  pricingType: "FIXED" | "CUSTOM";
  basePrice: string | null;
};

export type PublicService = {
  id: string;
  name: string;
  description: string | null;
  pricingType: "FIXED" | "CUSTOM";
  basePrice: string | null;
};

export type ServiceForClient = {
  id: string;
  name: string;
  description: string | null;
  pricingType: "FIXED" | "CUSTOM";
  basePrice: string | null;
  isActive: boolean;
};
