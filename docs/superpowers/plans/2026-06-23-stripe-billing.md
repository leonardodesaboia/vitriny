# Stripe Billing — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir que o prestador autenticado assine o plano PRO mensal via Stripe Checkout com assinatura recorrente, atualizando `ProviderProfile.plan` via webhook assinado.

**Architecture:** Stripe Checkout (mode: subscription) hospedado pelo Stripe — o Vitriny nunca toca dados de cartão. Um Route Handler em `/api/stripe/webhook` recebe eventos, valida a assinatura com `STRIPE_WEBHOOK_SECRET` e atualiza `ProviderProfile` no banco. O `plan` só sobe para `PRO` via webhook; o front nunca altera diretamente.

**Tech Stack:** `stripe` (Node SDK), Prisma (PostgreSQL), Next.js App Router Server Actions + Route Handler, Zod, TypeScript.

---

## Auditoria pré-implementação

### 1. Models relacionados a User, ProviderProfile, plan e limites

- `User` — usuário autenticado (id, email, name).
- `ProviderProfile` — perfil 1:1 com User. Único campo de billing existente: `plan PlanTier @default(FREE)`. Nenhum campo de Stripe.
- `PlanTier` enum: `FREE | PRO`.
- `lib/plan-limits.ts` — centraliza limites por plano; não toca no banco.
- Nenhum model de subscription, customer, invoice ou billing existe hoje.

### 2. Onde armazenar campos da Stripe

Em `ProviderProfile`. Justificativa:

- Já é 1:1 com `User` — não há motivo para mais uma entidade nesta etapa.
- Os limites de uso já vivem em `ProviderProfile.plan` — manter tudo no mesmo model evita joins.
- `stripeCustomerId` precisa de `@unique` para que o webhook encontre o perfil sem busca por email (mais rápido e sem ambiguidade).

Não criar uma entidade `Subscription` separada agora — YAGNI. Se precisar de histórico de cobranças, isso fica para depois da validação.

### 3. Necessidade de alterar schema Prisma

Sim. Adicionar ao `ProviderProfile`:

- `stripeCustomerId String? @unique`
- `stripeSubscriptionId String? @unique`
- `stripePriceId String?`
- `subscriptionStatus SubscriptionStatus?`
- `currentPeriodEnd DateTime?`

Adicionar enum `SubscriptionStatus` com os 8 status possíveis da Stripe.

### 4. Migration a criar

Nome: `add_stripe_billing`

Cria enum `SubscriptionStatus` e adiciona as 5 colunas nullable ao `ProviderProfile`. Não altera dados existentes — todos os campos são opcionais.

### 5. Rotas e actions necessárias

| Arquivo                                      | Tipo                 | Responsabilidade                                                                                  |
| -------------------------------------------- | -------------------- | ------------------------------------------------------------------------------------------------- |
| `lib/actions/billing.ts`                     | Server Action        | `createCheckoutSession` — cria/reutiliza customer, cria Checkout Session, redireciona para Stripe |
| `app/api/stripe/webhook/route.ts`            | Route Handler (POST) | Recebe eventos Stripe, valida assinatura, atualiza ProviderProfile                                |
| `app/(dashboard)/dashboard/billing/page.tsx` | Server Component     | Página de billing: mostra plano atual, status, data de renovação                                  |

### 6. Variáveis de ambiente necessárias

