# Pix para a assinatura PRO

## Contexto

O checkout do plano PRO hoje usa Stripe Checkout Session (`mode: subscription`, `ui_mode: elements`) com `PaymentElement`, cobrando só por cartão. O componente (`SubscriptionModal.tsx`) já tem uma mensagem preparada pra Pix ("Se escolheu Pix, escaneie o QR code acima"), mas a sessão nunca ofereceu Pix de fato — verificado batendo direto na API do Stripe com a chave sandbox do projeto:

```
ERROR: The payment method type provided: pix is invalid. Please ensure
the provided type is activated in your dashboard...
```

Ou seja: **Pix ainda não está ativado no Dashboard Stripe da conta**. Isso é um toggle manual (Settings → Payment methods → Pix), não dá pra ativar via API, e é pré-requisito pras três modalidades abaixo — sem isso nenhuma delas funciona, incluindo a mais simples.

Testado também que `payment_method_options.pix.mandate_options` (recurso "Pix Automático", lançado pelo Stripe em abril/2026 pra cobrança recorrente via Pix) é aceito pela API em `mode: subscription` sem erro de elegibilidade — o único bloqueio encontrado foi a ativação geral do Pix, não uma restrição adicional pro Pix Automático.

## Objetivo

Dar ao assinante três formas de pagar o plano PRO via Pix, além do cartão que já existe:

1. **Pix Automático** — assinatura recorrente cobrada automaticamente via Pix todo mês (mandato autorizado uma vez no banco do cliente).
2. **Pix por fatura** — assinatura recorrente, mas cada ciclo gera uma fatura que o cliente paga manualmente via QR Pix (sem cobrança automática).
3. **1 mês via Pix** — pagamento único, sem assinatura. Libera o PRO por 30 dias; ao vencer, volta pra FREE sozinho.

As três aparecem como opções visualmente iguais (cards lado a lado) na hora de assinar — sem uma "padrão" e as outras escondidas.

## Fora de escopo

- Notificação/e-mail de aviso antes do vencimento do pacote de 1 mês — ele expira silenciosamente, sem aviso prévio (decisão consciente: evita construir infra de job agendado, que hoje não existe no projeto).
- Qualquer mudança no fluxo de Pix já existente pros clientes do provedor (entrada de proposta, `FIXED_PIX`) — é um sistema separado, usa a chave Pix do próprio provedor (`lib/pix.ts`), não o Stripe.
- Ativar Pix no Dashboard do Stripe — é ação manual do usuário, não código.

## Arquitetura

Cada modalidade mapeia pra uma forma diferente de representar "acesso PRO" nos dados já existentes (`ProviderProfile.plan`, `subscriptionStatus`, `currentPeriodEnd`, `stripeSubscriptionId`, `cancelAtPeriodEnd`) — sem novos campos no schema:

| Modalidade | Objeto Stripe | `stripeSubscriptionId` | Renovação |
|---|---|---|---|
| Pix Automático | `Subscription` com `payment_method_options.pix.mandate_options` (amount fixo, `payment_schedule: monthly`) | preenchido | automática via mandato — mesmos webhooks do cartão |
| Pix por fatura | `Subscription` com `collection_method: send_invoice` | preenchido | manual — cliente paga a hosted invoice do Stripe a cada ciclo |
| 1 mês via Pix | `Checkout Session` `mode: payment` (sem subscription) | `null` | nenhuma — expira e volta pra FREE |

O `PaymentElement`/`CheckoutElementsProvider` já usado em `SubscriptionModal.tsx` funciona para as três: muda só qual server action alimenta o `clientSecret`. Não precisa de componente de pagamento novo.

## Mudanças de código

### `lib/actions/billing.ts`

- `createCheckoutSession` ganha um parâmetro de modalidade (`"pix_auto" | "pix_invoice"`) que decide entre:
  - `payment_method_options: { pix: { mandate_options: { amount, amount_type: "fixed", payment_schedule: "monthly" } } }` (Pix Automático — `amount_type: "fixed"` porque o preço do PRO não varia; o default do Stripe é `"maximum"`), ou
  - `collection_method: "send_invoice"` na criação da assinatura (Pix por fatura).
