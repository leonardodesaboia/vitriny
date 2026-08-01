# Pix para a assinatura PRO

## Atualização (2026-08-01): Pix do Stripe é invite-only

O desenho original abaixo (três modalidades via Stripe) ficou **bloqueado antes de
qualquer implementação**: ao tentar ativar Pix no Dashboard, o Stripe informou que
Pix no Brasil é **mediante convite**, exigindo no mínimo 60 dias de histórico de
pagamentos processados na conta — não é um toggle livre. A conta do projeto não
atende esse requisito ainda.

Decisão: seguir **sem Stripe** pra essa necessidade específica, reaproveitando o
sistema de Pix estático que o app já tem (`lib/pix.ts`) — o mesmo usado hoje pros
clientes dos provedores pagarem diretamente na conta do provedor. A seção
"Modalidade atual" abaixo é o que será implementado agora. A seção original
(Stripe) fica registrada como referência caso a elegibilidade abra no futuro —
não descartada, só não é o caminho ativo.

## Modalidade atual: Pix estático + confirmação manual

Reaproveita `createPixPayment()` (já existe, sem depender de nenhum gateway) com
uma chave Pix **da própria Vitriny** (não do provedor). O assinante paga direto
na conta da Vitriny; a confirmação é manual, feita por um admin único (o
operador da Vitriny).

### Por que não é uma "assinatura" de verdade

Sem um gateway processando a recorrência, não há como cobrar automaticamente todo
mês. O modelo vira **compra de 1 mês por vez, repetível**: cada confirmação
estende `currentPeriodEnd` em 30 dias. As modalidades "Pix Automático" e "Pix por
fatura" do desenho original dependiam do Stripe gerenciar a recorrência — sem
Stripe, essa distinção deixa de existir; sobra só o equivalente à antiga "Fase 2"
(1 mês via Pix), mas paga na conta da Vitriny em vez de processada pelo Stripe.

### Dados

Nova tabela, sem alterar `ProviderProfile`:

```prisma
model ProPixPayment {
  id                String    @id @default(cuid())
  providerProfileId String
  providerProfile   ProviderProfile @relation(fields: [providerProfileId], references: [id], onDelete: Cascade)
  amount            Decimal   @db.Decimal(10, 2)
  requestedAt       DateTime  @default(now())
  clientPaidAt      DateTime?
  confirmedAt       DateTime?
  updatedAt         DateTime  @updatedAt

  @@index([providerProfileId])
}
```

`ProviderProfile.plan`/`currentPeriodEnd` continuam sendo a fonte de verdade do
acesso PRO — igual já é hoje pro Stripe. `stripeSubscriptionId` permanece `null`
pra quem pagou por aqui, e é exatamente esse campo que diferencia "PRO via
Stripe" de "PRO via Pix manual" na UI e no auto-rebaixamento.

Sem campo de expiração do QR: o pedido fica `PENDING` (sem `clientPaidAt` nem
`confirmedAt`) indefinidamente até ser pago ou abandonado. Não há necessidade de
um prazo técnico — é só um código Pix estático, não uma cobrança que expira.

### Admin único

Não existe conceito de admin/role na aplicação hoje (confirmado no schema). Como
só o operador da Vitriny confirma esses pagamentos — não é por provedor, é
global — a solução mínima é um gate por e-mail:

```ts
// lib/admin.ts
export function isAdminEmail(email: string | null | undefined): boolean {
  return !!email && email === process.env.ADMIN_EMAIL;
}
```

Sem tabela de roles nova. Se um dia houver mais de um admin, evolui pra lista;
não é o caso agora.

### Fluxo

