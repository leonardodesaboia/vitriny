# Mercado Pago — Assinatura PRO (estado, achados e pendências)

> Última atualização: 2026-08-04. Substitui o Stripe como gateway da assinatura PRO.
> Plano de implementação: `docs/superpowers/plans/2026-08-03-mercado-pago-migration.md`.

## Pix único via Payments API

Além do fluxo recorrente condicionado ao gate de Pix Automático, o billing agora oferece um Pix avulso de 1 mês quando `MP_PRO_AMOUNT` está configurado. A aplicação cria um pagamento `pix` pela Payments API, persiste `ProPixPayment.mpPaymentId`/`expiresAt`, exibe o QR imediatamente e confirma a liberação de 30 dias exclusivamente pelo webhook `payment` aprovado. O helper `lib/pro-pix.ts` usa uma trava atômica para manter a concessão idempotente; o modal consulta apenas o banco durante o polling.

O fluxo manual `VITRINY_PIX` permanece intacto e fora desta integração.

## Resumo

A assinatura PRO migrou de Stripe para **Mercado Pago**. O **cartão** está implementado e funcional (checkout **embutido** via Card Brick). O Pix único via Payments API está disponível; já o **Pix recorrente** continua condicionado ao gate de Pix Automático e seu botão permanece oculto até a conta ser habilitada. O código Stripe permanece no repositório como legado (coexistência segura), a ser removido no cutover.

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
- [x] Estender o handler com TDD para consultar e tratar `subscription_authorized_payment`/`payment`, atualizar `subscriptionStatus` e processar eventos repetidos de forma idempotente (o handler grava `subscriptionStatus` em toda transição e trata `cancelled` como soft-cancel, igual à Server Action).
- [ ] Confirmar no histórico do MCP/painel entregas HTTP 200 e testar assinatura inválida com HTTP 401.

### 3. Evitar assinaturas duplicadas ou órfãs

- [x] Adicionar trava contra concorrência: `lib/mp-subscription-lock.ts` implementa uma trava TTL por perfil (não é chave de idempotência do MP em si, mas cumpre o mesmo papel de impedir duas preapprovals).
- [x] Proteger chamadas concorrentes e clique duplo para que um perfil não crie duas preapprovals — `createMpCardSubscription` adquire a trava antes de criar a preapproval e permite reativação (nova preapproval) somente quando a assinatura atual está `cancelAtPeriodEnd: true`.
- [x] Reconciliar falha do banco após autorização remota — a trava é liberada (`releaseSubscriptionLock`) em `finally`, evitando travas órfãs se a escrita local falhar.
- [x] Cobrir concorrência entre criação de assinatura e exclusão de conta nos dois sentidos — `lib/actions/account.ts` **adquire** a trava (não só a lê) antes de cancelar e a segura até o fim: se uma criação de assinatura já está em andamento, a exclusão aborta; e enquanto a exclusão roda, nenhuma preapproval nova pode ser criada e escapar do cancelamento. Se a exclusão aborta no meio (falha ao cancelar no Stripe ou no MP), a trava é liberada para não bloquear a retentativa.

### 4. Definir semântica de cancelamento

- [x] Decidido: **acesso até `currentPeriodEnd`** (não cancelamento imediato — a opção que a seção acima cogitava como "mais simples para o MVP" não foi a adotada).
- [x] `cancelMpSubscription`, `cancelAtPeriodEnd`, `subscriptionStatus`, webhook e UI alinhados à decisão: `cancelMpSubscription` cancela a preapproval no MP imediatamente mas seta `cancelAtPeriodEnd: true` e mantém PRO local; a expiração lazy rebaixa para FREE quando `currentPeriodEnd` passa (só para assinantes MP com `cancelAtPeriodEnd: true` — assinantes Stripe não são afetados); o webhook aplica o mesmo soft-cancel ao receber `cancelled`, cobrindo cancelamento feito direto no MP.
- [x] A UI mantém a promessa de acesso até o fim do período (texto do `BillingCard` não prometia cancelamento imediato; nada precisou ser removido).

### 5. Liberar Pix somente após o gate da conta

- [ ] Solicitar ao Mercado Pago a habilitação de Pix Automático para Assinaturas.
- [ ] Reabrir o `init_point` do plano e confirmar visualmente que Pix aparece.
- [x] Fluxo de Pix por plano implementado: `createMpPixSubscription` retorna um redirect real para o `init_point` do plano quando `MP_PRO_PLAN_INIT_POINT` está configurado (env opcional, documentada em `.env.example`); o webhook trata `subscription_authorized_payment`/`payment` e casa por `external_reference` quando `metadata.preapproval_id` está presente no recurso de pagamento (defensivo: no-op quando o payload não tem o formato esperado, já que não foi validado contra um pagamento MP real). Falta apenas configurar `MP_PRO_PLAN_INIT_POINT` e validar contra o `init_point` real — bloqueado pelo gate de conta abaixo.
- [x] Botão e Server Action Pix continuam bloqueados enquanto o checkout oferecer somente cartão — `pixAvailable` (env-driven) controla a exibição do botão "Assinar com Pix" no `BillingCard`; hoje é `false` em todo ambiente real porque `MP_PRO_PLAN_INIT_POINT` está vazio.

### 6. Conferir ambientes e credenciais

- [ ] Em homologação, usar `MP_ACCESS_TOKEN=TEST-...`, Public Key de teste, secret sandbox, `MP_PRO_AMOUNT` e `NEXT_PUBLIC_APP_URL` público.
- [ ] Em produção, garantir que Access Token e Public Key pertencem à mesma `Vitriny-app`; nunca misturar teste e produção.
- [ ] Atualizar `.env.production.example` com as envs MP sem incluir valores reais.

### 7. Pendências após cobrança recorrente estável

- [x] Mostrar faturas/cobranças Mercado Pago — `/api/billing/invoices` agora também lista pagamentos MP (via `payment.search`, filtrado por `external_reference`), mesclados com as faturas Stripe e ordenados por data decrescente; a busca MP é isolada em try/catch para uma instabilidade no MP não derrubar o endpoint inteiro para lojistas só-Stripe.
- [x] Implementar reativação MP — "Reativar assinatura" no `BillingCard` reabre o modal do Card Brick para assinantes MP (uma preapproval cancelada é terminal no MP, não dá pra "descancelar"); assinantes Stripe mantêm a reativação de zero-input existente.
- [x] Gravar `mpPayerId` quando disponível — `createMpCardSubscription` persiste `mpPayerId` a partir do `payer_id` retornado pela preapproval.
- [ ] Executar o cutover/remover Stripe somente após validar cartão, renovação, falha, cancelamento e webhook em produção.

## Pendências

1. **Solicitar a habilitação do Pix Automático** para Assinaturas na conta Mercado Pago e repetir o teste do `init_point`. O gate atual está bloqueado — esta é a única pendência restante do fluxo de Pix por plano (o código em si já está implementado, ver seção 5 do checklist).
2. **Cutover:** remover código Stripe/Pix-manual e os modais órfãos (`SubscriptionModal`, `UpdatePaymentModal`, `ProPixPaymentModal`), migração de limpeza dos campos `stripe*`, após MP validado em produção. Fora do escopo deste plano de hardening; precisa de validação em produção primeiro.
