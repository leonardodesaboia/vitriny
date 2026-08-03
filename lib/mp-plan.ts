import type { PlanTier } from "@prisma/client";

// Resolve o plano pelo status da assinatura (preapproval) do Mercado Pago.
// `authorized` = ativa → PRO. Estados terminais → FREE. `pending` e
// desconhecidos retornam null (não mexem no plano — o valor só muda quando a
// assinatura confirma ou termina de fato).
export function resolvePlanFromPreapproval(status: string): PlanTier | null {
  if (status === "authorized") return "PRO";
  if (status === "cancelled" || status === "paused") return "FREE";
  return null;
}
