import type { PlanTier } from "@prisma/client";

type StripePlanEnv = { proPriceId?: string };

const TERMINAL_STATUSES = new Set([
  "canceled",
  "unpaid",
  "incomplete_expired",
  "paused"
]);

// Resolve o plano pelo preço da assinatura quando ela está ativa; por status
// nos estados terminais. Com um único plano pago, price desconhecido cai em
// PRO para não rebaixar assinante por env desconfigurada — ao criar um novo
// plano, adicionar o price aqui ANTES de vendê-lo.
export function resolvePlanFromSubscription(
  stripeStatus: string,
  priceId: string | null | undefined,
  env: StripePlanEnv = { proPriceId: process.env.STRIPE_PRO_PRICE_ID }
): PlanTier | null {
  if (stripeStatus === "active" || stripeStatus === "trialing") {
    const priceToPlan: Record<string, PlanTier> = env.proPriceId
      ? { [env.proPriceId]: "PRO" }
      : {};
    return (priceId && priceToPlan[priceId]) || "PRO";
  }
  if (TERMINAL_STATUSES.has(stripeStatus)) return "FREE";
  return null;
}
