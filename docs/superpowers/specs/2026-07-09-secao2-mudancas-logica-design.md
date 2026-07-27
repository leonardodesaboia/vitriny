# Design — Seção 2 do backlog (Mudanças de lógica)

Data: 2026-07-09
Origem: `docs/BACKLOG_TECNICO.md` seção 2
Status: aprovado pelo usuário ("aprovado, siga até o fim" — executar planos A e B sem novas aprovações)

Decisões do usuário: paginação **por página** (`?page=N`, 20 por página); accordion
**removido** — o card da lista navega para `/dashboard/pedidos/[id]`.

Entrega em dois planos: **A** = 2.1 + 2.2 + 2.3 + 2.5; **B** = 2.4.

## 2.1 Refactor de planos

Em `lib/plan-limits.ts`:

```ts
export const PLAN_FEATURES: Record<PlanTier, { serviceImages: boolean; themePresets: boolean }> = {
  FREE: { serviceImages: false, themePresets: false },
  PRO:  { serviceImages: true,  themePresets: true }
};
export const canUseServiceImages = (plan: PlanTier) => PLAN_FEATURES[plan].serviceImages;
export const canUseThemePresets = (plan: PlanTier) => PLAN_FEATURES[plan].themePresets;
export const isPaidPlan = (plan: PlanTier) => plan !== "FREE";
export const PLAN_PRICES: Record<PlanTier, string> = { FREE: "R$ 0", PRO: "R$ 19,90" };
```

Substituições (capacidade de produto → helper):
- `app/api/services/[id]/image/route.ts` (POST e DELETE): `!canUseServiceImages(profile.plan)`.
- `app/u/[slug]/page.tsx` (imageUrl) e `app/u/[slug]/orcamento/page.tsx` (render da imagem): `canUseServiceImages`.
- `app/(dashboard)/dashboard/servicos/page.tsx` (`isPro` ×2): `canUseServiceImages(profile.plan)` — a prop `isPro` alimenta o gating de imagem do `ServiceForm`.
- `components/provider-profile/ProfileForm.tsx` (`isPro`) e `lib/actions/provider-profile.ts` (gate de tema): `canUseThemePresets`.
- `lib/theme-presets.ts` (`plan !== "PRO"`): `!canUseThemePresets(plan)`.

Ficam explícitas (assunto é o plano, não capacidade): `BillingCard` (UI de assinatura)
e `lib/actions/billing.ts` ("você já tem o plano PRO").

Webhook (`app/api/stripe/webhook/route.ts`): mapa `STRIPE_PRICE_TO_PLAN` construído
de `process.env.STRIPE_PRO_PRICE_ID`. Em `customer.subscription.created/updated`
com status ativo/trialing, `plan = STRIPE_PRICE_TO_PLAN[firstItem.price.id] ?? "PRO"`
(fallback preserva o comportamento atual se o env não estiver configurado);
downgrade por status inalterado. `resolvePlan(status, priceId)` passa a receber o preço.

Landing: usar `PLAN_PRICES.PRO` em `LandingPricing` (localizar o texto do preço —
pode estar quebrado em partes no JSX).

Testes: unit dos helpers (`tests/unit/plan-limits.test.ts` se existir, senão criar);
atualizar/estender o teste do webhook para o caso "status ativo com priceId mapeado
para PRO" e "priceId desconhecido cai no fallback".

Nenhuma mudança de comportamento visível — é blindagem para plano futuro.

## 2.2 Snapshot como fonte primária do nome

Inverter para `serviceNameSnapshot ?? service?.name` (semântica: histórico conta a
verdade da época) nos pontos que hoje preferem a relação:

- `components/quote-request/QuoteRequestCard.tsx` e `QuoteRequestDetails.tsx`
- `app/u/[slug]/reserva/[requestId]/page.tsx` (itemName e description do Pix)

Conferir e normalizar (parecem já usar snapshot primeiro): `app/proposta/[publicToken]/page.tsx`,
`app/api/proposals/[id]/pdf/route.ts`, `app/(dashboard)/dashboard/propostas/nova/page.tsx`.
Pedidos antigos sem snapshot continuam caindo na relação.