1. **Assinante pede pra pagar via Pix** — `requestProPixPayment()`
   (`lib/actions/billing.ts`):
   - Rejeita se `profile.plan === "PRO"` já ativo.
   - Reaproveita um `ProPixPayment` `PENDING` existente do mesmo perfil em vez
     de criar outro (idempotência — evita múltiplos códigos Pix vivos ao mesmo
     tempo).
   - Busca o valor via `stripe.prices.retrieve(STRIPE_PRO_PRICE_ID)` — só
     leitura, sem processar nada no Stripe; mantém o preço single-source (cartão
     e Pix cobram o mesmo valor sem duplicar constante). `unit_amount` vem em
     centavos (ex.: `1990` = R$19,90) — converter com `(unit_amount / 100).toFixed(2)`
     antes de passar pra `createPixPayment`, que espera `amount` como string em reais.
   - Gera `copyPasteCode`/`qrCodeDataUrl` via `createPixPayment()`, com
     `pixKey`/`pixHolderName`/`pixCity` da Vitriny (novas env vars, não as do
     provedor) e `transactionId` = id do registro criado.
   - Retorna os dados pro modal exibir.

2. **Assinante marca "Já paguei"** — `markProPixPaymentClientPaid(paymentId)`:
   - Confere que o pagamento pertence ao perfil da sessão.
   - Idempotente: se já tem `clientPaidAt`, não regrava.
   - Grava `clientPaidAt = now`.
   - `after()`: e-mail pro `ADMIN_EMAIL` avisando pra confirmar no banco. Falha
     de envio só loga, não bloqueia a resposta (mesmo padrão dos e-mails
     existentes).

3. **Admin confirma** — `confirmProPixPayment(paymentId)`, gated por
   `isAdminEmail`:
   - Idempotente: se já tem `confirmedAt`, não regrava.
   - Grava `confirmedAt = now`.
   - Atualiza o perfil: `plan: "PRO"`, `currentPeriodEnd` estendido em 30 dias a
     partir de `max(currentPeriodEnd atual, now)` — renovar antes de vencer não
     desperdiça os dias que já restavam.

4. **Página `/admin/pix-payments`**: lista pagamentos com `clientPaidAt`
   preenchido e `confirmedAt` vazio (ordenados por `clientPaidAt`), com nome do
   negócio, valor, datas, e botão "Confirmar" (`<form action={...}>`).

### UI (`components/billing/BillingCard.tsx`)

- `plan === "FREE"`: mantém o botão "Assinar PRO" (cartão, Stripe) e adiciona
  "Pagar 1 mês via Pix" ao lado — abre um modal novo e simples (QR, copia-e-cola
  com botão de copiar, botão "Já paguei"), sem `Elements`/Stripe.js envolvido.
- `plan === "PRO"` **sem** `stripeSubscriptionId` (ou seja, ganho via Pix
  manual): em vez dos botões "Cancelar assinatura"/"Atualizar cartão" (que não
  fazem sentido aqui), mostra "PRO ativo até {data} · pago via Pix" e um botão
  "Renovar mais 1 mês" chamando a mesma `requestProPixPayment()`.
- `plan === "PRO"` **com** `stripeSubscriptionId`: inalterado.

### Auto-rebaixamento pra FREE

Mesma regra do desenho original, sem cron: onde `profile.plan` é lido pra
limites, se `plan === "PRO"`, `stripeSubscriptionId === null` e
`currentPeriodEnd` já passou, tratar como FREE nessa leitura e persistir.

### Env vars novas

`VITRINY_PIX_KEY`, `VITRINY_PIX_HOLDER_NAME`, `VITRINY_PIX_CITY` (chave Pix da
empresa, não do provedor) e `ADMIN_EMAIL` (e-mail que pode confirmar
pagamentos). Adicionar em `.env.example` e `docs/DEPLOY.md`.

### Testes

- `requestProPixPayment`: rejeita se já é PRO; reaproveita pedido `PENDING`
  existente em vez de duplicar; gera QR com o valor correto do Stripe.
- `markProPixPaymentClientPaid`: idempotente; rejeita pagamento de outro
  perfil; agenda o e-mail.