```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRO_PRICE_ID=price_...
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 7. Eventos de webhook tratados

| Evento                          | Por quê                                                                                                        |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `checkout.session.completed`    | Momento em que o pagamento inicial foi concluído — salva stripeCustomerId, stripeSubscriptionId, atualiza plan |
| `customer.subscription.updated` | Cobre renovações, mudanças de status (past_due → active), cancelamento agendado, reativação                    |
| `customer.subscription.deleted` | Cancelamento definitivo — derruba para FREE                                                                    |
| `invoice.payment_failed`        | Marca subscriptionStatus como PAST_DUE sem derrubar plan (Stripe ainda tentará cobrar novamente)               |

`invoice.paid` **não** é necessário separadamente — `customer.subscription.updated` com status `active` cobre o mesmo caso.

### 8. Riscos técnicos

1. **Raw body no Next.js App Router:** `stripe.webhooks.constructEvent` exige o body raw (não parseado). Em App Router, usar `request.text()` — funciona sem configuração extra, pois o App Router não aplica body parser automático. **Não usar** o padrão da Pages Router (`export const config = { api: { bodyParser: false } }`).

2. **`redirect()` externo no Server Action:** `redirect('https://checkout.stripe.com/...')` funciona em Server Actions no Next.js 15+. O framework converte em 307 e o browser segue. Testado e documentado pelo Next.js.

3. **Race condition `checkout.session.completed` + `customer.subscription.updated`:** A Stripe às vezes dispara `customer.subscription.updated` antes ou junto com `checkout.session.completed`. O handler de `checkout.session.completed` deve buscar a subscription atualizada via `stripe.subscriptions.retrieve()` para garantir status correto.

4. **`stripeCustomerId` nulo no webhook:** Se o webhook chegar com um `customer` que não existe em nenhum `ProviderProfile`, o `update` com `where: { stripeCustomerId }` vai silenciosamente não encontrar nada (Prisma não joga erro). Adicionar log e responder 200 para não criar redeliveries.

5. **Sessão JWT não reflete mudança de `plan`:** A sessão JWT não é invalidada após upgrade — mas o dashboard já lê `ProviderProfile.plan` direto do banco (não da sessão). Nenhuma alteração necessária; o próximo carregamento de página mostrará o plano correto.

6. **`STRIPE_PRO_PRICE_ID` em modo test vs. produção:** Price IDs são diferentes entre `sk_test_*` e `sk_live_*`. Documentar que o .env de produção precisa do Price ID de produção.

7. **Webhook em desenvolvimento local:** Requer Stripe CLI (`stripe listen --forward-to localhost:3000/api/stripe/webhook`). Sem isso, os webhooks não chegam ao ambiente local e o upgrade não funciona.

### 9. Arquivos criados e alterados

**Criados:**

- `lib/stripe.ts`
- `lib/actions/billing.ts`
- `app/api/stripe/webhook/route.ts`
- `app/(dashboard)/dashboard/billing/page.tsx`
- `components/billing/BillingCard.tsx`

**Alterados:**

- `prisma/schema.prisma`
- `components/billing/PlanUsageCard.tsx`
- `components/layout/Sidebar.tsx`
- `.env.example`
- `docs/AI_HANDOFF.md`
- `docs/ARCHITECTURE.md`
- `docs/ROADMAP.md`

---

## Mapeamento de arquivos

```text
lib/
  stripe.ts                         # Singleton do Stripe SDK
  actions/
    billing.ts                      # createCheckoutSession (Server Action)

app/
  api/
    stripe/
      webhook/
        route.ts                    # POST handler — valida assinatura e processa eventos
  (dashboard)/
    dashboard/
      billing/
        page.tsx                    # Página de billing (Server Component)

components/
  billing/
    BillingCard.tsx                 # Card com plano atual, status, botão "Assinar PRO"
    PlanUsageCard.tsx               # Alterar: adicionar CTA de upgrade para FREE users

prisma/
  schema.prisma                     # Alterar: SubscriptionStatus enum + 5 campos em ProviderProfile
```

---

## Lógica de mapeamento plan ↔ status

```
Stripe status → plan
active       → PRO
trialing     → PRO
canceled     → FREE (downgrade)
unpaid       → FREE (downgrade)
incomplete_expired → FREE (downgrade)
paused       → FREE (downgrade)
past_due     → manter plan atual (Stripe ainda tenta cobrar)
incomplete   → manter plan atual (pagamento inicial pendente)
```

---

## Ordem de implementação

1. Schema + migration
2. `lib/stripe.ts`
3. `lib/actions/billing.ts` (createCheckoutSession)
4. `app/api/stripe/webhook/route.ts`
5. `components/billing/BillingCard.tsx`
6. `app/(dashboard)/dashboard/billing/page.tsx`
7. `components/layout/Sidebar.tsx` (link billing)
8. `components/billing/PlanUsageCard.tsx` (CTA upgrade)
9. `.env.example` + docs

---

## Task 1: Schema Prisma + migration

**Files:**

- Modify: `prisma/schema.prisma`

- [ ] **Step 1.1: Adicionar enum SubscriptionStatus e campos ao ProviderProfile**

Abrir `prisma/schema.prisma` e aplicar estas alterações:

Após `enum PlanTier { ... }`, adicionar:

```prisma
enum SubscriptionStatus {
  ACTIVE
  TRIALING
  PAST_DUE
  CANCELED
  INCOMPLETE
  INCOMPLETE_EXPIRED
  UNPAID
  PAUSED
}
```

No model `ProviderProfile`, após `plan PlanTier @default(FREE)`, adicionar:

```prisma
  stripeCustomerId     String?            @unique
  stripeSubscriptionId String?            @unique
  stripePriceId        String?
  subscriptionStatus   SubscriptionStatus?
  currentPeriodEnd     DateTime?
