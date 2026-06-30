# Stripe Elements — Formulário de Pagamento In-App

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Substituir o redirect para Stripe Checkout por um modal com formulário de pagamento (`PaymentElement`) dentro do próprio site.

**Architecture:** O botão "Assinar PRO" no `BillingCard` chama a Server Action `createSubscriptionIntent`, que cria uma subscription `incomplete` e retorna o `clientSecret`. O modal `SubscriptionModal` usa `@stripe/react-stripe-js` para renderizar o `PaymentElement` e confirmar o pagamento. O webhook existente (`customer.subscription.updated`) faz o upgrade do plano para PRO sem alterações.

**Tech Stack:** `@stripe/stripe-js`, `@stripe/react-stripe-js`, Stripe Node SDK (já instalado), Next.js Server Actions, Tailwind CSS.

---

## Mapeamento de arquivos

```
lib/
  stripe-client.ts           # CRIAR — singleton loadStripe() client-side
  actions/
    billing.ts               # MODIFICAR — substituir createCheckoutSession por createSubscriptionIntent

components/
  billing/
    SubscriptionModal.tsx    # CRIAR — modal com Elements + PaymentElement
    BillingCard.tsx          # MODIFICAR — abre modal em vez de redirecionar
```

---

## Task 1: Instalar pacotes e configurar variável de ambiente

**Files:**

- Modify: `package.json` (via npm install)
- Modify: `.env`
- Modify: `.env.example`

- [ ] **Step 1.1: Instalar pacotes Stripe client-side**

```bash
cd /home/leonardodesaboia/Documents/Personal/vitriny
npm install @stripe/stripe-js @stripe/react-stripe-js
```

Esperado: pacotes aparecem em `dependencies` no `package.json`.

- [ ] **Step 1.2: Adicionar NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ao .env**

No arquivo `.env`, após `STRIPE_SECRET_KEY`, adicionar:

```env
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_..."
```

Substituir `pk_test_...` pela chave publicável do Stripe Dashboard → Developers → API Keys.

- [ ] **Step 1.3: Atualizar .env.example**

No arquivo `.env.example`, na seção `# Stripe`, adicionar após `STRIPE_PRO_PRICE_ID`:

```env
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_..."
```

- [ ] **Step 1.4: Verificar build**

```bash
npm run build
```

Esperado: sem erros.

- [ ] **Step 1.5: Commit**

```bash
git add package.json package-lock.json .env.example
git commit -m "feat(billing): install Stripe client-side SDK and add publishable key env var"
```

---

## Task 2: Criar lib/stripe-client.ts

**Files:**

- Create: `lib/stripe-client.ts`

- [ ] **Step 2.1: Criar o singleton client-side**

Criar `/home/leonardodesaboia/Documents/Personal/vitriny/lib/stripe-client.ts`:

```typescript
import { loadStripe } from "@stripe/stripe-js";

export const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!,
);
```

- [ ] **Step 2.2: Verificar build**

```bash
npm run build
```

Esperado: sem erros de tipo.

- [ ] **Step 2.3: Commit**

```bash
git add lib/stripe-client.ts
git commit -m "feat(billing): add Stripe client-side singleton"
```

---

## Task 3: Substituir createCheckoutSession por createSubscriptionIntent

**Files:**

- Modify: `lib/actions/billing.ts`

A Server Action atual (`createCheckoutSession`) redireciona o usuário para o Stripe Checkout. Vamos substituí-la por `createSubscriptionIntent`, que cria uma subscription `incomplete` e retorna o `clientSecret` para o modal.

- [ ] **Step 3.1: Reescrever lib/actions/billing.ts**

Substituir todo o conteúdo de `lib/actions/billing.ts` por:

```typescript
"use server";

import type { Stripe } from "stripe";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";

export async function createSubscriptionIntent(): Promise<
  { clientSecret: string } | { error: string }
> {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Não autenticado." };
  }

  const profile = await prisma.providerProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true, stripeCustomerId: true, plan: true },
  });

  if (!profile) {
    return { error: "Perfil não encontrado." };
  }

  if (profile.plan === "PRO") {
    return { error: "Você já tem o plano PRO." };
  }

  let customerId = profile.stripeCustomerId;

  if (!customerId) {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { email: true, name: true },
    });

    const customer = await stripe.customers.create({
      email: user?.email ?? undefined,
      name: user?.name ?? undefined,
      metadata: { providerProfileId: profile.id },
    });

    customerId = customer.id;

    await prisma.providerProfile.update({
      where: { id: profile.id },
      data: { stripeCustomerId: customerId },
    });
  }

  const subscription = await stripe.subscriptions.create({
    customer: customerId,
    items: [{ price: process.env.STRIPE_PRO_PRICE_ID! }],
    payment_behavior: "default_incomplete",
    payment_settings: { save_default_payment_method: "on_subscription" },
    expand: ["latest_invoice.payment_intent"],
  });

  await prisma.providerProfile.updateMany({
    where: { id: profile.id },
    data: { stripeSubscriptionId: subscription.id },
  });

  const invoice = subscription.latest_invoice as Stripe.Invoice;
  const paymentIntent = invoice.payment_intent as Stripe.PaymentIntent;

  if (!paymentIntent?.client_secret) {
    return { error: "Erro ao criar intenção de pagamento. Tente novamente." };
  }

  return { clientSecret: paymentIntent.client_secret };
}
```

