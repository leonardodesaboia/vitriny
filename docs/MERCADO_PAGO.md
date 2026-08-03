# Mercado Pago — Assinatura PRO (estado, achados e pendências)

> Última atualização: 2026-08-03. Substitui o Stripe como gateway da assinatura PRO.
> Plano de implementação: `docs/superpowers/plans/2026-08-03-mercado-pago-migration.md`.

## Resumo

A assinatura PRO migrou de Stripe para **Mercado Pago**. O **cartão** está implementado e funcional (checkout **embutido** via Card Brick). O **Pix** está **parcialmente implementado e bloqueado** por uma questão de arquitetura + conta (ver "Pix: achados"). O código Stripe permanece no repositório como legado (coexistência segura), a ser removido no cutover.

Decisão de checkout: **Card Payment Brick embutido** para cartão (PCI baixa, dentro do app); Pix **não pode** ser embutido (autorização no app do banco é regra do Banco Central).

## O que foi entregue (merged em `main`)

Migração implementada via subagentes com TDD, mergeada `feat/mercado-pago` → `develop` → `main` (PR #9). Commits principais: `729e8f3`..`8fb386b` (feature), `48933f3` (fix do botão de cartão).

- `lib/mercadopago.ts` — client singleton lazy do SDK `mercadopago` (v3.2.1).
- `lib/mp-plan.ts` — `resolvePlanFromPreapproval(status)`: `authorized`→PRO, `cancelled`/`paused`→FREE, resto→null.
- `prisma/schema.prisma` — campos `mpPreapprovalId` (@unique) e `mpPayerId` em `ProviderProfile` + migration `20260803163735_add_mercado_pago_fields`.
- `lib/plan-limits.ts` / `lib/effective-plan.ts` / `lib/actions/auth-guard.ts` — `isOneTimeProExpired` e `EffectivePlanInput` passam a considerar `mpPreapprovalId` (assinatura MP ativa não é rebaixada na leitura).
- `lib/actions/mp-billing.ts`:
  - `createMpCardSubscription(cardToken, payerEmail)` — cria preapproval com `card_token_id` + `status: "authorized"` (ativa PRO na hora).
  - `createMpPixSubscription(payerEmail)` — cria preapproval `pending` e retorna `init_point`. **⚠️ Ver "Pix: achados" — este fluxo está incorreto para Pix.**
  - `cancelMpSubscription()` — `preapproval.update({ status: "cancelled" })`.
- `app/api/mercadopago/webhook/route.ts` — webhook com validação de assinatura (`WebhookSignatureValidator`, HMAC), trata `subscription_preapproval`, casa por `mpPreapprovalId`, ignora status sem plano resolvido.
- `components/billing/MpSubscriptionModal.tsx` — modal com Card Brick (`@mercadopago/sdk-react`, `NEXT_PUBLIC_MP_PUBLIC_KEY`).
- `components/billing/BillingCard.tsx` + `app/(dashboard)/dashboard/billing/page.tsx` — botões "Assinar com cartão" (abre Brick) e "Assinar com Pix" (redirect).
- `lib/billing-status.ts` — `hasActiveRecurringSubscription` (fix do Bug 1, ver abaixo).
- `.env.example` / `docs/DEPLOY.md` — envs MP documentadas.

Suíte: 572 testes passando; build compila.

## Bug corrigido (Bug 1 — botão "Assinar com cartão" desabilitado)

`createMpPixSubscription` grava `mpPreapprovalId` mesmo com a assinatura só **pendente** (plano ainda FREE). A página computava `hasActiveSubscription = !!(stripeSubscriptionId ?? mpPreapprovalId)`, que virava `true` e desabilitava o botão de cartão (`disabled={pending || hasActiveSubscription}`).

Fix (`48933f3`): `lib/billing-status.ts` → `hasActiveRecurringSubscription` exige **plano PRO efetivo** + id de assinatura. Uma preapproval só pendente não conta como ativa.

## Pix: achados da investigação (crítico — ler antes de mexer)

O plano original assumiu, **errado**, que uma `preapproval` pendente redirecionaria para um `init_point` onde o pagador escolhe Pix ou cartão. A investigação (sondas reais na API sandbox) revelou:

1. **Preapproval "solta" (sem plano) → checkout só de cartão.** Foi o que o usuário viu: "Assinar com Pix" abre um checkout que só oferece cartão.
2. **Para ter Pix, é preciso `preapproval_plan` com `payment_methods_allowed`.** Probe `POST /preapproval_plan` retornou **HTTP 201** aceitando Pix. Payload exato que funciona:
   ```json
   "payment_methods_allowed": {
     "payment_types": [ { "id": "credit_card" }, { "id": "bank_transfer" } ],
     "payment_methods": [ { "id": "pix" } ]
   }
   ```
   (Pix no MP = `payment_method.id: "pix"`, `type: "bank_transfer"`.) O plano retorna um `init_point` do tipo `.../subscriptions/checkout?preapproval_plan_id=<id>`.
3. **Preapproval associada a plano + `status: "pending"` → HTTP 400 `card_token_id is required`.** Ou seja: **não dá** para criar uma assinatura pendente por assinante associada ao plano sem cartão. O fluxo "por assinante" só existe para cartão (authorized). Para Pix, tem que **redirecionar direto ao `init_point` do plano**.
4. **Implicação no webhook:** com plano, os tópicos são `subscription_authorized_payment` + `payments` (e `subscription_preapproval_plan`), não só `subscription_preapproval`. E como o `mpPreapprovalId` é gerado pelo MP quando o pagador assina no checkout do plano, o webhook precisa **casar por `external_reference`** (id do perfil), não por um id que já temos. O webhook atual não faz isso.

### Bloqueio em aberto (gate de conta)

A API **aceitar** Pix em `payment_methods_allowed` **não garante** que o checkout **renderiza** Pix ao pagador — isso depende da conta ter **Pix Automático habilitado/contratado** com o MP. **Não confirmado.** Teste decisivo: abrir o `init_point` do plano e ver se Pix aparece; ou verificar no painel do MP.

## Arquitetura correta do Pix (a implementar, se o gate liberar)

1. Criar o `preapproval_plan` uma vez (com `payment_methods_allowed` acima), guardar o id em env `MP_PRO_PLAN_ID`.
2. "Assinar com Pix" → redirecionar ao `init_point` do plano com `external_reference` = id do perfil (validar se o MP honra `external_reference` na URL do checkout do plano).
3. Webhook → tratar `subscription_authorized_payment` + `payments`, casar por `external_reference`, gravar `mpPreapprovalId` e ativar PRO.
4. Cartão continua no Card Brick embutido (inalterado).

## Ferramental de desenvolvimento: MP MCP

Plugin oficial instalado nesta máquina (`/plugin install mercadopago@mercadopago-claude-marketplace`) e conectado via OAuth (`/mp-connect`). Dá acesso autenticado à API/docs do MP durante o desenvolvimento (criar/inspecionar planos, `search_documentation`, `create_test_user`, `save_webhook`, `quality_checklist`). Contas visíveis: `Vitriny-app` (7690447716694963) e `integracao-bot`. É ferramenta de **dev**, não runtime — o app continua usando o SDK `mercadopago` (npm).

## Credenciais e teste

- Envs: `MP_ACCESS_TOKEN`, `MP_WEBHOOK_SECRET`, `MP_PRO_AMOUNT` (server-side, ponto decimal p.ex. `19.90`), `NEXT_PUBLIC_MP_PUBLIC_KEY` (client, **build arg** no Docker/Easypanel).
- Ambiente atual do `.env`: token **TEST-** (sandbox).
- MP **rejeita `localhost`** em `back_url`/webhook → testar exige URL pública (deploy ou túnel).
- Cartão de teste aprovado: nome `APRO`, ex. Mastercard `5031 4332 1540 6351`, validade futura, CVV `123`.

## Pendências

1. **Confirmar o gate de Pix Automático** na conta (abrir o `init_point` do plano ou checar painel). Bloqueia toda a implementação de Pix.
2. **Implementar o fluxo de Pix por plano** (seção "Arquitetura correta"), incluindo ajuste do webhook por `external_reference` e novos tópicos.
3. **Cutover (Task 12):** remover código Stripe/Pix-manual e os modais órfãos (`SubscriptionModal`, `UpdatePaymentModal`, `ProPixPaymentModal`), migração de limpeza dos campos `stripe*`, após MP validado em produção.
4. **Follow-ups** (revisão final): `cancelMpSubscription` não seta `cancelAtPeriodEnd`; webhook não atualiza `subscriptionStatus`; `mpPayerId` nunca é gravado; "reativar"/"atualizar cartão" ainda apontam pro Stripe; guard de dupla-assinatura no botão Pix; `proAmount` cai em 0 se env ausente.
