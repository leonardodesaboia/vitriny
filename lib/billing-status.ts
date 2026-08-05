import type { PlanTier } from "@prisma/client";

// "Assinatura ativa" = plano PRO efetivo COM uma assinatura recorrente por trás.
// Uma preapproval do Mercado Pago apenas PENDENTE (ex.: Pix ainda não autorizado)
// grava `mpPreapprovalId` no perfil, mas o plano continua FREE. Esse estado NÃO
// conta como ativa — senão a UI trava os botões de assinar (o de cartão fica
// `disabled`) achando que já existe assinatura. O plano só vira PRO quando a
// assinatura é de fato autorizada (cartão) ou confirmada pelo webhook (Pix).
export function hasActiveRecurringSubscription(profile: {
  plan: PlanTier;
  mpPreapprovalId: string | null;
}): boolean {
  return profile.plan === "PRO" && profile.mpPreapprovalId !== null;
}
