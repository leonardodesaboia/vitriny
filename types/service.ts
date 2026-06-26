export type ServiceSummary = {
  id: string;
  name: string;
  pricingType: "FIXED" | "CUSTOM";
  basePrice: string | null;
  requiresSchedulingDetails: boolean;
};

export type PublicService = {
  id: string;
  name: string;
  description: string | null;
  pricingType: "FIXED" | "CUSTOM";
  basePrice: string | null;
  imageUrl: string | null;
};

export type ServiceForClient = {
  id: string;
  name: string;
  description: string | null;
  pricingType: "FIXED" | "CUSTOM";
  basePrice: string | null;
  isActive: boolean;
  requiresSchedulingDetails: boolean;
  imageUrl: string | null;
};
