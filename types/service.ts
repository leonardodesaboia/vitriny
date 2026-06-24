export type ServiceSummary = {
  id: string;
  name: string;
};

export type PublicService = {
  id: string;
  name: string;
  description: string | null;
  basePrice: string | null;
};

export type ServiceForClient = {
  id: string;
  name: string;
  description: string | null;
  basePrice: string | null;
  isActive: boolean;
};
