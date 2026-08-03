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
  activeServices: "Itens ativos",
  monthlyQuoteRequests: "Pedidos no mês",
  monthlyProposals: "Propostas no mês",
  proposalTemplates: "Templates de proposta"
};

export const PLAN_LIMITS: Record<PlanTier, PlanLimits> = {
  FREE: {
    activeServices: 3,
    // Teto ANTI-ABUSO, não gatilho de upgrade: o cliente final é quem bate esse
    // limite, então mantê-lo baixo queima o negócio na frente do cliente dele. O
    // flood malicioso já é barrado pelo rate limiting do formulário público
    // (proxy.ts). O gatilho de PRO fica no que o dono sente (itens, propostas,
    // temas). Custo real por pedido é ~e-mail (Resend), não infra de banco.
    monthlyQuoteRequests: 50,
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

// Capacidades por plano: um plano novo entra aqui e nos limites — nunca em
// checagens `plan === "PRO"` espalhadas.
export const PLAN_FEATURES: Record<
  PlanTier,
  {
    serviceImages: boolean;
    brandCustomization: boolean;
    storefrontAnalytics: boolean;
  }
> = {
  // Foto por item é FREE (o limite de 3 itens já limita a 3 fotos); o gatilho
  // PRO fica em itens/propostas ilimitados, temas visuais e analytics detalhado.
  FREE: {
    serviceImages: true,
    brandCustomization: false,
    storefrontAnalytics: false,
  },
  PRO: {
    serviceImages: true,
    brandCustomization: true,
    storefrontAnalytics: true,
  },
};

export const canUseServiceImages = (plan: PlanTier) =>
  PLAN_FEATURES[plan].serviceImages;

export const canUseBrandCustomization = (plan: PlanTier) =>
  PLAN_FEATURES[plan].brandCustomization;

export const canUseStorefrontAnalytics = (plan: PlanTier) =>
  PLAN_FEATURES[plan].storefrontAnalytics;

export const isPaidPlan = (plan: PlanTier) => plan !== "FREE";

// Fonte única do preço exibido na landing. O valor real cobrado vive na env
// MP_PRO_AMOUNT (usada pelas actions de assinatura do Mercado Pago); manter os
// dois alinhados.
export const PLAN_PRICES: Record<PlanTier, string> = {
  FREE: "R$ 0",
  PRO: "R$ 19,90"
};

export const LIMIT_ERROR_MESSAGES: Record<PlanLimitCode, string> = {
  "limit-active-services":
    "Limite de itens ativos atingido para o plano atual.",
  "limit-monthly-quote-requests":
    "Limite mensal de pedidos atingido para o plano atual.",
  "limit-monthly-proposals":
    "Limite mensal de propostas atingido para o plano atual.",
  "limit-proposal-templates":
    "Limite de templates de proposta atingido para o plano atual."
};

// Mensagens vistas pelo CLIENTE FINAL na vitrine pública. Nunca expor o plano do
// negócio nem sugerir uma falha dele — o cliente não é quem assina. Direcionar
// para contato direto sem culpar o negócio.
export const PUBLIC_LIMIT_ERROR_MESSAGES: Record<PlanLimitCode, string> = {
  ...LIMIT_ERROR_MESSAGES,
  "limit-monthly-quote-requests":
    "Não foi possível registrar seu pedido pelo site agora. Entre em contato com o negócio pelos canais disponíveis (WhatsApp, telefone ou e-mail)."
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

type OneTimeProProfile = {
  plan: PlanTier;
  stripeSubscriptionId: string | null;
  mpPreapprovalId: string | null;
  currentPeriodEnd: Date | null;
};

// PRO só expira sozinho quando NÃO há assinatura recorrente por trás (nem
// Stripe nem preapproval MP) e o período venceu. Assinatura recorrente real
// nunca cai aqui: o webhook mantém currentPeriodEnd atualizado a cada ciclo.
export function isOneTimeProExpired(profile: OneTimeProProfile): boolean {
  return (
    profile.plan === "PRO" &&
    profile.stripeSubscriptionId === null &&
    profile.mpPreapprovalId === null &&
    profile.currentPeriodEnd !== null &&
    profile.currentPeriodEnd < new Date()
  );
}