```

- [ ] **Step 1.2: Validar schema**

```bash
npx prisma validate
```

Esperado: sem erros.

- [ ] **Step 1.3: Criar migration**

```bash
npm run prisma:migrate -- --name add_stripe_billing
```

Esperado: migration criada em `prisma/migrations/`, Prisma Client regenerado automaticamente.

- [ ] **Step 1.4: Verificar que o build não quebrou**

```bash
npm run build
```

Esperado: build sem erros de tipo.

- [ ] **Step 1.5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat(billing): add Stripe fields and SubscriptionStatus enum to ProviderProfile"
```

---

## Task 2: Instalar Stripe SDK e criar singleton

**Files:**

- Create: `lib/stripe.ts`

- [ ] **Step 2.1: Instalar stripe**

```bash
npm install stripe
```

Esperado: `stripe` aparece em `dependencies` no `package.json`.

- [ ] **Step 2.2: Criar `lib/stripe.ts`**

```typescript
import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-01-27.acacia",
  typescript: true,
});
```

- [ ] **Step 2.3: Verificar tipos**

```bash
npm run build
```

Esperado: sem erros de tipo relacionados ao Stripe.

- [ ] **Step 2.4: Commit**

```bash
git add lib/stripe.ts package.json package-lock.json
git commit -m "feat(billing): install Stripe SDK and create singleton"
```

---

## Task 3: Server Action createCheckoutSession

**Files:**

- Create: `lib/actions/billing.ts`

- [ ] **Step 3.1: Criar `lib/actions/billing.ts`**

```typescript
"use server";

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";

export async function createCheckoutSession(): Promise<{ error: string }> {
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

  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  const checkoutSession = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    line_items: [
      {
        price: process.env.STRIPE_PRO_PRICE_ID!,
        quantity: 1,
      },
    ],
    success_url: `${appUrl}/dashboard/billing?success=1`,
    cancel_url: `${appUrl}/dashboard/billing?canceled=1`,
  });

  if (!checkoutSession.url) {
    return { error: "Erro ao criar sessão de checkout. Tente novamente." };
  }

  redirect(checkoutSession.url);
}
```

- [ ] **Step 3.2: Verificar tipos**

```bash
npm run build
```

Esperado: sem erros de tipo.

- [ ] **Step 3.3: Commit**

```bash
git add lib/actions/billing.ts
git commit -m "feat(billing): add createCheckoutSession Server Action"
```

---

## Task 4: Webhook Route Handler

**Files:**

- Create: `app/api/stripe/webhook/route.ts`

- [ ] **Step 4.1: Criar `app/api/stripe/webhook/route.ts`**