- [ ] **Step 3.2: Verificar build**

```bash
npm run build
```

Esperado: sem erros de tipo. O build pode alertar que `createCheckoutSession` não existe mais — isso é esperado e será resolvido na Task 5 quando o `BillingCard` for atualizado.

- [ ] **Step 3.3: Commit**

```bash
git add lib/actions/billing.ts
git commit -m "feat(billing): replace createCheckoutSession with createSubscriptionIntent"
```

---

## Task 4: Criar SubscriptionModal

**Files:**

- Create: `components/billing/SubscriptionModal.tsx`

O modal usa `<Elements>` do `@stripe/react-stripe-js` para inicializar o contexto Stripe com o `clientSecret`, e `<PaymentElement>` para renderizar o formulário de pagamento.

- [ ] **Step 4.1: Criar components/billing/SubscriptionModal.tsx**

```tsx
"use client";

import { useState } from "react";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { stripePromise } from "@/lib/stripe-client";

type SubscriptionModalProps = {
  clientSecret: string;
  onClose: () => void;
  onSuccess: () => void;
};

function PaymentForm({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;

    setLoading(true);
    setError(null);

    const { error: stripeError } = await stripe.confirmPayment({
      elements,
      confirmParams: {},
      redirect: "if_required",
    });

    if (stripeError) {
      setError(stripeError.message ?? "Erro ao processar pagamento.");
      setLoading(false);
      return;
    }

    onSuccess();
  }

  return (
    <form onSubmit={handleSubmit}>
      <PaymentElement />
      {error ? (
        <p className="mt-3 text-xs font-semibold text-red-700">{error}</p>
      ) : null}
      <div className="mt-6 flex justify-end gap-3">
        <button
          type="button"
          onClick={onClose}
          disabled={loading}
          className="inline-flex min-h-9 items-center justify-center rounded-md border border-paper-soft bg-white px-4 text-xs font-semibold text-ink-muted transition hover:border-leaf hover:text-leaf disabled:opacity-60"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={loading || !stripe}
          className="inline-flex min-h-9 items-center justify-center rounded-md bg-leaf px-5 text-xs font-semibold text-white transition hover:bg-leaf-hover disabled:opacity-60"
        >
          {loading ? "Processando..." : "Confirmar assinatura"}
        </button>
      </div>
    </form>
  );
}

export function SubscriptionModal({
  clientSecret,
  onClose,
  onSuccess,
}: SubscriptionModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
      <div className="w-full max-w-md rounded-xl border border-paper-soft bg-white p-6 shadow-card">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-fraunces text-xl font-bold text-ink">
            Assinar plano PRO
          </h2>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-md text-ink-muted transition hover:bg-paper hover:text-ink"
            aria-label="Fechar"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
        <Elements stripe={stripePromise} options={{ clientSecret }}>
          <PaymentForm onClose={onClose} onSuccess={onSuccess} />
        </Elements>
      </div>
    </div>
  );
}
```

- [ ] **Step 4.2: Verificar build**

```bash
npm run build
```

Esperado: sem erros de tipo.

- [ ] **Step 4.3: Commit**

```bash
git add components/billing/SubscriptionModal.tsx
git commit -m "feat(billing): add SubscriptionModal with Stripe PaymentElement"
```

---

## Task 5: Atualizar BillingCard

**Files:**

- Modify: `components/billing/BillingCard.tsx`

Substituir todo o conteúdo por:

- [ ] **Step 5.1: Reescrever components/billing/BillingCard.tsx**