- `confirmProPixPayment`: rejeita sem `ADMIN_EMAIL`; idempotente; estende
  `currentPeriodEnd` corretamente tanto vencido quanto ainda ativo (renovação
  antecipada não perde dias).
- Unit: helper de auto-rebaixamento (mesmos casos do desenho original).

## Fora de escopo

- Qualquer mudança no fluxo de Pix já existente pros clientes do provedor
  (entrada de proposta, `FIXED_PIX`) — sistema separado, usa a chave Pix do
  próprio provedor, não a da Vitriny.
- Cobrança automática/recorrente de verdade — sem gateway processando, não tem
  como; é compra de 1 mês repetível.
- Aviso por e-mail antes do vencimento do mês vigente — rebaixamento é
  silencioso, sem lembrete prévio.
- Múltiplos admins / sistema de roles — só o e-mail único por env var.

---

## Anexo: desenho original via Stripe (bloqueado, referência futura)

Mantido caso a elegibilidade do Pix no Stripe (60 dias de histórico + convite)
abra no futuro — nenhuma parte desta seção será implementada agora.

### Contexto

O checkout do plano PRO hoje usa Stripe Checkout Session (`mode: subscription`, `ui_mode: elements`) com `PaymentElement`, cobrando só por cartão. O componente (`SubscriptionModal.tsx`) já tem uma mensagem preparada pra Pix ("Se escolheu Pix, escaneie o QR code acima"), mas a sessão nunca ofereceu Pix de fato — verificado batendo direto na API do Stripe com a chave sandbox do projeto:

```
ERROR: The payment method type provided: pix is invalid. Please ensure
the provided type is activated in your dashboard...
```

Testado também que `payment_method_options.pix.mandate_options` (recurso "Pix Automático", lançado pelo Stripe em abril/2026 pra cobrança recorrente via Pix) é aceito pela API em `mode: subscription` sem erro de elegibilidade — o único bloqueio encontrado foi a ativação geral do Pix, não uma restrição adicional pro Pix Automático. Ou seja: se um dia a conta for convidada, o resto do desenho abaixo deve continuar válido.

### Objetivo original

Três formas de pagar o PRO via Pix, como cards visualmente iguais:

1. **Pix Automático** — assinatura recorrente cobrada automaticamente via Pix todo mês (mandato autorizado uma vez no banco do cliente).
2. **Pix por fatura** — assinatura recorrente, mas cada ciclo gera uma fatura que o cliente paga manualmente via QR Pix (sem cobrança automática).
3. **1 mês via Pix** — pagamento único, sem assinatura. Libera o PRO por 30 dias; ao vencer, volta pra FREE sozinho. (Esta é a que virou a "Modalidade atual" acima, adaptada pra não depender do Stripe.)

### Arquitetura

| Modalidade | Objeto Stripe | `stripeSubscriptionId` | Renovação |
|---|---|---|---|
| Pix Automático | `Subscription` com `payment_method_options.pix.mandate_options` (amount fixo, `payment_schedule: monthly`) | preenchido | automática via mandato — mesmos webhooks do cartão |
| Pix por fatura | `Subscription` com `collection_method: send_invoice` | preenchido | manual — cliente paga a hosted invoice do Stripe a cada ciclo |
| 1 mês via Pix | `Checkout Session` `mode: payment` (sem subscription) | `null` | nenhuma — expira e volta pra FREE |

### Mudanças de código (se reativado)

- `lib/actions/billing.ts`: `createCheckoutSession` ganha modalidade
  (`"pix_auto" | "pix_invoice"`) com `payment_method_options.pix.mandate_options`
  (`amount_type: "fixed"`, já que o default do Stripe é `"maximum"`) ou
  `collection_method: "send_invoice"`.
- `app/api/stripe/webhook/route.ts`: `checkout.session.completed` sem
  `subscription` grava `plan`/`currentPeriodEnd` direto (pagamento único).
- Assinatura (Pix Automático/fatura) reaproveita o handling de
  `customer.subscription.*` e `invoice.payment_failed` já existente.