```typescript
import type { Stripe } from "stripe";
import type { PlanTier, SubscriptionStatus } from "@prisma/client";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return new Response("Missing stripe-signature header", { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!,
    );
  } catch (err) {
    console.error(
      "Webhook signature verification failed:",
      (err as Error).message,
    );
    return new Response(`Webhook Error: ${(err as Error).message}`, {
      status: 400,
    });
  }

  try {
    await handleStripeEvent(event);
  } catch (err) {
    console.error("Error handling Stripe event:", event.type, err);
    return new Response("Internal error processing webhook", { status: 500 });
  }

  return new Response(null, { status: 200 });
}

async function handleStripeEvent(event: Stripe.Event) {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.mode !== "subscription") break;

      const customerId = session.customer as string;
      const subscriptionId = session.subscription as string;

      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      const plan = resolvePlan(subscription.status);
      const status = mapStripeStatus(subscription.status);

      await prisma.providerProfile.update({
        where: { stripeCustomerId: customerId },
        data: {
          stripeSubscriptionId: subscriptionId,
          stripePriceId: subscription.items.data[0]?.price.id ?? null,
          subscriptionStatus: status,
          currentPeriodEnd: new Date(subscription.current_period_end * 1000),
          ...(plan !== null ? { plan } : {}),
        },
      });
      break;
    }

    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = subscription.customer as string;
      const plan = resolvePlan(subscription.status);
      const status = mapStripeStatus(subscription.status);

      await prisma.providerProfile.update({
        where: { stripeCustomerId: customerId },
        data: {
          stripeSubscriptionId: subscription.id,
          stripePriceId: subscription.items.data[0]?.price.id ?? null,
          subscriptionStatus: status,
          currentPeriodEnd: new Date(subscription.current_period_end * 1000),
          ...(plan !== null ? { plan } : {}),
        },
      });
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = subscription.customer as string;

      await prisma.providerProfile.update({
        where: { stripeCustomerId: customerId },
        data: {
          stripeSubscriptionId: null,
          stripePriceId: null,
          subscriptionStatus: "CANCELED",
          currentPeriodEnd: null,
          plan: "FREE",
        },
      });
      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      const customerId = invoice.customer as string;

      await prisma.providerProfile.updateMany({
        where: { stripeCustomerId: customerId },
        data: { subscriptionStatus: "PAST_DUE" },
      });
      break;
    }

    default:
      break;
  }
}

function resolvePlan(stripeStatus: string): PlanTier | null {
  if (stripeStatus === "active" || stripeStatus === "trialing") return "PRO";
  if (
    stripeStatus === "canceled" ||
    stripeStatus === "unpaid" ||
    stripeStatus === "incomplete_expired" ||
    stripeStatus === "paused"
  )
    return "FREE";
  return null;
}

function mapStripeStatus(stripeStatus: string): SubscriptionStatus {
  const map: Record<string, SubscriptionStatus> = {
    active: "ACTIVE",
    trialing: "TRIALING",
    past_due: "PAST_DUE",
    canceled: "CANCELED",
    incomplete: "INCOMPLETE",
    incomplete_expired: "INCOMPLETE_EXPIRED",
    unpaid: "UNPAID",
    paused: "PAUSED",
  };
  return map[stripeStatus] ?? "INCOMPLETE";
}
```

- [ ] **Step 4.2: Verificar tipos**

```bash
npm run build
```

Esperado: sem erros de tipo.

- [ ] **Step 4.3: Testar webhook localmente com Stripe CLI**

Instalar Stripe CLI se necessário:

```bash
# macOS
brew install stripe/stripe-cli/stripe

# Linux (Debian/Ubuntu)
curl -s https://packages.stripe.dev/api/security/keypair/stripe-cli-gpg/public | sudo gpg --dearmor -o /usr/share/keyrings/stripe.gpg
echo "deb [signed-by=/usr/share/keyrings/stripe.gpg] https://packages.stripe.dev/stripe-cli-debian-local stable main" | sudo tee /etc/apt/sources.list.d/stripe.list
sudo apt update && sudo apt install stripe
```

Autenticar:

```bash
stripe login
```

Em um terminal separado, iniciar o listener:

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

O CLI exibirá o `STRIPE_WEBHOOK_SECRET` para uso local (começando com `whsec_`). Copiar para `.env`.

Disparar evento de teste:

```bash
stripe trigger checkout.session.completed
```

Esperado: webhook recebe o evento, log mostra processamento, `ProviderProfile` atualizado no banco.

- [ ] **Step 4.4: Commit**

```bash
git add app/api/stripe/webhook/route.ts
git commit -m "feat(billing): add Stripe webhook handler with subscription event processing"
```

---

## Task 5: Componente BillingCard

**Files:**

- Create: `components/billing/BillingCard.tsx`

- [ ] **Step 5.1: Criar `components/billing/BillingCard.tsx`**

```tsx
"use client";

import { useTransition } from "react";
import type { PlanTier, SubscriptionStatus } from "@prisma/client";
import { createCheckoutSession } from "@/lib/actions/billing";
import { PLAN_NAMES } from "@/lib/plan-limits";

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
  const [error, setError] = useTransitionError();

  function handleSubscribe() {
    setError(null);
    startTransition(async () => {
      const result = await createCheckoutSession();
      if (result?.error) {
        setError(result.error);
      }
    });
  }

  return (
    <section className="rounded-xl border border-paper-soft bg-white p-6 shadow-card">
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
              <span className="text-leaf">✓</span> Propostas ilimitadas por mês
            </li>
            <li className="flex items-center gap-2">
              <span className="text-leaf">✓</span> Templates ilimitados
            </li>
          </ul>
        </div>
      ) : null}
    </section>
  );
}

// Inline helper — evita importar useState separadamente só para erro
function useTransitionError(): [string | null, (v: string | null) => void] {
  const [error, setError] = require("react").useState<string | null>(null);
  return [error, setError];
}
```

