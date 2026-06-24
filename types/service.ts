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
