import type { ProposalStatus } from "@prisma/client";

export type ProposalResponse = Extract<ProposalStatus, "APPROVED" | "REJECTED">;

export type ProposalTemplateItem = {
  id?: string;
  description?: string;
  quantity?: number;
  unitPrice?: string;
};

export type ProposalTemplateData = {
  id: string;
  name: string;
  title: string;
  description: string | null;
  items: ProposalTemplateItem[];
};