**Nota:** A linha `require("react").useState` no helper `useTransitionError` é um workaround para encapsular o estado sem criar um arquivo separado. Se preferir, substitua por um `useState` normal no topo do componente (remova o helper e declare `const [error, setError] = useState<string | null>(null)` no corpo do componente).

**Versão limpa (recomendada):**

```tsx
"use client";

import { useState, useTransition } from "react";
import type { PlanTier, SubscriptionStatus } from "@prisma/client";
import { createCheckoutSession } from "@/lib/actions/billing";
import { PLAN_NAMES } from "@/lib/plan-limits";

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

  function handleSubscribe() {
    setError(null);
    startTransition(async () => {
      const result = await createCheckoutSession();
      if (result?.error) {
        setError(result.error);
      }
    });
  }

  return (
    <section className="rounded-xl border border-paper-soft bg-white p-6 shadow-card">
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
              <span className="text-leaf">✓</span> Propostas ilimitadas por mês
            </li>
            <li className="flex items-center gap-2">
              <span className="text-leaf">✓</span> Templates ilimitados
            </li>
          </ul>
        </div>
      ) : null}
    </section>
  );
}
```

- [ ] **Step 5.2: Verificar tipos**

```bash
npm run build
```

Esperado: sem erros de tipo.

- [ ] **Step 5.3: Commit**

```bash
git add components/billing/BillingCard.tsx
git commit -m "feat(billing): add BillingCard component with subscribe button"
```

---

## Task 6: Página de Billing

**Files:**

- Create: `app/(dashboard)/dashboard/billing/page.tsx`

- [ ] **Step 6.1: Criar `app/(dashboard)/dashboard/billing/page.tsx`**

```tsx
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { BillingCard } from "@/components/billing/BillingCard";
import { PlanUsageCard } from "@/components/billing/PlanUsageCard";
import { getCurrentMonthRange, getPlanLimits } from "@/lib/plan-limits";

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; canceled?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const params = await searchParams;
  const success = params.success === "1";
  const canceled = params.canceled === "1";

  const monthRange = getCurrentMonthRange();

  const profile = await prisma.providerProfile.findUnique({
    where: { userId: session.user.id },
    include: {
      services: { select: { id: true, isActive: true } },
      quoteRequests: { select: { id: true, createdAt: true } },
      proposals: { select: { id: true, createdAt: true } },
      proposalTemplates: { select: { id: true } },
    },
  });

  if (!profile) {
    redirect("/dashboard/perfil");
  }

  const limits = getPlanLimits(profile.plan);
  const monthlyQuoteRequests = profile.quoteRequests.filter(
    (r) => r.createdAt >= monthRange.start && r.createdAt < monthRange.end,
  ).length;
  const monthlyProposals = profile.proposals.filter(
    (p) => p.createdAt >= monthRange.start && p.createdAt < monthRange.end,
  ).length;

  return (
    <div className="p-8">
      <p className="text-xs font-semibold uppercase tracking-widest text-leaf">
        Billing
      </p>
      <h1 className="mt-2 font-fraunces text-4xl font-bold text-ink">
        Plano e assinatura
      </h1>
      <p className="mt-2 text-sm text-ink-muted">
        Gerencie seu plano e visualize o uso atual.
      </p>

      {success ? (
        <div className="mt-6 rounded-lg border border-green-200 bg-green-50 px-4 py-3">
          <p className="text-sm font-semibold text-green-800">
            Assinatura realizada com sucesso! Seu plano será atualizado em
            instantes.
          </p>
        </div>
      ) : null}

      {canceled ? (
        <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-sm font-semibold text-amber-800">
            Assinatura cancelada. Você continua no plano atual.
          </p>
        </div>
      ) : null}

      <div className="mt-8">
        <BillingCard
          plan={profile.plan}
          subscriptionStatus={profile.subscriptionStatus}
          currentPeriodEnd={profile.currentPeriodEnd}
        />
      </div>

      <PlanUsageCard
        plan={profile.plan}
        usage={[
          {
            current: profile.services.filter((s) => s.isActive).length,
            limit: limits.activeServices,
            resource: "activeServices",
          },
          {
            current: monthlyQuoteRequests,
            limit: limits.monthlyQuoteRequests,
            resource: "monthlyQuoteRequests",
          },
          {
            current: monthlyProposals,
            limit: limits.monthlyProposals,
            resource: "monthlyProposals",
          },
          {
            current: profile.proposalTemplates.length,
            limit: limits.proposalTemplates,
            resource: "proposalTemplates",
          },
        ]}
      />
    </div>
  );
}
```