```tsx
"use client";

import { useState, useTransition } from "react";
import type { PlanTier, SubscriptionStatus } from "@prisma/client";
import { createSubscriptionIntent } from "@/lib/actions/billing";
import { PLAN_NAMES } from "@/lib/plan-limits";
import { SubscriptionModal } from "@/components/billing/SubscriptionModal";

const STATUS_LABELS: Record<SubscriptionStatus, string> = {
  ACTIVE: "Ativa",
  TRIALING: "Em período de teste",
  PAST_DUE: "Pagamento pendente",
  CANCELED: "Cancelada",
  INCOMPLETE: "Aguardando pagamento inicial",
  INCOMPLETE_EXPIRED: "Expirada",
  UNPAID: "Não paga",
  PAUSED: "Pausada",
};

type BillingCardProps = {
  plan: PlanTier;
  subscriptionStatus: SubscriptionStatus | null;
  currentPeriodEnd: Date | null;
};

export function BillingCard({
  plan,
  subscriptionStatus,
  currentPeriodEnd,
}: BillingCardProps) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  function handleSubscribe() {
    setError(null);
    startTransition(async () => {
      const result = await createSubscriptionIntent();
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setClientSecret(result.clientSecret);
    });
  }

  function handleModalClose() {
    setClientSecret(null);
  }

  function handleSuccess() {
    setClientSecret(null);
    setShowSuccess(true);
  }

  return (
    <>
      {clientSecret ? (
        <SubscriptionModal
          clientSecret={clientSecret}
          onClose={handleModalClose}
          onSuccess={handleSuccess}
        />
      ) : null}

      <section className="rounded-xl border border-paper-soft bg-white p-6 shadow-card">
        {showSuccess ? (
          <div className="mb-5 rounded-lg border border-green-200 bg-green-50 px-4 py-3">
            <p className="text-sm font-semibold text-green-800">
              Assinatura realizada com sucesso! Seu plano será atualizado em
              instantes.
            </p>
          </div>
        ) : null}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-leaf">
              Plano atual
            </p>
            <h2 className="mt-2 font-fraunces text-2xl font-bold text-ink">
              {PLAN_NAMES[plan]}
            </h2>
            {subscriptionStatus ? (
              <p className="mt-1 text-sm text-ink-muted">
                Assinatura: {STATUS_LABELS[subscriptionStatus]}
              </p>
            ) : null}
            {currentPeriodEnd && plan === "PRO" ? (
              <p className="mt-1 text-sm text-ink-muted">
                Renova em{" "}
                {currentPeriodEnd.toLocaleDateString("pt-BR", {
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                })}
              </p>
            ) : null}
          </div>

          {plan === "FREE" ? (
            <div className="flex flex-col gap-2">
              <button
                onClick={handleSubscribe}
                disabled={pending}
                className="inline-flex min-h-9 items-center justify-center rounded-md bg-leaf px-5 text-xs font-semibold text-white transition hover:bg-leaf-hover disabled:opacity-60"
              >
                {pending ? "Aguarde..." : "Assinar PRO"}
              </button>
              {error ? (
                <p className="text-xs font-semibold text-red-700">{error}</p>
              ) : null}
            </div>
          ) : null}
        </div>

        {plan === "FREE" ? (
          <div className="mt-5 rounded-lg border border-paper-soft bg-paper p-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-ink-muted">
              Plano PRO inclui
            </p>
            <ul className="mt-3 grid gap-2 text-sm text-ink sm:grid-cols-2">
              <li className="flex items-center gap-2">
                <span className="text-leaf">✓</span> Serviços ativos ilimitados
              </li>
              <li className="flex items-center gap-2">
                <span className="text-leaf">✓</span> Pedidos ilimitados por mês
              </li>
              <li className="flex items-center gap-2">
                <span className="text-leaf">✓</span> Propostas ilimitadas por
                mês
              </li>
              <li className="flex items-center gap-2">
                <span className="text-leaf">✓</span> Templates ilimitados
              </li>
            </ul>
          </div>
        ) : null}
      </section>
    </>
  );
}
```

- [ ] **Step 5.2: Verificar build**

```bash
npm run build
```

Esperado: sem erros de tipo. Build completo sem warnings.

- [ ] **Step 5.3: Commit**

```bash
git add components/billing/BillingCard.tsx
git commit -m "feat(billing): update BillingCard to open SubscriptionModal instead of redirecting"
```

---

## Checklist de teste manual

- [ ] Adicionar `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...` ao `.env`
- [ ] `stripe listen --api-key sk_test_... --forward-to localhost:3000/api/stripe/webhook` em terminal separado
- [ ] `npm run dev`
- [ ] Acessar `/dashboard/billing`
- [ ] Clicar "Assinar PRO" — modal deve abrir com formulário de pagamento
- [ ] Preencher com cartão de teste `4242 4242 4242 4242`, data futura, qualquer CVC
- [ ] Clicar "Confirmar assinatura" — deve mostrar loading "Processando..."
- [ ] Após sucesso: modal fecha, banner verde aparece na página
- [ ] Terminal do `stripe listen` deve mostrar `customer.subscription.updated` com `status: active`
- [ ] Recarregar página — plano deve aparecer como PRO
- [ ] Testar cartão recusado `4000 0000 0000 0002` — deve mostrar erro inline no modal sem fechar
