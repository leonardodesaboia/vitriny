import type { PlanTier } from "@prisma/client";

export type LimitedResource =
  | "activeServices"
  | "monthlyQuoteRequests"
  | "monthlyProposals"
  | "proposalTemplates";

export type PlanLimitCode =
  | "limit-active-services"
  | "limit-monthly-quote-requests"
  | "limit-monthly-proposals"
  | "limit-proposal-templates";

export type PlanLimits = Record<LimitedResource, number | null>;

export const PLAN_LIMIT_ERROR_CODES: Record<LimitedResource, PlanLimitCode> = {
  activeServices: "limit-active-services",
  monthlyQuoteRequests: "limit-monthly-quote-requests",
  monthlyProposals: "limit-monthly-proposals",
  proposalTemplates: "limit-proposal-templates"
};

export const PLAN_LIMIT_LABELS: Record<LimitedResource, string> = {
  activeServices: "Serviços ativos",
  monthlyQuoteRequests: "Pedidos no mês",
  monthlyProposals: "Propostas no mês",
  proposalTemplates: "Templates de proposta"
};

export const PLAN_LIMITS: Record<PlanTier, PlanLimits> = {
  FREE: {
    activeServices: 3,
    monthlyQuoteRequests: 10,
    monthlyProposals: 5,
    proposalTemplates: 1
  },
  PRO: {
    activeServices: null,
    monthlyQuoteRequests: null,
    monthlyProposals: null,
    proposalTemplates: null
  }
};

export const PLAN_NAMES: Record<PlanTier, string> = {
  FREE: "Free",
  PRO: "Pro"
};

export const LIMIT_ERROR_MESSAGES: Record<PlanLimitCode, string> = {
  "limit-active-services":
    "Limite de serviços ativos atingido para o plano atual.",
  "limit-monthly-quote-requests":
    "Limite mensal de pedidos atingido para o plano atual.",
  "limit-monthly-proposals":
    "Limite mensal de propostas atingido para o plano atual.",
  "limit-proposal-templates":
    "Limite de templates de proposta atingido para o plano atual."
};

export const PUBLIC_LIMIT_ERROR_MESSAGES: Record<PlanLimitCode, string> = {
  ...LIMIT_ERROR_MESSAGES,
  "limit-monthly-quote-requests":
    "Este prestador atingiu o limite mensal de pedidos no plano atual. Tente falar diretamente com ele pelos canais disponíveis."
};

export function getPlanLimits(plan: PlanTier): PlanLimits {
  return PLAN_LIMITS[plan];
}

export function getPlanLimit(plan: PlanTier, resource: LimitedResource) {
  return getPlanLimits(plan)[resource];
}

export function hasReachedLimit(current: number, limit: number | null) {
  return limit !== null && current >= limit;
}

export function isNearLimit(current: number, limit: number | null) {
  if (limit === null || current >= limit) {
    return false;
  }

  return current >= Math.max(1, Math.ceil(limit * 0.8));
}

export function getCurrentMonthRange(referenceDate = new Date()) {
  const start = new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
    1
  );
  const end = new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth() + 1,
    1
  );

  return { start, end };
}

export function formatUsage(current: number, limit: number | null) {
  return limit === null ? `${current} / ilimitado` : `${current} / ${limit}`;
}
