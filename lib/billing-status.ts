import type { PlanTier } from "@prisma/client";

// "Assinatura ativa" = plano PRO efetivo COM uma assinatura recorrente por trás.
// Uma preapproval do Mercado Pago apenas PENDENTE (ex.: Pix ainda não autorizado)
// grava `mpPreapprovalId` no perfil, mas o plano continua FREE. Esse estado NÃO
// conta como ativa — senão a UI trava os botões de assinar (o de cartão fica
// `disabled`) achando que já existe assinatura. O plano só vira PRO quando a
// assinatura é de fato autorizada (cartão) ou confirmada pelo webhook (Pix).
export function hasActiveRecurringSubscription(profile: {
  plan: PlanTier;
  stripeSubscriptionId: string | null;
  mpPreapprovalId: string | null;
}): boolean {
  return (
    profile.plan === "PRO" &&
    (profile.stripeSubscriptionId !== null || profile.mpPreapprovalId !== null)
  );
}

export function resolveSubscriptionGateway(profile: {
  stripeSubscriptionId: string | null;
  mpPreapprovalId: string | null;
}): "stripe" | "mp" | null {
  if (profile.mpPreapprovalId !== null) return "mp";
  if (profile.stripeSubscriptionId !== null) return "stripe";
  return null;
}

// Decisão de como reativar, separada do componente para ser testável de
// verdade (os testes de UI aqui usam renderToStaticMarkup, sem cliques).
// MP: preapproval cancelada é terminal lá, então reativar = abrir o Card
// Brick e criar uma preapproval nova. Qualquer outro caso (Stripe, ou
// gateway indefinido) segue o caminho legado da Server Action zero-input.
export function resolveReactivationMode(
  gateway: "stripe" | "mp" | null
): "card-modal" | "stripe-action" {
  return gateway === "mp" ? "card-modal" : "stripe-action";
}