- Nova action `createOnetimeMonthCheckout()`: Checkout Session `mode: payment`, `payment_method_types: ["pix"]`, valor lido dinamicamente do Price do PRO (`stripe.prices.retrieve(STRIPE_PRO_PRICE_ID).unit_amount`) pra não duplicar/desalinhar o valor.
- Toda action que tentar usar Pix deve capturar o erro específico do Stripe (`payment method type... is invalid` / código de payment method não ativado) e devolver mensagem tratada ("Pix não está disponível no momento") em vez de estourar erro genérico — cobre o caso de alguém reativar/desativar Pix no Dashboard depois do deploy.

### `components/billing/BillingCard.tsx`

Quando `plan === "FREE"`, troca o botão único "Assinar PRO" por três cards (Pix Automático / Pix por fatura / 1 mês via Pix), cada um chamando a action correspondente e abrindo o mesmo `SubscriptionModal` com o `clientSecret` retornado.

### `app/api/stripe/webhook/route.ts`

- `checkout.session.completed`: quando a sessão não tem `subscription` (caso do pagamento único), gravar `plan: "PRO"` e `currentPeriodEnd: now + 30 dias` direto, sem tocar `stripeSubscriptionId`.
- Os casos de assinatura (Pix Automático e Pix por fatura) reaproveitam o handling de `customer.subscription.created/updated/deleted` e `invoice.payment_failed` que já existe — nenhuma mudança de lógica ali, só passam a poder chegar via Pix em vez de só cartão.

### Auto-rebaixamento do pagamento único

Onde `profile.plan` é lido pra decidir limites (`getPlanLimits` e afins): se `plan === "PRO"`, `stripeSubscriptionId === null` e `currentPeriodEnd` já passou, tratar como FREE nessa leitura (e persistir a atualização). Sem cron novo — o próprio acesso ao dashboard/perfil dispara a correção na primeira vez que alguém entra depois do vencimento.

## Tratamento de erro

- Pix desativado no Dashboard (esqueceram o pré-requisito, ou desativaram depois): erro tratado nas actions, mensagem clara pro usuário.
- Falha na cobrança recorrente (mandato não autorizado a tempo, saldo insuficiente etc.): já cai em `invoice.payment_failed` → `subscriptionStatus: PAST_DUE`, sem mudança de código.
- Pagamento único (`mode: payment`) que falha ou é abandonado: não gera nenhum registro de mudança de plano — o `checkout.session.completed` só dispara em sucesso.

## Testes

- Unit: helper de auto-rebaixamento (`plan PRO + sem subscription + currentPeriodEnd vencido → FREE`; `plan PRO + com subscription ativa → mantém PRO` mesmo com `currentPeriodEnd` no passado, porque webhook ainda não processou a renovação).
- Webhook: `checkout.session.completed` sem `subscription` grava `plan`/`currentPeriodEnd` corretos; com `subscription` continua no fluxo já existente (regressão).
- Actions: cada nova/alterada action retornando client secret nos casos de sucesso e mensagem tratada quando Pix está indisponível (mock do erro do Stripe).

## Riscos e faseamento

Pix Automático (`mandate_options`) é a peça mais nova do lado do Stripe (abril/2026) — a API aceita os parâmetros, mas isso não garante que o fluxo completo (autorização no banco do cliente, cobrança do primeiro ciclo, renovações) se comporte como esperado em produção. Implementação faseada:

1. **Fase 1** — Pix Automático. Implementar, ativar Pix no Dashboard, validar em produção com uma assinatura real antes de seguir.
2. **Fase 2** — 1 mês via Pix (mais simples, sem mandato).
3. **Fase 3** — Pix por fatura (depende de confirmar que a hosted invoice page do Stripe realmente oferece Pix — assumido pela documentação de "dynamic payment methods", mas não testado ainda).

Este spec cobre as três; o plano de implementação (writing-plans) cobre só a Fase 1 por ora.