- [ ] **Step 6.2: Verificar tipos**

```bash
npm run build
```

Esperado: sem erros de tipo.

- [ ] **Step 6.3: Commit**

```bash
git add app/(dashboard)/dashboard/billing/page.tsx
git commit -m "feat(billing): add billing page with plan info and usage"
```

---

## Task 7: Adicionar link Billing na Sidebar

**Files:**

- Modify: `components/layout/Sidebar.tsx`

- [ ] **Step 7.1: Adicionar item "Billing" ao array `navItems`**

No arquivo `components/layout/Sidebar.tsx`, localizar o array `navItems` e adicionar **antes** do item "Perfil":

```tsx
{
  href: "/dashboard/billing",
  label: "Billing",
  icon: (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
    </svg>
  )
},
```

- [ ] **Step 7.2: Verificar tipos e UI**

```bash
npm run build
npm run dev
```

Acessar `http://localhost:3000/dashboard` e confirmar que o link "Billing" aparece na sidebar e navega para `/dashboard/billing`.

- [ ] **Step 7.3: Commit**

```bash
git add components/layout/Sidebar.tsx
git commit -m "feat(billing): add Billing link to sidebar"
```

---

## Task 8: Atualizar PlanUsageCard com CTA de upgrade

**Files:**

- Modify: `components/billing/PlanUsageCard.tsx`

- [ ] **Step 8.1: Remover placeholder antigo e adicionar CTA para FREE**

No `PlanUsageCard.tsx`, substituir o bloco:

```tsx
{
  plan === "FREE" ? (
    <p className="rounded-full bg-paper px-3 py-1 text-xs font-semibold text-ink-muted">
      Preparado para upgrade futuro
    </p>
  ) : null;
}
```

Por:

```tsx
{
  plan === "FREE" ? (
    <a
      href="/dashboard/billing"
      className="rounded-full bg-leaf px-3 py-1 text-xs font-semibold text-white transition hover:bg-leaf-hover"
    >
      Assinar PRO
    </a>
  ) : (
    <span className="rounded-full bg-mint px-3 py-1 text-xs font-semibold text-leaf">
      Plano PRO ativo
    </span>
  );
}
```

- [ ] **Step 8.2: Verificar tipos**

```bash
npm run build
```

- [ ] **Step 8.3: Commit**

```bash
git add components/billing/PlanUsageCard.tsx
git commit -m "feat(billing): update PlanUsageCard with PRO upgrade CTA"
```

---

## Task 9: Atualizar .env.example e documentação

**Files:**

- Modify: `.env.example`
- Modify: `docs/AI_HANDOFF.md`
- Modify: `docs/ARCHITECTURE.md`
- Modify: `docs/ROADMAP.md`

- [ ] **Step 9.1: Atualizar `.env.example`**

Substituir o conteúdo atual por:

```env
# Banco de dados
DATABASE_URL="postgresql://vitriny:vitriny@localhost:5432/vitriny"

# Auth.js
AUTH_SECRET="gere-um-segredo-com-openssl-rand-base64-33"
AUTH_URL="http://localhost:3000"
AUTH_GOOGLE_ID="seu-google-client-id"
AUTH_GOOGLE_SECRET="seu-google-client-secret"

# Resend (e-mail de redefinição de senha)
RESEND_API_KEY="re_sua_api_key"

# Stripe
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
STRIPE_PRO_PRICE_ID="price_..."

# App
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

- [ ] **Step 9.2: Atualizar `docs/ROADMAP.md`**

Na seção `## Concluído`, adicionar:

```markdown
- Assinatura mensal PRO via Stripe Checkout (sem checkout próprio, sem coleta de cartão)
```

Na seção `## Melhorias de curto prazo`, remover ou marcar como concluído qualquer menção a billing/planos.

