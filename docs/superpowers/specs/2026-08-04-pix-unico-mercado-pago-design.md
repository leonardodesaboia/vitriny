# Pix único da assinatura PRO via Mercado Pago

**Data:** 2026-08-04
**Status:** Aprovado (design)

## Problema

Na tela de assinatura (`/dashboard/billing`) o cliente não tem como pagar o PRO
via Pix:

- O botão "Assinar com Pix" (recorrente) só renderiza se
  `MP_PRO_PLAN_INIT_POINT` estiver setado — env ausente no ambiente, então o
  botão fica oculto. Esse fluxo depende de "Pix Automático para Assinaturas",
  que a Mercado Pago libera caso a caso; não dá pra ligar por código.
- O fluxo de Pix único que existe hoje (`requestProPixPayment` +
  `ProPixPaymentModal` + confirmação manual do admin usando `VITRINY_PIX_*`)
  está **órfão**: nenhum componente da UI o importa, e as envs `VITRINY_PIX_*`
  não estão configuradas.

## Objetivo

Adicionar um pagamento **Pix único via Mercado Pago (Payments API)**: o cliente
paga 1 mês, o QR é gerado na hora pela MP, o webhook `payment` confirma sozinho
e libera 30 dias de PRO. Renovação = pagar de novo. Sem confirmação manual do
admin.

### Fora de escopo (não alterar)

- **Recorrente-Pix**: segue como está — redirect para `MP_PRO_PLAN_INIT_POINT`,
  gated pela env, oculto enquanto a env não existir.
- **Fluxo manual `VITRINY_PIX`** (`requestProPixPayment`, `ProPixPaymentModal`,
  `/admin/pix-payments`, `confirmProPixPayment`): fica intacto. Passa a ser
  redundante, mas não é removido nesta entrega.

## Decisões

