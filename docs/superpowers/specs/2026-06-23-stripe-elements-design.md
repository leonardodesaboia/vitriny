# Stripe Elements — Formulário de Pagamento In-App

**Data:** 2026-06-23
**Status:** Aprovado

## Objetivo

Substituir o redirect para Stripe Checkout por um modal de pagamento dentro do próprio site, usando Stripe Elements (`PaymentElement`). O usuário assina o plano PRO sem sair do OrçaFácil.

## Contexto

A integração atual (`createCheckoutSession`) redireciona o usuário para `checkout.stripe.com`. A nova implementação mantém o usuário em `/dashboard/billing` e abre um modal com o formulário de pagamento.

O webhook existente (`customer.subscription.updated`) não sofre alterações — ele já trata o upgrade de plan para PRO quando o status da assinatura muda para `active`.

## Arquitetura

### Fluxo

```
1. Usuário clica "Assinar PRO" no BillingCard
2. Modal abre com estado de loading
3. createSubscriptionIntent (Server Action) é chamada:
   - Cria/reutiliza stripeCustomerId no ProviderProfile
   - Cria subscription com payment_behavior: 'default_incomplete'
   - Expande latest_invoice.payment_intent
   - Retorna { clientSecret: string }
4. Modal renderiza <Elements clientSecret>
5. PaymentElement é exibido ao usuário
6. Usuário preenche dados de pagamento
7. Clica "Confirmar assinatura"
8. stripe.confirmPayment({ redirect: 'if_required' }) é chamado
9. Sucesso:
   - Modal fecha
   - Banner de sucesso aparece na página
10. Stripe dispara customer.subscription.updated (status: active)
11. Webhook existente seta plan: PRO no banco
12. Próximo carregamento da página mostra plano PRO
```

### Cancelamento

Fechar o modal não requer ação server-side. A subscription `incomplete` expira automaticamente em 23h pela Stripe se o pagamento não for confirmado.

## Variáveis de ambiente

Nova variável necessária (pública, segura para expor no client):

```env
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

## Arquivos

### Criados

| Arquivo | Responsabilidade |
|---|---|
| `lib/stripe-client.ts` | Singleton client-side `loadStripe()` com `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` |
| `components/billing/SubscriptionModal.tsx` | Modal com `<Elements>`, `<PaymentElement>`, botões e tratamento de erro |

### Modificados

| Arquivo | Mudança |
|---|---|
| `lib/actions/billing.ts` | Remove `createCheckoutSession`, adiciona `createSubscriptionIntent` |
| `components/billing/BillingCard.tsx` | Botão "Assinar PRO" abre modal em vez de chamar redirect |
| `.env.example` | Adiciona `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` |

### Sem alterações

| Arquivo | Motivo |
|---|---|
| `app/api/stripe/webhook/route.ts` | `customer.subscription.updated` já trata o upgrade |
| `app/(dashboard)/dashboard/billing/page.tsx` | Passa `stripePublishableKey` como prop para `BillingCard` |
| `prisma/schema.prisma` | Sem mudanças de schema |

## Componentes

### `lib/stripe-client.ts`

Singleton client-side. Usa `loadStripe()` do `@stripe/stripe-js` com a chave pública. Exporta promise cacheada para evitar múltiplas instâncias.

```typescript
import { loadStripe } from "@stripe/stripe-js";
export const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);
```

### `lib/actions/billing.ts` — `createSubscriptionIntent`

Server Action que:
1. Verifica sessão autenticada
2. Verifica que `profile.plan !== 'PRO'`
3. Cria/reutiliza `stripeCustomerId`
4. Cria subscription:
   ```typescript
   stripe.subscriptions.create({
     customer: customerId,
     items: [{ price: process.env.STRIPE_PRO_PRICE_ID! }],
     payment_behavior: 'default_incomplete',
     payment_settings: { save_default_payment_method: 'on_subscription' },
     expand: ['latest_invoice.payment_intent'],
   })
   ```
5. Salva `stripeSubscriptionId` no banco
6. Retorna `{ clientSecret: string }` ou `{ error: string }`

### `components/billing/SubscriptionModal.tsx`

Client component. Recebe `clientSecret` e `onClose` como props.

Estados internos:
- `loading`: enquanto `confirmPayment` está em andamento
- `error`: mensagem de erro do Stripe (cartão recusado, etc.)

Estrutura visual:
- Overlay escuro (`fixed inset-0 bg-ink/40 z-50`)
- Modal centralizado (`bg-white rounded-xl border border-paper-soft shadow-card p-6 max-w-md w-full`)
- Header: "Assinar plano PRO" + botão X
- Corpo: `<PaymentElement />`
- Footer: botão "Confirmar assinatura" (disabled + "Processando..." durante loading) + botão "Cancelar"
- Erro inline abaixo do footer

### `components/billing/BillingCard.tsx`

Adiciona estado `showModal: boolean` e `clientSecret: string | null`.

Ao clicar "Assinar PRO":
1. Chama `createSubscriptionIntent()`
2. Se retornar `clientSecret`: abre modal
3. Se retornar `error`: exibe erro inline

Quando modal fecha com sucesso: exibe banner de sucesso na página.

## Dependências

```bash
npm install @stripe/stripe-js @stripe/react-stripe-js
```

`stripe` (server SDK) já está instalado.

## Tratamento de erros

| Cenário | Comportamento |
|---|---|
| `createSubscriptionIntent` retorna `error` | Erro exibido inline no BillingCard, modal não abre |
| Cartão recusado no PaymentElement | Erro exibido inline no modal, usuário pode tentar novamente |
| Subscription já existe (PRO) | Server Action retorna `{ error: "Você já tem o plano PRO." }` |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` ausente | `loadStripe` retorna null, modal mostra erro genérico |

## O que não muda

- Webhook e lógica de `plan` — sem alterações
- Schema Prisma — sem alterações
- Página de billing — sem alterações estruturais
- Limites de uso FREE/PRO — sem alterações