- [ ] **Step 9.3: Atualizar `docs/AI_HANDOFF.md`**

Na seção `## Stack`, adicionar:

```markdown
- Stripe (assinatura mensal PRO — Checkout mode subscription, webhook assinado)
```

Na seção `## Estado atual > Funciona hoje`, adicionar:

```markdown
- assinatura mensal PRO via Stripe Checkout;
- webhook Stripe validado e processado em `/api/stripe/webhook`;
- upgrade/downgrade de plano via webhook (nunca via redirect ou front).
```

Adicionar seção `## Billing / Stripe` ao final:

```markdown
## Billing / Stripe

- `lib/stripe.ts` — singleton do Stripe SDK.
- `lib/actions/billing.ts` — `createCheckoutSession`: cria/reutiliza customer, cria Checkout Session, redireciona para Stripe.
- `app/api/stripe/webhook/route.ts` — valida assinatura, processa `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`.
- `app/(dashboard)/dashboard/billing/page.tsx` — página de billing.
- `components/billing/BillingCard.tsx` — card com plano, status, botão "Assinar PRO".

Regras críticas:

- `plan` só vai para PRO via webhook (nunca via redirect de success_url).
- `stripeCustomerId` é criado uma única vez e reutilizado.
- Webhook valida assinatura com `STRIPE_WEBHOOK_SECRET` sempre.
- Para testar localmente: `stripe listen --forward-to localhost:3000/api/stripe/webhook`.
- Em produção: configurar endpoint no Dashboard Stripe → Developers → Webhooks.

Eventos tratados:

- `checkout.session.completed` → salva stripeSubscriptionId, atualiza plan se status for active/trialing.
- `customer.subscription.updated` → atualiza status e plan conforme lógica de mapeamento.
- `customer.subscription.deleted` → zera subscription, derruba para FREE.
- `invoice.payment_failed` → marca subscriptionStatus como PAST_DUE (plano mantido temporariamente).

Lógica de plan por status Stripe:

- active, trialing → PRO
- canceled, unpaid, incomplete_expired, paused → FREE
- past_due, incomplete → sem alteração de plan
```

- [ ] **Step 9.4: Verificar build final**

```bash
npm run lint
npm run build
npx prisma validate
```

Esperado: sem erros.

- [ ] **Step 9.5: Commit**

```bash
git add .env.example docs/AI_HANDOFF.md docs/ARCHITECTURE.md docs/ROADMAP.md
git commit -m "docs: update docs and env.example for Stripe billing integration"
```

---

## Checklist de teste manual do fluxo completo

Antes de considerar a implementação concluída, validar o fluxo completo:

- [ ] Rodar `stripe listen --forward-to localhost:3000/api/stripe/webhook` em terminal separado.
- [ ] Acessar `/dashboard/billing` — verificar que mostra plano FREE e botão "Assinar PRO".
- [ ] Clicar em "Assinar PRO" — verificar que redireciona para Stripe Checkout.
- [ ] Completar pagamento com cartão de teste `4242 4242 4242 4242`, qualquer data futura, qualquer CVC.
- [ ] Verificar redirect para `/dashboard/billing?success=1` com mensagem de sucesso.
- [ ] Aguardar webhook `checkout.session.completed` (Stripe CLI mostra no terminal).
- [ ] Recarregar página — verificar que plano mudou para PRO.
- [ ] Verificar `ProviderProfile` no Prisma Studio: campos `stripeCustomerId`, `stripeSubscriptionId`, `subscriptionStatus: ACTIVE`, `currentPeriodEnd` preenchidos, `plan: PRO`.
- [ ] Verificar que limites do FREE não são mais aplicados (criar mais de 3 serviços ativos, por exemplo).
- [ ] No Stripe Dashboard, cancelar a assinatura manualmente.
- [ ] Verificar que webhook `customer.subscription.deleted` chega e plano volta para FREE.

---

## Notas de produção

- Configurar endpoint no Stripe Dashboard: `https://seu-dominio.com/api/stripe/webhook`
- Eventos a selecionar no Dashboard: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`
- `STRIPE_SECRET_KEY` de produção começa com `sk_live_`
- `STRIPE_PRO_PRICE_ID` de produção é diferente do test — criar o Price no Dashboard em modo live
- `NEXT_PUBLIC_APP_URL` deve apontar para o domínio real em produção