- **Escopo:** apenas Pix único via MP (não os dois botões).
- **Confirmação:** automática. O modal faz polling e vira "confirmado" sozinho.
- **Expiração do QR:** 30 minutos.
- **Data model:** reusar `ProPixPayment` (já modela "pagamento Pix avulso que
  concede 30 dias"), adicionando os campos de correlação com a MP.
- **Quem confirma:** o webhook concede o período; o polling do modal apenas lê o
  banco. A concessão vive num helper único e idempotente.

### Variáveis de ambiente

**Nenhuma env nova.** O fluxo reusa: `MP_ACCESS_TOKEN`, `MP_PRO_AMOUNT`,
`MP_WEBHOOK_SECRET`, `NEXT_PUBLIC_APP_URL`.

## Arquitetura

### 1. Migration — `ProPixPayment`

Adicionar:

- `mpPaymentId String? @unique` — id do pagamento na MP. Chave de correlação
  (webhook → row) e de idempotência.
- `expiresAt DateTime?` — quando o QR morre (usado pelo status `expired`).

Campos existentes reaproveitados: `amount`, `requestedAt`, `confirmedAt`
(momento da concessão), `providerProfileId`. `clientPaidAt` permanece (usado só
pelo fluxo manual antigo; não é escrito pelo fluxo novo).

### 2. `createMpPixPayment(payerEmail)` — `lib/actions/mp-billing.ts`

Server action. Passos:

1. `loadSubscribableProfile()` (reusa as travas de "já é PRO").
2. `amount = proAmount()` (de `MP_PRO_AMOUNT`); erro se ausente/inválido.
3. Valida `payerEmail` (mesmo schema Zod das outras actions MP).
4. **Idempotência:** procura `ProPixPayment` do perfil com `mpPaymentId != null`,
   `confirmedAt == null`, `expiresAt > now`. Se existe, re-busca o QR na MP
   (`Payment.get`) e retorna o mesmo — não cria outro pagamento.
5. Senão: cria a row (`amount`, `providerProfileId`) → cria o pagamento MP →
   grava `mpPaymentId` e `expiresAt` na row.

Chamada à MP (`new Payment(getMercadoPago()).create`):

```
body: {
  transaction_amount: amount,
  description: "Vitriny PRO",
  payment_method_id: "pix",
  payer: { email: payerEmail },
  external_reference: profile.id,
  date_of_expiration: <ISO now+30min>,
  metadata: { pro_pix_payment_id: row.id }
}
requestOptions: { idempotencyKey: row.id }   // evita cobrança duplicada em retry
```

Retorno: `{ qrCode, qrCodeBase64, paymentId: row.id, expiresAt }`, extraídos de
`point_of_interaction.transaction_data.{qr_code, qr_code_base64}`.

Erro na MP → não deixar row pendurada sem `mpPaymentId` (deletar/marcar a row
criada) e retornar mensagem amigável.

### 3. `getMpPixPaymentStatus(rowId)` — `lib/actions/mp-billing.ts`

Lê apenas o banco (barato, seguro pra polling):

- `confirmedAt != null` → `"confirmed"`
- `expiresAt` no passado → `"expired"`
- senão → `"pending"`

Restringe a query ao perfil do usuário logado.

### 4. Concessão — helper `grantProPixPeriod(mpPaymentId | row)`

Idempotente, em transação:

- Guard: se `confirmedAt != null`, no-op (retorna sucesso).
- `confirmedAt = now`.
- `providerProfile`: `plan = "PRO"`,
  `currentPeriodEnd = max(now, currentPeriodEnd) + 30 dias`.

Espelha `confirmProPixPayment` (admin) — extrair a lógica comum para reuso pelo
webhook e pelo admin manual.

### 5. Webhook — `app/api/mercadopago/webhook/route.ts`

No ramo `type === "payment"` (assinatura de eventos existente):

- Hoje: busca o pagamento, e se **não** tem `metadata.preapproval_id`, retorna
  200 sem fazer nada.
- Novo: antes de sair, se `metadata.pro_pix_payment_id` presente **e**
  `status === "approved"` → `grantProPixPeriod()`. (Fallback de match por
  `mpPaymentId == paymentResource.id` caso o metadata venha vazio.)
- Pagamentos de assinatura (com `preapproval_id`) seguem pelo caminho atual,
  intactos.

### 6. UI

**`app/(dashboard)/dashboard/billing/page.tsx`:** passar
`mpPixAvailable = proAmount > 0` ao `BillingCard`.

**`components/billing/BillingCard.tsx`:** no ramo FREE, adicionar botão
"Pagar 1 mês via Pix" (ao lado de "Assinar com cartão"), gated por
`mpPixAvailable`. Ao clicar, chama `createMpPixPayment` e abre o modal.

**`components/billing/MpPixPaymentModal.tsx` (novo):**

- Mostra imagem do QR (`data:image/png;base64,<qrCodeBase64>`) + código
  copia-e-cola + botão copiar.
- Contagem regressiva até `expiresAt` (30 min).
- Polling de `getMpPixPaymentStatus(paymentId)` a cada ~4s:
  - `confirmed` → estado "Pagamento confirmado!" → `router.refresh()`.
  - `expired` → estado "QR expirado" + botão "Gerar novo Pix".
  - `pending` → continua.
- Para o polling ao fechar/confirmar/expirar.

## Tratamento de erro

- Idempotency key na criação MP → sem cobrança duplicada em retry.
- Assinatura do webhook já validada (HMAC) antes de qualquer processamento.
- Concessão idempotente (guard `confirmedAt` + transação) → webhook reentregue
  não estende o período duas vezes.
- `amount` congelado na row na criação → consistência entre QR, concessão e
  histórico.

## Testes

- **Webhook** (`tests/api/mercadopago-webhook.test.ts`): pagamento Pix único
  `approved` concede 30 dias; reentrega é idempotente; pagamento de assinatura
  (com `preapproval_id`) não é afetado.
- **Action** (`tests/actions/mp-billing.test.ts`): `createMpPixPayment` happy
  path; reuso de pendente não-expirado; guards (já é PRO); `getMpPixPaymentStatus`
  retorna pending/confirmed/expired corretamente.

## Impacto

- Migration Prisma (2 colunas nulas, sem backfill).
- Webhook ganha um ramo; comportamento de assinatura inalterado.
- Nenhuma env nova.
