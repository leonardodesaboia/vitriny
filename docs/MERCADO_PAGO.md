# Mercado Pago — Assinatura PRO (estado, achados e pendências)

> Última atualização: 2026-08-03. Substitui o Stripe como gateway da assinatura PRO.
> Plano de implementação: `docs/superpowers/plans/2026-08-03-mercado-pago-migration.md`.

## Resumo

A assinatura PRO migrou de Stripe para **Mercado Pago**. O **cartão** está implementado e funcional (checkout **embutido** via Card Brick). O **Pix** está **parcialmente implementado e bloqueado** por uma questão de arquitetura + conta (ver "Pix: achados") e seu botão foi ocultado até o gate liberar. O código Stripe permanece no repositório como legado (coexistência segura), a ser removido no cutover.

Decisão de checkout: **Card Payment Brick embutido** para cartão (PCI baixa, dentro do app); Pix **não pode** ser embutido (autorização no app do banco é regra do Banco Central).

## O que foi entregue (merged em `main`)

Migração implementada via subagentes com TDD, mergeada `feat/mercado-pago` → `develop` → `main` (PR #9). Commits principais: `729e8f3`..`8fb386b` (feature), `48933f3` (fix do botão de cartão).

- `lib/mercadopago.ts` — client singleton lazy do SDK `mercadopago` (v3.2.1).
- `lib/mp-plan.ts` — `resolvePlanFromPreapproval(status)`: `authorized`→PRO, `cancelled`/`paused`→FREE, resto→null.
- `prisma/schema.prisma` — campos `mpPreapprovalId` (@unique) e `mpPayerId` em `ProviderProfile` + migration `20260803163735_add_mercado_pago_fields`.
- `lib/plan-limits.ts` / `lib/effective-plan.ts` / `lib/actions/auth-guard.ts` — `isOneTimeProExpired` e `EffectivePlanInput` passam a considerar `mpPreapprovalId` (assinatura MP ativa não é rebaixada na leitura).
- `lib/actions/mp-billing.ts`:
  - `createMpCardSubscription(cardToken, payerEmail)` — cria preapproval com `card_token_id` + `status: "authorized"` (ativa PRO na hora).
  - `createMpPixSubscription(payerEmail)` — bloqueia no servidor com erro explícito enquanto o gate do Pix Automático não estiver liberado; não cria novas preapprovals pendentes incorretas.
  - `cancelMpSubscription()` — `preapproval.update({ status: "cancelled" })`.
- `app/api/mercadopago/webhook/route.ts` — webhook com validação de assinatura (`WebhookSignatureValidator`, HMAC), trata `subscription_preapproval`, casa por `mpPreapprovalId`, ignora status sem plano resolvido.
- `components/billing/MpSubscriptionModal.tsx` — modal com Card Brick (`@mercadopago/sdk-react`, `NEXT_PUBLIC_MP_PUBLIC_KEY`).
- `components/billing/BillingCard.tsx` + `app/(dashboard)/dashboard/billing/page.tsx` — "Assinar com cartão" abre o Brick. O botão Pix está temporariamente oculto porque o checkout da conta não renderiza Pix Automático.
- `lib/actions/account.ts` — antes do soft delete, cancela assinaturas recorrentes Stripe e Mercado Pago; se algum cancelamento falhar, a exclusão é abortada para evitar cobrança sem conta acessível.
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

### Gate de conta — bloqueado

A API **aceitar** Pix em `payment_methods_allowed` **não garante** que o checkout **renderiza** Pix ao pagador — isso depende da conta ter **Pix Automático habilitado/contratado** com o MP. O teste manual do `init_point` confirmou que a conta oferece somente cartão. O botão Pix fica oculto até o Mercado Pago habilitar Pix Automático para Assinaturas e um novo teste liberar o gate.

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

## Checklist para a integração funcionar por completo

Executar nesta ordem, mantendo Stripe em coexistência até o cutover:

### 1. Publicar e validar o hardening atual

- [ ] Commitar e publicar as correções locais do Card Brick, bloqueio do Pix e cancelamento MP na exclusão de conta.
- [ ] Fazer deploy com **rebuild** para embutir `NEXT_PUBLIC_MP_PUBLIC_KEY` no bundle.
- [ ] Testar o cartão em homologação com comprador de teste diferente da conta vendedora e usar no Brick o e-mail desse comprador.
- [ ] Confirmar que o perfil vira PRO, guarda `mpPreapprovalId` e mostra `currentPeriodEnd`.
- [ ] Se houver recusa, consultar o log seguro `Erro ao criar assinatura Mercado Pago por cartão`; não registrar token, PAN ou CVV.

### 2. Configurar e completar webhooks

- [ ] Na aplicação `Vitriny-app` (`7690447716694963`), cadastrar a URL sandbox `https://SEU-HOMOLOG/api/mercadopago/webhook` e a URL de produção equivalente.
- [ ] Habilitar os tópicos `subscription_preapproval`, `subscription_authorized_payment` e `payment`.
- [ ] Copiar o secret gerado para `MP_WEBHOOK_SECRET` no ambiente correspondente.
- [ ] Estender o handler com TDD para consultar e tratar `subscription_authorized_payment`, atualizar `currentPeriodEnd`/`subscriptionStatus` e processar eventos repetidos de forma idempotente.
- [ ] Confirmar no histórico do MCP/painel entregas HTTP 200 e testar assinatura inválida com HTTP 401.

### 3. Evitar assinaturas duplicadas ou órfãs

- [ ] Adicionar chave de idempotência estável por tentativa de assinatura.
- [ ] Proteger chamadas concorrentes e clique duplo para que um perfil não crie duas preapprovals.
- [ ] Reconciliar ou compensar falha do banco após autorização remota.
- [ ] Cobrir concorrência entre criação de assinatura e exclusão de conta.

### 4. Definir semântica de cancelamento

- [ ] Decidir entre cancelamento imediato ou acesso até `currentPeriodEnd`.
- [ ] Alinhar `cancelMpSubscription`, `cancelAtPeriodEnd`, `subscriptionStatus`, webhook e texto da UI à decisão.
- [ ] Para o MVP, cancelamento imediato é a opção mais simples; se for adotado, remover da UI a promessa de acesso até o fim do período.

### 5. Liberar Pix somente após o gate da conta

- [ ] Solicitar ao Mercado Pago a habilitação de Pix Automático para Assinaturas.
- [ ] Reabrir o `init_point` do plano e confirmar visualmente que Pix aparece.
- [ ] Só depois configurar `MP_PRO_PLAN_ID`, validar propagação de `external_reference` e implementar o fluxo por plano.
- [ ] Manter botão e Server Action Pix bloqueados enquanto o checkout oferecer somente cartão.

### 6. Conferir ambientes e credenciais

- [ ] Em homologação, usar `MP_ACCESS_TOKEN=TEST-...`, Public Key de teste, secret sandbox, `MP_PRO_AMOUNT` e `NEXT_PUBLIC_APP_URL` público.
- [ ] Em produção, garantir que Access Token e Public Key pertencem à mesma `Vitriny-app`; nunca misturar teste e produção.
- [ ] Atualizar `.env.production.example` com as envs MP sem incluir valores reais.

### 7. Pendências após cobrança recorrente estável

- [ ] Mostrar faturas/cobranças Mercado Pago; a tela atual consulta apenas Stripe.
- [ ] Implementar reativação MP e remover dependência Stripe dessa ação.
- [ ] Gravar `mpPayerId` quando disponível.
- [ ] Executar o cutover/remover Stripe somente após validar cartão, renovação, falha, cancelamento e webhook em produção.

## Pendências

1. **Solicitar a habilitação do Pix Automático** para Assinaturas na conta Mercado Pago e repetir o teste do `init_point`. O gate atual está bloqueado.
2. **Implementar o fluxo de Pix por plano** (seção "Arquitetura correta"), incluindo ajuste do webhook por `external_reference` e novos tópicos.
3. **Cutover (Task 12):** remover código Stripe/Pix-manual e os modais órfãos (`SubscriptionModal`, `UpdatePaymentModal`, `ProPixPaymentModal`), migração de limpeza dos campos `stripe*`, após MP validado em produção.
4. **Follow-ups** (revisão final): `cancelMpSubscription` não seta `cancelAtPeriodEnd`; webhook não atualiza `subscriptionStatus`; `mpPayerId` nunca é gravado; "reativar"/"atualizar cartão" ainda apontam pro Stripe; guard de dupla-assinatura no botão Pix; `proAmount` cai em 0 se env ausente.