## 2.3 Hash no token de reset de senha

- Novo `lib/auth/tokens.ts` com `hashToken(token)` (SHA-256 hex);
  `lib/auth/email-verification.ts` passa a delegar para ele.
- Migração: `DELETE FROM "PasswordResetToken"` + rename `token` → `tokenHash`
  (TTL é 1h — quem tinha reset pendente pede de novo; sem dupla coluna).
- `requestPasswordReset`: grava `tokenHash: hashToken(token)`, link continua com o
  token puro.
- `resetPassword` (e a página `redefinir-senha/[token]`, se ela consulta o banco):
  buscar por `tokenHash: hashToken(token)`.
- Testes em `tests/actions/auth.test.ts` espelhando os da verificação de e-mail
  (grava hash e não o token puro; reset com token válido acha pelo hash).

## 2.4 Paginação do painel de pedidos (plano B)

- **Query**: `?page=N` (default 1), `take: 20`, `skip: (page-1)*20`,
  `orderBy: { createdAt: "desc" }` — exceto view `PIX_RESERVATION`, que usa
  `orderBy: [{ pixReservationClientPaidAt: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }]`
  (informados primeiro). A função `sortRequestsForDashboardView` (criada na seção 1
  para ordenar em JS) é removida junto com seus testes — substituída pelo orderBy.
- **Filtros no banco**: novo `dashboardRequestViewWhere(view, monthRange, now)` em
  `lib/dashboard.ts` retornando o `where` Prisma espelho de
  `matchesDashboardRequestView` (que permanece como fonte de verdade testada;
  testes novos garantem a equivalência caso a caso). Filtro por status vira
  `where: { status }`.
- **Resumo só**: o `findMany` da lista não inclui mais `statusHistory` nem
  `internalNotes` (ficam no detalhe). `service` e `proposal` mínimos permanecem
  (badges e views).
- **Contadores**: filtros de status via
  `groupBy({ by: ["status"], _count: true, where: { providerId } })` + `count`
  total — em vez de filtrar array.
- **Card sem accordion**: `QuoteRequestCard` vira um `<Link>` para
  `/dashboard/pedidos/[id]` com o conteúdo do header atual (avatar, badges,
  nome, item). `QuoteRequestDetails` continua sendo usado pela página de detalhe.
  O tipo da lista pode afinar para os campos do resumo.
- **UI de paginação**: "← Anterior / Próxima →" + "Página N de M" preservando
  `status`/`view` na query string. Página fora do intervalo cai na 1.

## 2.5 Reabrir/estender reserva Pix expirada (plano A)

- Action provider-only `reopenPixReservation(formData)` em
  `lib/actions/quote-requests.ts`: `requireProviderProfile`; pedido do provider com
  `pixReservationRequestedAt` preenchido, `pixReservationPaidAt` nulo e
  **expirado** (senão redirect sem mudança). Seta
  `pixReservationRequestedAt = new Date()` (novas 48h). `returnTo` validado como
  nas demais. `pixReservationClientPaidAt` fica intocado — quando o cliente
  informou pagamento, o estado "informado" tem precedência sobre "expirado" e o
  botão de reabrir nem aparece.
- UI: botão "Gerar novo prazo" no bloco "Pix expirado" do `QuoteRequestDetails`.
- E-mail ao cliente (quando houver `customerEmail`) via `after()`:
  `sendPixReservationReopenedEmail({ to, customerName, businessName, serviceName, amount, reservaUrl })`
  — "O prazo do seu pagamento foi renovado", botão para a página da reserva.
  Falha só loga.
- Testes de action: expirada reabre e agenda e-mail; não expirada é no-op; paga é
  no-op; pedido alheio rejeita.

## Fora de escopo

- Terceiro plano/preço anual (seção 8.4) — o 2.1 só prepara o terreno.
- Idempotência do webhook (3.1).
- "Carregar mais"/infinite scroll.
