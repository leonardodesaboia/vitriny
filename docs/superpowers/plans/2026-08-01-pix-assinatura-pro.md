# Pix para a assinatura PRO (Modalidade sem Stripe) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir que o assinante pague o plano PRO via Pix estático (chave Pix da própria Vitriny), com confirmação manual por um admin único, sem depender do Stripe (Pix no Stripe é invite-only e a conta não é elegível ainda).

**Architecture:** Nova tabela `ProPixPayment` registra cada "compra de 1 mês" (requestedAt/clientPaidAt/confirmedAt). `lib/pix.ts` (já existe) gera o QR/copia-e-cola com a chave Pix da Vitriny. Três server actions cobrem o ciclo: assinante pede o Pix, assinante avisa que pagou, admin confirma e estende `ProviderProfile.currentPeriodEnd` em 30 dias. Uma checagem de auto-rebaixamento (sem cron) trata o vencimento: se `plan === PRO`, sem `stripeSubscriptionId` (ou seja, não é assinatura Stripe) e `currentPeriodEnd` no passado, volta pra FREE na próxima leitura do perfil.

**Tech Stack:** Next.js App Router (Server Actions), Prisma/PostgreSQL, `qrcode` + `pixbrasil` (já em uso via `lib/pix.ts`), Resend (e-mail), Vitest.

## Global Constraints

- Não alterar o fluxo de Pix já existente pros clientes do provedor (`lib/pix.ts` é reaproveitado, não modificado).
- Não criar sistema de roles — admin é um único e-mail via env var (`ADMIN_EMAIL`).
- Não criar cron/job agendado — auto-rebaixamento é lazy, na leitura do perfil.
- Sem expiração automática do QR Pix — o pedido fica pendente até ser confirmado.
- Seguir os padrões já estabelecidos: server actions em `lib/actions/*.ts` com `"use server"`, testes mockando `@/auth` e `@/lib/prisma` como em `tests/actions/billing.test.ts`, e-mails via `lib/email.ts` no padrão `sendAppEmail`.

---

### Task 1: Schema — model `ProPixPayment`

**Files:**
- Modify: `prisma/schema.prisma:141` (após `storefrontViews StorefrontView[]`, antes do `}` do model `ProviderProfile`)
- Create: migração gerada por `prisma migrate dev` em `prisma/migrations/`

**Interfaces:**
- Produces: model Prisma `ProPixPayment { id, providerProfileId, amount, requestedAt, clientPaidAt, confirmedAt, updatedAt }`, acessível via `prisma.proPixPayment`.

- [ ] **Step 1: Adicionar a relação no `ProviderProfile`**

Em `prisma/schema.prisma`, na linha 141 (logo depois de `storefrontViews StorefrontView[]`):

```prisma
  storefrontViews   StorefrontView[]
  proPixPayments    ProPixPayment[]
}
```

- [ ] **Step 2: Adicionar o novo model**

Logo depois do fechamento do model `ProviderProfile` (depois da linha 142, antes de `model Service {`):

```prisma
model ProPixPayment {
  id                String    @id @default(cuid())
  providerProfileId String
  amount            Decimal   @db.Decimal(10, 2)
  requestedAt       DateTime  @default(now())
  clientPaidAt      DateTime?
  confirmedAt       DateTime?
  updatedAt         DateTime  @updatedAt

  providerProfile ProviderProfile @relation(fields: [providerProfileId], references: [id], onDelete: Cascade)

  @@index([providerProfileId])
}
```

- [ ] **Step 3: Gerar e aplicar a migração**

Run: `npm run prisma:migrate -- --name add_pro_pix_payment`
Expected: cria `prisma/migrations/<timestamp>_add_pro_pix_payment/migration.sql`, aplica no Postgres local (containers `vitriny-postgres`/`vitriny-minio` já devem estar de pé — `docker ps` deve listar `vitriny-postgres` como `Up`) e roda `prisma generate` automaticamente.

- [ ] **Step 4: Confirmar que o client do Prisma reconhece o novo model**

Run: `npx tsc --noEmit 2>&1 | grep -i "proPixPayment"`
Expected: nenhuma linha (sem erro relacionado ao novo model — confirma que `prisma generate` rodou e o tipo existe).

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat: adiciona model ProPixPayment"
```

---

### Task 2: `lib/plan-limits.ts` — `isOneTimeProExpired`

**Files:**
- Modify: `lib/plan-limits.ts` (adicionar ao final do arquivo)
- Test: `tests/unit/plan-limits.test.ts`

**Interfaces:**
- Produces: `isOneTimeProExpired(profile: { plan: PlanTier; stripeSubscriptionId: string | null; currentPeriodEnd: Date | null }): boolean`

- [ ] **Step 1: Escrever os testes que devem falhar**

Adicionar em `tests/unit/plan-limits.test.ts` (novo `describe` no final do arquivo, antes do fechamento):

```ts
describe("isOneTimeProExpired", () => {
  it("retorna false quando o plano é FREE", () => {
    expect(
      isOneTimeProExpired({
        plan: "FREE",
        stripeSubscriptionId: null,
        currentPeriodEnd: new Date("2020-01-01")
      })
    ).toBe(false);
  });

  it("retorna false quando é PRO com assinatura Stripe ativa, mesmo com currentPeriodEnd no passado", () => {
    expect(
      isOneTimeProExpired({
        plan: "PRO",
        stripeSubscriptionId: "sub_123",
        currentPeriodEnd: new Date("2020-01-01")
      })
    ).toBe(false);
  });

  it("retorna false quando é PRO via Pix manual mas ainda dentro do período", () => {
    const future = new Date(Date.now() + 1000 * 60 * 60 * 24);
    expect(
      isOneTimeProExpired({
        plan: "PRO",
        stripeSubscriptionId: null,
        currentPeriodEnd: future
      })
    ).toBe(false);
  });

  it("retorna true quando é PRO via Pix manual e currentPeriodEnd já passou", () => {
    expect(
      isOneTimeProExpired({
        plan: "PRO",
        stripeSubscriptionId: null,
        currentPeriodEnd: new Date("2020-01-01")
      })
    ).toBe(true);
  });

  it("retorna false quando currentPeriodEnd é null (nunca teve período definido)", () => {
    expect(
      isOneTimeProExpired({
        plan: "PRO",
        stripeSubscriptionId: null,
        currentPeriodEnd: null
      })
    ).toBe(false);
  });
});
```

E adicionar `isOneTimeProExpired` ao bloco de import no topo do arquivo (junto dos outros imports de `@/lib/plan-limits`).

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `npx vitest run tests/unit/plan-limits.test.ts`
Expected: FAIL — `isOneTimeProExpired is not a function` ou erro de import.

- [ ] **Step 3: Implementar**

Adicionar ao final de `lib/plan-limits.ts`:

```ts
type OneTimeProProfile = {
  plan: PlanTier;
  stripeSubscriptionId: string | null;
  currentPeriodEnd: Date | null;
};

// PRO pago via Pix manual (sem assinatura Stripe) não tem cobrança
// recorrente — vence sozinho. Assinatura Stripe real nunca cai aqui: o
// próprio webhook mantém currentPeriodEnd atualizado a cada ciclo.
export function isOneTimeProExpired(profile: OneTimeProProfile): boolean {
  return (
    profile.plan === "PRO" &&
    profile.stripeSubscriptionId === null &&
    profile.currentPeriodEnd !== null &&
    profile.currentPeriodEnd < new Date()
  );
}
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `npx vitest run tests/unit/plan-limits.test.ts`
Expected: PASS, todos os testes do arquivo (novos e existentes).

- [ ] **Step 5: Commit**

```bash
git add lib/plan-limits.ts tests/unit/plan-limits.test.ts
git commit -m "feat: adiciona isOneTimeProExpired"
```

---

### Task 3: `lib/actions/auth-guard.ts` — auto-rebaixamento central

**Files:**
- Modify: `lib/actions/auth-guard.ts`
- Modify: `tests/helpers.ts` (estender `makeProfile`)
- Test: `tests/actions/auth-guard.test.ts`

**Interfaces:**
- Consumes: `isOneTimeProExpired` de `@/lib/plan-limits` (Task 2).
- Produces: `resolveEffectivePlan(profile: { id: string; plan: PlanTier; stripeSubscriptionId: string | null; currentPeriodEnd: Date | null }): Promise<{ plan: PlanTier; currentPeriodEnd: Date | null }>`. `requireProviderProfile()` passa a devolver `profile.plan`/`profile.currentPeriodEnd` já corrigidos.

- [ ] **Step 1: Estender `makeProfile` em `tests/helpers.ts`**

Em `tests/helpers.ts`, trocar a função `makeProfile`:

```ts
export function makeProfile(overrides = {}) {
  return {
    id: "profile-1",
    plan: "FREE" as const,
    businessType: "SERVICES" as const,
    stripeSubscriptionId: null as string | null,
    currentPeriodEnd: null as Date | null,
    ...overrides
  };
}
```

E adicionar `proPixPayment` ao `makePrismaMock` (dentro do objeto `mock`, ao lado de `providerProfile`):

```ts
    proPixPayment: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn()
    },
```

- [ ] **Step 2: Escrever os testes que devem falhar**

Adicionar em `tests/actions/auth-guard.test.ts`, novo `describe` no final do arquivo:

```ts
describe("resolveEffectivePlan", () => {
  it("mantém PRO quando ainda não venceu", async () => {
    const { db } = await setup();
    const future = new Date(Date.now() + 1000 * 60 * 60 * 24);

    const { resolveEffectivePlan } = await import("@/lib/actions/auth-guard");
    const result = await resolveEffectivePlan({
      id: "profile-1",
      plan: "PRO",
      stripeSubscriptionId: null,
      currentPeriodEnd: future
    });

    expect(result).toEqual({ plan: "PRO", currentPeriodEnd: future });
    expect(db.providerProfile.update).not.toHaveBeenCalled();
  });

  it("mantém PRO quando há assinatura Stripe, mesmo com currentPeriodEnd vencido", async () => {
    const { db } = await setup();
    const past = new Date("2020-01-01");

    const { resolveEffectivePlan } = await import("@/lib/actions/auth-guard");
    const result = await resolveEffectivePlan({
      id: "profile-1",
      plan: "PRO",
      stripeSubscriptionId: "sub_123",
      currentPeriodEnd: past
    });

    expect(result).toEqual({ plan: "PRO", currentPeriodEnd: past });
    expect(db.providerProfile.update).not.toHaveBeenCalled();
  });

  it("rebaixa pra FREE e persiste quando o Pix manual venceu", async () => {
    const { db } = await setup();
    db.providerProfile.update.mockResolvedValue({});
    const past = new Date("2020-01-01");

    const { resolveEffectivePlan } = await import("@/lib/actions/auth-guard");
    const result = await resolveEffectivePlan({
      id: "profile-1",
      plan: "PRO",
      stripeSubscriptionId: null,
      currentPeriodEnd: past
    });

    expect(result).toEqual({ plan: "FREE", currentPeriodEnd: null });
    expect(db.providerProfile.update).toHaveBeenCalledWith({
      where: { id: "profile-1" },
      data: { plan: "FREE", currentPeriodEnd: null }
    });
  });
});

describe("requireProviderProfile com auto-rebaixamento", () => {
  it("devolve plan FREE já corrigido quando o Pix manual venceu", async () => {
    const { auth, db } = await setup();
    auth.mockResolvedValue(makeSession("user-1") as never);
    db.providerProfile.findUnique.mockResolvedValue(
      makeProfile({
        plan: "PRO",
        stripeSubscriptionId: null,
        currentPeriodEnd: new Date("2020-01-01")
      })
    );
    db.providerProfile.update.mockResolvedValue({});

    const { requireProviderProfile } = await import("@/lib/actions/auth-guard");
    const result = await requireProviderProfile();

    expect(result.profile?.plan).toBe("FREE");
    expect(db.providerProfile.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { plan: "FREE", currentPeriodEnd: null } })
    );
  });
});
```

- [ ] **Step 3: Rodar e confirmar que falha**

Run: `npx vitest run tests/actions/auth-guard.test.ts`
Expected: FAIL — `resolveEffectivePlan is not a function`.

- [ ] **Step 4: Implementar**

Em `lib/actions/auth-guard.ts`, adicionar o import e a nova função, e alterar `requireProviderProfile`:

```ts
"use server";

import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isOneTimeProExpired } from "@/lib/plan-limits";
import type { PlanTier } from "@prisma/client";

export async function requireAuth(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  // Sessão JWT não é invalidável; contas excluídas (soft delete) precisam
  // ser barradas aqui mesmo com token ainda válido em outro dispositivo.
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { deletedAt: true }
  });

  if (!user || user.deletedAt) redirect("/login");

  return session.user.id;
}

type EffectivePlanInput = {
  id: string;
  plan: PlanTier;
  stripeSubscriptionId: string | null;
  currentPeriodEnd: Date | null;
};

// PRO comprado via Pix manual (sem assinatura Stripe) não tem cobrança
// recorrente — vence sozinho. Corrige na leitura em vez de cron: primeiro
// acesso ao dashboard depois do vencimento já rebaixa e persiste.
export async function resolveEffectivePlan(
  profile: EffectivePlanInput
): Promise<{ plan: PlanTier; currentPeriodEnd: Date | null }> {
  if (!isOneTimeProExpired(profile)) {
    return { plan: profile.plan, currentPeriodEnd: profile.currentPeriodEnd };
  }

  await prisma.providerProfile.update({
    where: { id: profile.id },
    data: { plan: "FREE", currentPeriodEnd: null }
  });

  return { plan: "FREE", currentPeriodEnd: null };
}

export async function requireProviderProfile() {
  const userId = await requireAuth();
  const profile = await prisma.providerProfile.findUnique({
    where: { userId },
    select: {
      id: true,
      plan: true,
      businessType: true,
      stripeSubscriptionId: true,
      currentPeriodEnd: true
    }
  });

  if (!profile) return { userId, profile: null };

  const effective = await resolveEffectivePlan(profile);

  return {
    userId,
    profile: { ...profile, plan: effective.plan, currentPeriodEnd: effective.currentPeriodEnd }
  };
}
```

- [ ] **Step 5: Rodar e confirmar que passa**

Run: `npx vitest run tests/actions/auth-guard.test.ts`
Expected: PASS, todos os testes (novos e os 4 existentes de `requireProviderProfile`/`requireAuth`).

- [ ] **Step 6: Rodar a suíte completa de actions (regressão)**

Run: `npx vitest run tests/actions`
Expected: PASS — nenhum outro arquivo que usa `requireProviderProfile` (services, quote-requests, quote-request-status, quote-request-notes, proposal-templates) deve quebrar, já que o select só ganhou campos extras.

- [ ] **Step 7: Commit**

```bash
git add lib/actions/auth-guard.ts tests/actions/auth-guard.test.ts tests/helpers.ts
git commit -m "feat: auto-rebaixa PRO via Pix manual vencido em requireProviderProfile"
```

---

### Task 4: `lib/admin.ts` — gate de admin único

**Files:**
- Create: `lib/admin.ts`
- Test: `tests/unit/admin.test.ts`
- Modify: `.env.example`

**Interfaces:**
- Produces: `isAdminEmail(email: string | null | undefined): boolean`

- [ ] **Step 1: Escrever o teste que deve falhar**

Criar `tests/unit/admin.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { isAdminEmail } from "@/lib/admin";

describe("isAdminEmail", () => {
  const original = process.env.ADMIN_EMAIL;

  beforeEach(() => {
    process.env.ADMIN_EMAIL = "admin@vitriny.app";
  });

  afterEach(() => {
    process.env.ADMIN_EMAIL = original;
  });

  it("retorna true quando o e-mail bate com ADMIN_EMAIL", () => {
    expect(isAdminEmail("admin@vitriny.app")).toBe(true);
  });

  it("retorna false quando o e-mail não bate", () => {
    expect(isAdminEmail("outro@exemplo.com")).toBe(false);
  });

  it("retorna false quando o e-mail é null ou undefined", () => {
    expect(isAdminEmail(null)).toBe(false);
    expect(isAdminEmail(undefined)).toBe(false);
  });

  it("retorna false quando ADMIN_EMAIL não está configurada", () => {
    process.env.ADMIN_EMAIL = "";
    expect(isAdminEmail("admin@vitriny.app")).toBe(false);
  });
});
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `npx vitest run tests/unit/admin.test.ts`
Expected: FAIL — módulo `@/lib/admin` não existe.

- [ ] **Step 3: Implementar**

Criar `lib/admin.ts`:

```ts
// Admin único via env var: não existe (ainda) sistema de roles na
// aplicação. Se um dia houver mais de um admin, evolui pra lista/tabela.
export function isAdminEmail(email: string | null | undefined): boolean {
  return !!email && email === process.env.ADMIN_EMAIL;
}
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `npx vitest run tests/unit/admin.test.ts`
Expected: PASS.

- [ ] **Step 5: Documentar a env var**

Em `.env.example`, adicionar depois do bloco Stripe (depois da linha `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_..."`):

```
# Admin único que pode confirmar pagamentos Pix da assinatura PRO em /admin/pix-payments
ADMIN_EMAIL="seu-email@exemplo.com"

# Pix da própria Vitriny (recebe pagamentos manuais da assinatura PRO — não é a chave do provedor)
VITRINY_PIX_KEY="chave-pix-da-vitriny"
VITRINY_PIX_HOLDER_NAME="Nome do titular"
VITRINY_PIX_CITY="Sua cidade"
```

- [ ] **Step 6: Commit**

```bash
git add lib/admin.ts tests/unit/admin.test.ts .env.example
git commit -m "feat: adiciona gate de admin único por e-mail"
```

---

### Task 5: `lib/email.ts` — e-mail de aviso ao admin

**Files:**
- Modify: `lib/email.ts`

**Interfaces:**
- Produces: `sendProPixPaymentClientPaidEmail({ to, businessName, amount, dashboardUrl }): Promise<void>`

- [ ] **Step 1: Implementar**

Adicionar em `lib/email.ts`, ao lado dos outros tipos de input (depois de `QuoteRequestConfirmationEmailInput`):

```ts
type ProPixPaymentClientPaidEmailInput = {
  to: string;
  businessName: string;
  amount: string;
  dashboardUrl: string;
};
```

E a função, ao final do arquivo:

```ts
export async function sendProPixPaymentClientPaidEmail({
  to,
  businessName,
  amount,
  dashboardUrl
}: ProPixPaymentClientPaidEmailInput) {
  await sendAppEmail({
    to,
    subject: "Pagamento Pix informado — assinatura PRO",
    preview: `${businessName} informou pagamento Pix de ${amount} pela assinatura PRO.`,
    html: [
      paragraph(`${businessName} informou que pagou ${amount} via Pix pela assinatura PRO.`),
      paragraph("Confirme o recebimento no seu banco antes de aprovar."),
      emailButton("Ver pagamentos pendentes", dashboardUrl)
    ].join("")
  });
}
```

Não precisa de teste unitário isolado — a cobertura vem do teste da action que a chama (Task 7), mockando `@/lib/email` como já é feito nos testes de `quote-requests`.

- [ ] **Step 2: Confirmar que o projeto ainda compila**

Run: `npx tsc --noEmit 2>&1 | grep -i "lib/email"`
Expected: nenhuma linha.

- [ ] **Step 3: Commit**

```bash
git add lib/email.ts
git commit -m "feat: adiciona e-mail de aviso de pagamento Pix informado"
```

---

### Task 6: `lib/actions/billing.ts` — `requestProPixPayment`

**Files:**
- Modify: `lib/actions/billing.ts`
- Test: `tests/actions/billing.test.ts`

**Interfaces:**
- Consumes: `createPixPayment` de `@/lib/pix` (já existe), `stripe.prices.retrieve` (já usado no arquivo via `stripe` de `@/lib/stripe`).
- Produces: `requestProPixPayment(): Promise<{ copyPasteCode: string; qrCodeDataUrl: string; paymentId: string } | { error: string }>`

- [ ] **Step 1: Escrever os testes que devem falhar**

Adicionar em `tests/actions/billing.test.ts`, novo `vi.mock` no topo (junto dos outros) e novo `describe` no final:

Adicionar ao bloco de mocks do topo do arquivo:

```ts
vi.mock("@/lib/pix", () => ({ createPixPayment: vi.fn() }));
```

E, dentro do `beforeEach`, ao lado de onde `stripeApi` é montado, adicionar `prices: { retrieve: vi.fn() }` ao objeto `stripeApi`:

```ts
  stripeApi = {
    subscriptions: { update: vi.fn() },
    setupIntents: { create: vi.fn() },
    paymentMethods: { retrieve: vi.fn() },
    customers: { create: vi.fn() },
    checkout: { sessions: { create: vi.fn() } },
    billingPortal: { sessions: { create: vi.fn() } },
    prices: { retrieve: vi.fn() }
  };
```

Novo `describe` no final do arquivo:

```ts
// ─── requestProPixPayment ─────────────────────────────────────────────────────

describe("requestProPixPayment", () => {
  it("retorna erro quando não autenticado", async () => {
    const { auth } = await import("@/auth");
    vi.mocked(auth).mockResolvedValue(null);

    const { requestProPixPayment } = await import("@/lib/actions/billing");
    expect(await requestProPixPayment()).toEqual({ error: "Não autenticado." });
  });

  it("retorna erro quando já é PRO", async () => {
    db.providerProfile.findUnique.mockResolvedValue({
      id: "profile-1",
      plan: "PRO",
      businessName: "Negócio Teste"
    });

    const { requestProPixPayment } = await import("@/lib/actions/billing");
    expect(await requestProPixPayment()).toEqual({ error: "Você já tem o plano PRO." });
  });

  it("reaproveita pedido pendente existente em vez de criar outro", async () => {
    db.providerProfile.findUnique.mockResolvedValue({
      id: "profile-1",
      plan: "FREE",
      businessName: "Negócio Teste"
    });
    db.proPixPayment.findFirst.mockResolvedValue({
      id: "pix-payment-1",
      amount: "19.90"
    });
    stripeApi.prices.retrieve.mockResolvedValue({ unit_amount: 1990 });
    const { createPixPayment } = await import("@/lib/pix");
    vi.mocked(createPixPayment).mockResolvedValue({
      copyPasteCode: "codigo-pix",
      qrCodeDataUrl: "data:image/png;base64,xyz"
    });

    const { requestProPixPayment } = await import("@/lib/actions/billing");
    const result = await requestProPixPayment();

    expect(result).toEqual({
      copyPasteCode: "codigo-pix",
      qrCodeDataUrl: "data:image/png;base64,xyz",
      paymentId: "pix-payment-1"
    });
    expect(db.proPixPayment.create).not.toHaveBeenCalled();
  });

  it("cria novo pedido quando não há pendente, usando o valor do Stripe", async () => {
    db.providerProfile.findUnique.mockResolvedValue({
      id: "profile-1",
      plan: "FREE",
      businessName: "Negócio Teste"
    });
    db.proPixPayment.findFirst.mockResolvedValue(null);
    db.proPixPayment.create.mockResolvedValue({ id: "pix-payment-novo" });
    stripeApi.prices.retrieve.mockResolvedValue({ unit_amount: 1990 });
    const { createPixPayment } = await import("@/lib/pix");
    vi.mocked(createPixPayment).mockResolvedValue({
      copyPasteCode: "codigo-pix",
      qrCodeDataUrl: "data:image/png;base64,xyz"
    });

    const { requestProPixPayment } = await import("@/lib/actions/billing");
    const result = await requestProPixPayment();

    expect(result).toEqual({
      copyPasteCode: "codigo-pix",
      qrCodeDataUrl: "data:image/png;base64,xyz",
      paymentId: "pix-payment-novo"
    });
    expect(db.proPixPayment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ providerProfileId: "profile-1", amount: "19.90" })
      })
    );
    expect(createPixPayment).toHaveBeenCalledWith(
      expect.objectContaining({
        pixKey: process.env.VITRINY_PIX_KEY,
        amount: "19.90",
        transactionId: "pix-payment-novo"
      })
    );
  });
});
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `npx vitest run tests/actions/billing.test.ts -t "requestProPixPayment"`
Expected: FAIL — `requestProPixPayment is not a function`.

- [ ] **Step 3: Implementar**

Em `lib/actions/billing.ts`, adicionar o import no topo:

```ts
import { createPixPayment } from "@/lib/pix";
```

E a nova action, ao final do arquivo:

```ts
export async function requestProPixPayment(): Promise<
  { copyPasteCode: string; qrCodeDataUrl: string; paymentId: string } | { error: string }
> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Não autenticado." };

  const profile = await prisma.providerProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true, plan: true }
  });

  if (!profile) return { error: "Dados do negócio não encontrados." };
  if (profile.plan === "PRO") return { error: "Você já tem o plano PRO." };

  // Idempotência: evita códigos Pix duplicados vivos ao mesmo tempo pro
  // mesmo perfil — reaproveita o pendente em vez de criar outro.
  const pending = await prisma.proPixPayment.findFirst({
    where: { providerProfileId: profile.id, confirmedAt: null },
    orderBy: { requestedAt: "desc" }
  });

  const price = await stripe.prices.retrieve(process.env.STRIPE_PRO_PRICE_ID!);
  const amount = ((price.unit_amount ?? 0) / 100).toFixed(2);

  const payment =
    pending ??
    (await prisma.proPixPayment.create({
      data: { providerProfileId: profile.id, amount }
    }));

  const pix = await createPixPayment({
    pixKey: process.env.VITRINY_PIX_KEY!,
    pixHolderName: process.env.VITRINY_PIX_HOLDER_NAME!,
    pixCity: process.env.VITRINY_PIX_CITY!,
    amount,
    transactionId: payment.id,
    description: "Vitriny PRO"
  });

  return {
    copyPasteCode: pix.copyPasteCode,
    qrCodeDataUrl: pix.qrCodeDataUrl,
    paymentId: payment.id
  };
}
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `npx vitest run tests/actions/billing.test.ts`
Expected: PASS, todos os testes do arquivo (novos e existentes).

- [ ] **Step 5: Commit**

```bash
git add lib/actions/billing.ts tests/actions/billing.test.ts
git commit -m "feat: adiciona requestProPixPayment"
```

---

### Task 7: `lib/actions/billing.ts` — `markProPixPaymentClientPaid`

**Files:**
- Modify: `lib/actions/billing.ts`
- Test: `tests/actions/billing.test.ts`

**Interfaces:**
- Consumes: `sendProPixPaymentClientPaidEmail` de `@/lib/email` (Task 5), `after` de `next/server` (já usado em `lib/actions/quote-requests.ts`).
- Produces: `markProPixPaymentClientPaid(paymentId: string): Promise<{ success: true } | { error: string }>`

- [ ] **Step 1: Escrever os testes que devem falhar**

Adicionar `vi.mock` no topo de `tests/actions/billing.test.ts`:

```ts
vi.mock("next/server", () => ({ after: (fn: () => unknown) => fn() }));
vi.mock("@/lib/email", () => ({ sendProPixPaymentClientPaidEmail: vi.fn() }));
```

Novo `describe` no final do arquivo:

```ts
// ─── markProPixPaymentClientPaid ──────────────────────────────────────────────

describe("markProPixPaymentClientPaid", () => {
  it("retorna erro quando não autenticado", async () => {
    const { auth } = await import("@/auth");
    vi.mocked(auth).mockResolvedValue(null);

    const { markProPixPaymentClientPaid } = await import("@/lib/actions/billing");
    expect(await markProPixPaymentClientPaid("pix-1")).toEqual({ error: "Não autenticado." });
  });

  it("retorna erro quando o pagamento não pertence ao perfil da sessão", async () => {
    db.providerProfile.findUnique.mockResolvedValue({ id: "profile-1" });
    db.proPixPayment.findFirst.mockResolvedValue(null);

    const { markProPixPaymentClientPaid } = await import("@/lib/actions/billing");
    expect(await markProPixPaymentClientPaid("pix-de-outro")).toEqual({
      error: "Pagamento não encontrado."
    });
  });

  it("é idempotente quando já foi informado", async () => {
    db.providerProfile.findUnique.mockResolvedValue({ id: "profile-1" });
    db.proPixPayment.findFirst.mockResolvedValue({
      id: "pix-1",
      clientPaidAt: new Date("2026-01-01")
    });

    const { markProPixPaymentClientPaid } = await import("@/lib/actions/billing");
    expect(await markProPixPaymentClientPaid("pix-1")).toEqual({ success: true });
    expect(db.proPixPayment.update).not.toHaveBeenCalled();
  });

  it("grava clientPaidAt e agenda o e-mail ao admin", async () => {
    db.providerProfile.findUnique.mockResolvedValue({
      id: "profile-1",
      businessName: "Negócio Teste"
    });
    db.proPixPayment.findFirst.mockResolvedValue({
      id: "pix-1",
      clientPaidAt: null,
      amount: "19.90"
    });
    db.proPixPayment.update.mockResolvedValue({});

    const { markProPixPaymentClientPaid } = await import("@/lib/actions/billing");
    expect(await markProPixPaymentClientPaid("pix-1")).toEqual({ success: true });

    expect(db.proPixPayment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "pix-1" },
        data: expect.objectContaining({ clientPaidAt: expect.any(Date) })
      })
    );

    const { sendProPixPaymentClientPaidEmail } = await import("@/lib/email");
    expect(sendProPixPaymentClientPaidEmail).toHaveBeenCalledWith(
      expect.objectContaining({ businessName: "Negócio Teste", amount: "19.90" })
    );
  });
});
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `npx vitest run tests/actions/billing.test.ts -t "markProPixPaymentClientPaid"`
Expected: FAIL — função não existe.

- [ ] **Step 3: Implementar**

Em `lib/actions/billing.ts`, adicionar os imports no topo:

```ts
import { after } from "next/server";
import { sendProPixPaymentClientPaidEmail } from "@/lib/email";
```

E a nova action, ao final do arquivo:

```ts
function appUrl(path: string) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  return `${baseUrl.replace(/\/$/, "")}${path}`;
}

export async function markProPixPaymentClientPaid(
  paymentId: string
): Promise<{ success: true } | { error: string }> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Não autenticado." };

  const profile = await prisma.providerProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true, businessName: true }
  });

  if (!profile) return { error: "Dados do negócio não encontrados." };

  const payment = await prisma.proPixPayment.findFirst({
    where: { id: paymentId, providerProfileId: profile.id }
  });

  if (!payment) return { error: "Pagamento não encontrado." };

  // Idempotente: segundo clique não regrava nem reenvia o e-mail.
  if (payment.clientPaidAt) return { success: true };

  await prisma.proPixPayment.update({
    where: { id: payment.id },
    data: { clientPaidAt: new Date() }
  });

  after(async () => {
    if (!process.env.ADMIN_EMAIL) return;
    try {
      await sendProPixPaymentClientPaidEmail({
        to: process.env.ADMIN_EMAIL,
        businessName: profile.businessName,
        amount: payment.amount.toString(),
        dashboardUrl: appUrl("/admin/pix-payments")
      });
    } catch (error) {
      console.error("Falha ao enviar e-mail de pagamento Pix informado.", {
        error,
        paymentId: payment.id
      });
    }
  });

  return { success: true };
}
```

Nota: `lib/actions/billing.ts` já tem `NEXT_PUBLIC_APP_URL` usado inline em outras actions (`createPortalSession`, `createCheckoutSession`) sem essa função `appUrl` — a função é nova neste arquivo especificamente pra esta action; não precisa refatorar as demais.

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `npx vitest run tests/actions/billing.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/actions/billing.ts tests/actions/billing.test.ts
git commit -m "feat: adiciona markProPixPaymentClientPaid"
```

---

### Task 8: `lib/actions/admin-pix-payments.ts` — confirmação e listagem (admin)

**Files:**
- Create: `lib/actions/admin-pix-payments.ts`
- Test: `tests/actions/admin-pix-payments.test.ts`

**Interfaces:**
- Consumes: `isAdminEmail` de `@/lib/admin` (Task 4).
- Produces: `confirmProPixPayment(paymentId: string): Promise<{ success: true } | { error: string }>`, `listPendingProPixPayments(): Promise<Array<{ id: string; businessName: string; amount: string; requestedAt: Date; clientPaidAt: Date }>>`

- [ ] **Step 1: Escrever os testes que devem falhar**

Criar `tests/actions/admin-pix-payments.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";
import { makePrismaMock, makeSession, type PrismaMock } from "../helpers";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: {} }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

let db: PrismaMock;

beforeEach(async () => {
  vi.resetModules();
  process.env.ADMIN_EMAIL = "admin@vitriny.app";

  const prismaModule = await import("@/lib/prisma");
  db = makePrismaMock();
  Object.assign(prismaModule.prisma, db);

  const authModule = await import("@/auth");
  vi.mocked(authModule.auth).mockResolvedValue(
    makeSession() ? { user: { id: "user-1", email: "admin@vitriny.app" } } : null
  );
});

describe("confirmProPixPayment", () => {
  it("rejeita quando o e-mail da sessão não é admin", async () => {
    const { auth } = await import("@/auth");
    vi.mocked(auth).mockResolvedValue({ user: { id: "user-2", email: "outro@x.com" } } as never);

    const { confirmProPixPayment } = await import("@/lib/actions/admin-pix-payments");
    expect(await confirmProPixPayment("pix-1")).toEqual({ error: "Não autorizado." });
  });

  it("retorna erro quando o pagamento não existe", async () => {
    db.proPixPayment.findFirst.mockResolvedValue(null);

    const { confirmProPixPayment } = await import("@/lib/actions/admin-pix-payments");
    expect(await confirmProPixPayment("pix-inexistente")).toEqual({
      error: "Pagamento não encontrado."
    });
  });

  it("é idempotente quando já foi confirmado", async () => {
    db.proPixPayment.findFirst.mockResolvedValue({
      id: "pix-1",
      confirmedAt: new Date("2026-01-01"),
      providerProfileId: "profile-1"
    });

    const { confirmProPixPayment } = await import("@/lib/actions/admin-pix-payments");
    expect(await confirmProPixPayment("pix-1")).toEqual({ success: true });
    expect(db.proPixPayment.update).not.toHaveBeenCalled();
  });

  it("confirma e estende currentPeriodEnd a partir de agora quando já venceu", async () => {
    db.proPixPayment.findFirst.mockResolvedValue({
      id: "pix-1",
      confirmedAt: null,
      providerProfileId: "profile-1"
    });
    db.proPixPayment.update.mockResolvedValue({});
    db.providerProfile.findUnique.mockResolvedValue({
      id: "profile-1",
      currentPeriodEnd: new Date("2020-01-01")
    });
    db.providerProfile.update.mockResolvedValue({});

    const { confirmProPixPayment } = await import("@/lib/actions/admin-pix-payments");
    expect(await confirmProPixPayment("pix-1")).toEqual({ success: true });

    expect(db.proPixPayment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "pix-1" },
        data: expect.objectContaining({ confirmedAt: expect.any(Date) })
      })
    );
    const updateCall = db.providerProfile.update.mock.calls[0][0];
    expect(updateCall.data.plan).toBe("PRO");
    expect(updateCall.data.currentPeriodEnd.getTime()).toBeGreaterThan(Date.now());
  });

  it("estende currentPeriodEnd a partir do que resta quando ainda não venceu", async () => {
    const future = new Date(Date.now() + 1000 * 60 * 60 * 24 * 10); // 10 dias no futuro
    db.proPixPayment.findFirst.mockResolvedValue({
      id: "pix-1",
      confirmedAt: null,
      providerProfileId: "profile-1"
    });
    db.proPixPayment.update.mockResolvedValue({});
    db.providerProfile.findUnique.mockResolvedValue({
      id: "profile-1",
      currentPeriodEnd: future
    });
    db.providerProfile.update.mockResolvedValue({});

    const { confirmProPixPayment } = await import("@/lib/actions/admin-pix-payments");
    await confirmProPixPayment("pix-1");

    const updateCall = db.providerProfile.update.mock.calls[0][0];
    const expectedMinimum = future.getTime() + 1000 * 60 * 60 * 24 * 29; // ~30 dias a partir do future
    expect(updateCall.data.currentPeriodEnd.getTime()).toBeGreaterThan(expectedMinimum);
  });
});

describe("listPendingProPixPayments", () => {
  it("lança quando o e-mail da sessão não é admin", async () => {
    const { auth } = await import("@/auth");
    vi.mocked(auth).mockResolvedValue({ user: { id: "user-2", email: "outro@x.com" } } as never);

    const { listPendingProPixPayments } = await import("@/lib/actions/admin-pix-payments");
    await expect(listPendingProPixPayments()).rejects.toThrow("/login");
  });

  it("busca pagamentos com clientPaidAt preenchido e confirmedAt vazio", async () => {
    db.proPixPayment.findMany.mockResolvedValue([]);

    const { listPendingProPixPayments } = await import("@/lib/actions/admin-pix-payments");
    await listPendingProPixPayments();

    expect(db.proPixPayment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { clientPaidAt: { not: null }, confirmedAt: null }
      })
    );
  });
});
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `npx vitest run tests/actions/admin-pix-payments.test.ts`
Expected: FAIL — módulo `@/lib/actions/admin-pix-payments` não existe.

- [ ] **Step 3: Implementar**

Criar `lib/actions/admin-pix-payments.ts`:

```ts
"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isAdminEmail } from "@/lib/admin";

const PRO_PERIOD_DAYS = 30;

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.email || !isAdminEmail(session.user.email)) {
    redirect("/login");
  }
}

export async function confirmProPixPayment(
  paymentId: string
): Promise<{ success: true } | { error: string }> {
  const session = await auth();
  if (!session?.user?.email || !isAdminEmail(session.user.email)) {
    return { error: "Não autorizado." };
  }

  const payment = await prisma.proPixPayment.findFirst({
    where: { id: paymentId }
  });

  if (!payment) return { error: "Pagamento não encontrado." };

  // Idempotente: segundo clique não estende currentPeriodEnd de novo.
  if (payment.confirmedAt) return { success: true };

  const profile = await prisma.providerProfile.findUnique({
    where: { id: payment.providerProfileId },
    select: { id: true, currentPeriodEnd: true }
  });

  if (!profile) return { error: "Perfil do negócio não encontrado." };

  const now = new Date();
  // Renovar antes de vencer não perde os dias que já restavam.
  const base = profile.currentPeriodEnd && profile.currentPeriodEnd > now
    ? profile.currentPeriodEnd
    : now;
  const currentPeriodEnd = new Date(base.getTime() + PRO_PERIOD_DAYS * 24 * 60 * 60 * 1000);

  await prisma.proPixPayment.update({
    where: { id: payment.id },
    data: { confirmedAt: now }
  });

  await prisma.providerProfile.update({
    where: { id: profile.id },
    data: { plan: "PRO", currentPeriodEnd }
  });

  revalidatePath("/admin/pix-payments");
  return { success: true };
}

export type PendingProPixPayment = {
  id: string;
  businessName: string;
  amount: string;
  requestedAt: Date;
  clientPaidAt: Date;
};

export async function listPendingProPixPayments(): Promise<PendingProPixPayment[]> {
  await requireAdmin();

  const payments = await prisma.proPixPayment.findMany({
    where: { clientPaidAt: { not: null }, confirmedAt: null },
    orderBy: { clientPaidAt: "asc" },
    select: {
      id: true,
      amount: true,
      requestedAt: true,
      clientPaidAt: true,
      providerProfile: { select: { businessName: true } }
    }
  });

  return payments.map((p) => ({
    id: p.id,
    businessName: p.providerProfile.businessName,
    amount: p.amount.toString(),
    requestedAt: p.requestedAt,
    clientPaidAt: p.clientPaidAt!
  }));
}
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `npx vitest run tests/actions/admin-pix-payments.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/actions/admin-pix-payments.ts tests/actions/admin-pix-payments.test.ts
git commit -m "feat: adiciona confirmProPixPayment e listPendingProPixPayments"
```

---

### Task 9: Página `/admin/pix-payments`

**Files:**
- Create: `app/admin/pix-payments/page.tsx`
- Create: `components/admin/ConfirmProPixPaymentButton.tsx`

**Interfaces:**
- Consumes: `listPendingProPixPayments`, `confirmProPixPayment` de `@/lib/actions/admin-pix-payments` (Task 8).

- [ ] **Step 1: Criar o botão de confirmação (client component)**

Criar `components/admin/ConfirmProPixPaymentButton.tsx`, seguindo o padrão de `useTransition` já usado em `BillingCard.tsx`:

```tsx
"use client";

import { useState, useTransition } from "react";
import { confirmProPixPayment } from "@/lib/actions/admin-pix-payments";

export function ConfirmProPixPaymentButton({ paymentId }: { paymentId: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  function handleConfirm() {
    setError(null);
    startTransition(async () => {
      const result = await confirmProPixPayment(paymentId);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setConfirmed(true);
    });
  }

  if (confirmed) {
    return <span className="text-xs font-semibold text-leaf">Confirmado</span>;
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={handleConfirm}
        disabled={pending}
        className="inline-flex min-h-8 items-center justify-center rounded-md bg-leaf px-3 text-xs font-semibold text-white transition hover:bg-leaf-hover disabled:opacity-60"
      >
        {pending ? "Confirmando..." : "Confirmar"}
      </button>
      {error ? <p className="text-xs font-semibold text-red-700">{error}</p> : null}
    </div>
  );
}
```

- [ ] **Step 2: Criar a página**

Criar `app/admin/pix-payments/page.tsx`:

```tsx
import { listPendingProPixPayments } from "@/lib/actions/admin-pix-payments";
import { ConfirmProPixPaymentButton } from "@/components/admin/ConfirmProPixPaymentButton";

export default async function AdminPixPaymentsPage() {
  const payments = await listPendingProPixPayments();

  return (
    <div className="min-w-0 p-4 sm:p-6 md:p-8">
      <h1 className="font-fraunces text-3xl font-bold text-ink">
        Pagamentos Pix pendentes
      </h1>
      <p className="mt-2 text-sm text-ink-muted">
        Assinantes que informaram pagamento da assinatura PRO via Pix.
        Confirme no seu banco antes de aprovar.
      </p>

      {payments.length === 0 ? (
        <p className="mt-8 text-sm text-ink-muted">Nenhum pagamento pendente.</p>
      ) : (
        <ul className="mt-8 divide-y divide-paper-soft rounded-xl border border-paper-soft bg-white">
          {payments.map((payment) => (
            <li key={payment.id} className="flex items-center justify-between gap-4 p-4">
              <div>
                <p className="text-sm font-semibold text-ink">{payment.businessName}</p>
                <p className="text-xs text-ink-muted">
                  R$ {payment.amount} · informado em{" "}
                  {payment.clientPaidAt.toLocaleDateString("pt-BR")}
                </p>
              </div>
              <ConfirmProPixPaymentButton paymentId={payment.id} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

`listPendingProPixPayments` já redireciona pra `/login` via `requireAdmin` se a sessão não for do e-mail admin — a página não precisa de checagem própria.

- [ ] **Step 3: Verificar manualmente**

Run: `npm run dev`, logar com uma conta que tenha `email === process.env.ADMIN_EMAIL`, acessar `http://localhost:3000/admin/pix-payments`.
Expected: página carrega mostrando "Nenhum pagamento pendente." (ainda não há registros). Logar com outra conta e acessar a mesma URL deve redirecionar pra `/login`.

- [ ] **Step 4: Commit**

```bash
git add app/admin/pix-payments/page.tsx components/admin/ConfirmProPixPaymentButton.tsx
git commit -m "feat: adiciona página admin de pagamentos Pix pendentes"
```

---

### Task 10: Auto-rebaixamento nas páginas de dashboard

**Files:**
- Modify: `app/(dashboard)/dashboard/billing/page.tsx`
- Modify: `app/(dashboard)/dashboard/page.tsx`

**Interfaces:**
- Consumes: `resolveEffectivePlan` de `@/lib/actions/auth-guard` (Task 3).

- [ ] **Step 1: Wire em `billing/page.tsx`**

Em `app/(dashboard)/dashboard/billing/page.tsx`, adicionar o import:

```ts
import { resolveEffectivePlan } from "@/lib/actions/auth-guard";
```

Depois da busca do `profile` (depois do bloco `const profile = await prisma.providerProfile.findUnique({...})`, antes de `const limits = profile ? getPlanLimits(profile.plan) : null;`), inserir:

```ts
  const effective = profile ? await resolveEffectivePlan(profile) : null;
  const plan = effective?.plan ?? profile?.plan ?? "FREE";
  const currentPeriodEnd = effective?.currentPeriodEnd ?? profile?.currentPeriodEnd ?? null;
```

E trocar as referências de `profile.plan`/`profile.currentPeriodEnd` usadas mais abaixo (no `BillingCard` e `PlanUsageCard`) por essas variáveis locais `plan`/`currentPeriodEnd` — os outros campos de `profile` (services, quoteRequests, proposals, proposalTemplates, stripeSubscriptionId, cancelAtPeriodEnd, subscriptionStatus) continuam vindo direto de `profile` sem mudança.

Especificamente, no JSX do `BillingCard`:

```tsx
            <BillingCard
              plan={plan}
              subscriptionStatus={profile.subscriptionStatus}
              currentPeriodEnd={currentPeriodEnd}
              cancelAtPeriodEnd={profile.cancelAtPeriodEnd}
              hasActiveSubscription={!!profile.stripeSubscriptionId}
            />
```

E no cálculo de `limits`:

```ts
  const limits = profile ? getPlanLimits(plan) : null;
```

- [ ] **Step 2: Wire em `dashboard/page.tsx`**

Em `app/(dashboard)/dashboard/page.tsx`, adicionar ao `select` da query do `profile` (dentro do bloco já existente, junto de `plan: true`):

```ts
      plan: true,
      stripeSubscriptionId: true,
      currentPeriodEnd: true,
```

Adicionar o import:

```ts
import { resolveEffectivePlan } from "@/lib/actions/auth-guard";
```

Depois da busca do `profile`, antes de `const limits = profile ? getPlanLimits(profile.plan) : null;`, inserir:

```ts
  const effectivePlan = profile ? (await resolveEffectivePlan(profile)).plan : "FREE";
```

E trocar a linha de `limits` para usar `effectivePlan`:

```ts
  const limits = profile ? getPlanLimits(effectivePlan) : null;
```

- [ ] **Step 3: Verificar manualmente**

Run: `npm run dev`. Num perfil de teste, definir manualmente via `npx prisma studio` (ou uma query direta) `plan = PRO`, `stripeSubscriptionId = NULL`, `currentPeriodEnd` = uma data no passado. Acessar `/dashboard` e depois `/dashboard/billing`.
Expected: ambas as páginas mostram o negócio como FREE (limites de FREE, sem os botões de assinatura PRO via Stripe), e o registro no banco (`SELECT plan, "currentPeriodEnd" FROM "ProviderProfile" WHERE id = '...'`) já aparece corrigido pra `FREE`/`NULL` depois do acesso.

- [ ] **Step 4: Rodar a suíte de testes de regressão**

Run: `npx vitest run`
Expected: PASS — nenhum teste existente de dashboard/billing quebrou (as páginas não têm teste unitário direto hoje, então isso é regressão via `tests/unit/dashboard.test.ts` e `tests/actions/billing.test.ts`, que não tocam essas duas páginas).

- [ ] **Step 5: Commit**

```bash
git add "app/(dashboard)/dashboard/billing/page.tsx" "app/(dashboard)/dashboard/page.tsx"
git commit -m "feat: aplica auto-rebaixamento nas páginas de dashboard e billing"
```

---

### Task 11: `components/billing/ProPixPaymentModal.tsx`

**Files:**
- Create: `components/billing/ProPixPaymentModal.tsx`

**Interfaces:**
- Consumes: `markProPixPaymentClientPaid` de `@/lib/actions/billing` (Task 7), `CopyButton` de `@/components/ui/CopyButton` (já existe).
- Produces: componente `ProPixPaymentModal({ copyPasteCode, qrCodeDataUrl, paymentId, onClose, onConfirmed })`, usado pelo `BillingCard` (Task 12).

- [ ] **Step 1: Implementar**

Criar `components/billing/ProPixPaymentModal.tsx`, seguindo a estrutura visual de `SubscriptionModal.tsx`/`UpdatePaymentModal.tsx` (mesmo padrão de `role="dialog"`, `aria-modal`, Escape pra fechar) mas sem Stripe Elements:

```tsx
"use client";

import { useState, useTransition } from "react";
import Image from "next/image";

import { CopyButton } from "@/components/ui/CopyButton";
import { markProPixPaymentClientPaid } from "@/lib/actions/billing";

type ProPixPaymentModalProps = {
  copyPasteCode: string;
  qrCodeDataUrl: string;
  paymentId: string;
  onClose: () => void;
  onConfirmed: () => void;
};

export function ProPixPaymentModal({
  copyPasteCode,
  qrCodeDataUrl,
  paymentId,
  onClose,
  onConfirmed
}: ProPixPaymentModalProps) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [informed, setInformed] = useState(false);

  function handleMarkPaid() {
    setError(null);
    startTransition(async () => {
      const result = await markProPixPaymentClientPaid(paymentId);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setInformed(true);
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="pro-pix-modal-title"
        tabIndex={-1}
        onKeyDown={(e) => e.key === "Escape" && onClose()}
        className="w-full max-w-md rounded-xl border border-paper-soft bg-white p-6 shadow-card"
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 id="pro-pix-modal-title" className="font-fraunces text-xl font-bold text-ink">
            Pagar 1 mês via Pix
          </h2>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="flex h-8 w-8 items-center justify-center rounded-md text-ink-muted transition hover:bg-paper hover:text-ink"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {informed ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
            <p className="text-sm font-semibold text-amber-800">
              Pagamento informado. O plano PRO será ativado depois da confirmação.
            </p>
            <button
              type="button"
              onClick={onConfirmed}
              className="mt-4 inline-flex min-h-9 items-center justify-center rounded-md bg-leaf px-4 text-xs font-semibold text-white transition hover:bg-leaf-hover"
            >
              Fechar
            </button>
          </div>
        ) : (
          <>
            <Image
              alt="QR Code Pix para pagamento da assinatura PRO"
              className="mx-auto h-auto w-full max-w-[280px] rounded-lg bg-white"
              height={280}
              src={qrCodeDataUrl}
              unoptimized
              width={280}
            />

            <div className="mt-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-ink-muted">
                Código Pix copia e cola
              </p>
              <code className="mt-1.5 block max-h-28 overflow-auto break-all rounded-lg border border-paper-soft bg-paper px-3 py-2 text-xs leading-5 text-ink">
                {copyPasteCode}
              </code>
              <div className="mt-2">
                <CopyButton
                  text={copyPasteCode}
                  label="Copiar código Pix"
                  className="inline-flex min-h-8 items-center justify-center rounded-md bg-leaf px-3 text-xs font-semibold text-white transition hover:bg-leaf-hover"
                />
              </div>
            </div>

            {error ? <p className="mt-3 text-xs font-semibold text-red-700">{error}</p> : null}

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={pending}
                className="inline-flex min-h-9 items-center justify-center rounded-md border border-paper-soft bg-white px-4 text-xs font-semibold text-ink-muted transition hover:border-leaf hover:text-leaf disabled:opacity-60"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleMarkPaid}
                disabled={pending}
                className="inline-flex min-h-9 items-center justify-center rounded-md bg-leaf px-5 text-xs font-semibold text-white transition hover:bg-leaf-hover disabled:opacity-60"
              >
                {pending ? "Enviando..." : "Já paguei"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Confirmar que compila**

Run: `npx tsc --noEmit 2>&1 | grep -i "ProPixPaymentModal"`
Expected: nenhuma linha.

- [ ] **Step 3: Commit**

```bash
git add components/billing/ProPixPaymentModal.tsx
git commit -m "feat: adiciona modal de pagamento Pix da assinatura PRO"
```

---

### Task 12: `components/billing/BillingCard.tsx` — integração final

**Files:**
- Modify: `components/billing/BillingCard.tsx`

**Interfaces:**
- Consumes: `requestProPixPayment` de `@/lib/actions/billing` (Task 6), `ProPixPaymentModal` (Task 11).

- [ ] **Step 1: Adicionar estado e handler pro Pix**

Em `components/billing/BillingCard.tsx`, adicionar o import:

```ts
import { requestProPixPayment } from "@/lib/actions/billing";
import { ProPixPaymentModal } from "@/components/billing/ProPixPaymentModal";
```

Adicionar estado, junto dos outros `useState` já existentes (depois de `setupClientSecret`/`showCardSuccess`):

```ts
  // Pagamento Pix (sem Stripe) — 1 mês, com ou sem assinatura ativa
  const [pixPayment, setPixPayment] = useState<
    { copyPasteCode: string; qrCodeDataUrl: string; paymentId: string } | null
  >(null);
  const [pixError, setPixError] = useState<string | null>(null);
```

Adicionar handler, junto dos outros `function handle...`:

```ts
  function handlePayWithPix() {
    setPixError(null);
    startTransition(async () => {
      const result = await requestProPixPayment();
      if ("error" in result) {
        setPixError(result.error);
        return;
      }
      setPixPayment(result);
    });
  }

  function handlePixModalClose() {
    setPixPayment(null);
  }

  function handlePixConfirmed() {
    setPixPayment(null);
    router.refresh();
  }
```

- [ ] **Step 2: Renderizar o modal**

No JSX, ao lado de onde `SubscriptionModal`/`UpdatePaymentModal` já são renderizados condicionalmente (antes do `<ConfirmModal>`), adicionar:

```tsx
      {pixPayment ? (
        <ProPixPaymentModal
          copyPasteCode={pixPayment.copyPasteCode}
          qrCodeDataUrl={pixPayment.qrCodeDataUrl}
          paymentId={pixPayment.paymentId}
          onClose={handlePixModalClose}
          onConfirmed={handlePixConfirmed}
        />
      ) : null}
```

- [ ] **Step 3: Ajustar os botões pro caso FREE**

No bloco `{plan === "PRO" ? (...) : (...)}`, no `else` (caso `FREE`), trocar:

```tsx
            ) : (
              <button
                onClick={handleSubscribe}
                disabled={pending || hasActiveSubscription}
                className="inline-flex min-h-9 items-center justify-center rounded-md bg-leaf px-5 text-xs font-semibold text-white transition hover:bg-leaf-hover disabled:opacity-60"
              >
                {pending ? "Aguarde..." : "Assinar PRO"}
              </button>
            )}
```

por:

```tsx
            ) : (
              <div className="flex w-full flex-col gap-2 sm:w-auto">
                <button
                  onClick={handleSubscribe}
                  disabled={pending || hasActiveSubscription}
                  className="inline-flex min-h-9 items-center justify-center rounded-md bg-leaf px-5 text-xs font-semibold text-white transition hover:bg-leaf-hover disabled:opacity-60"
                >
                  {pending ? "Aguarde..." : "Assinar PRO"}
                </button>
                <button
                  onClick={handlePayWithPix}
                  disabled={pending}
                  className="inline-flex min-h-9 items-center justify-center rounded-md border border-paper-soft bg-white px-5 text-xs font-semibold text-ink transition hover:border-leaf hover:text-leaf disabled:opacity-60"
                >
                  {pending ? "Aguarde..." : "Pagar 1 mês via Pix"}
                </button>
                {pixError ? (
                  <p className="text-xs font-semibold text-red-700">{pixError}</p>
                ) : null}
              </div>
            )}
```

- [ ] **Step 4: Ajustar o bloco PRO sem assinatura Stripe (pago via Pix manual)**

No mesmo bloco, o `if (plan === "PRO")` hoje sempre mostra "Cancelar assinatura"/"Reativar assinatura" + "Atualizar cartão" — isso só faz sentido pra assinatura Stripe. Trocar o início do bloco `{plan === "PRO" ? (...` por:

```tsx
            {plan === "PRO" ? (
              hasActiveSubscription ? (
                <>
                  {cancelAtPeriodEnd ? (
                    <button
                      onClick={handleReactivate}
                      disabled={pending}
                      className="inline-flex min-h-9 items-center justify-center rounded-md bg-leaf px-5 text-xs font-semibold text-white transition hover:bg-leaf-hover disabled:opacity-60"
                    >
                      {pending ? "Aguarde..." : "Reativar assinatura"}
                    </button>
                  ) : (
                    <button
                      onClick={() => setShowCancelConfirm(true)}
                      disabled={pending}
                      className="inline-flex min-h-9 w-full items-center justify-center rounded-md border border-red-300 bg-white px-5 text-xs font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-60 sm:w-44"
                    >
                      Cancelar assinatura
                    </button>
                  )}

                  <button
                    onClick={handleUpdateCard}
                    disabled={pending}
                    className="inline-flex min-h-9 w-full items-center justify-center rounded-md border border-paper-soft bg-white px-5 text-xs font-semibold text-ink transition hover:border-leaf hover:text-leaf disabled:opacity-60 sm:w-44"
                  >
                    {pending ? "Aguarde..." : "Atualizar cartão"}
                  </button>
                </>
              ) : (
                <div className="flex w-full flex-col gap-2 sm:w-auto">
                  <p className="text-xs text-ink-muted">
                    PRO ativo até {periodEndLabel ?? "data não disponível"} · pago via Pix
                  </p>
                  <button
                    onClick={handlePayWithPix}
                    disabled={pending}
                    className="inline-flex min-h-9 items-center justify-center rounded-md border border-paper-soft bg-white px-5 text-xs font-semibold text-ink transition hover:border-leaf hover:text-leaf disabled:opacity-60"
                  >
                    {pending ? "Aguarde..." : "Renovar mais 1 mês"}
                  </button>
                  {pixError ? (
                    <p className="text-xs font-semibold text-red-700">{pixError}</p>
                  ) : null}
                </div>
              )
            ) : (
```

(o restante do `else` — bloco FREE — já foi ajustado no Step 3; só a linha `{plan === "PRO" ? (` original e o fechamento `<>`/`</>` do ramo `hasActiveSubscription` mudam de posição, sem duplicar lógica.)

- [ ] **Step 5: Verificar manualmente**

Run: `npm run dev`. Testar os três estados no navegador (logado com uma conta de teste):

1. `plan = FREE`: `/dashboard/billing` mostra os dois botões ("Assinar PRO" e "Pagar 1 mês via Pix"). Clicar em "Pagar 1 mês via Pix" abre o modal com QR/copia-e-cola; clicar em "Já paguei" mostra a mensagem de aguardando confirmação.
2. Depois de confirmar manualmente via `/admin/pix-payments` (ou uma query direta setando `plan = PRO`, `stripeSubscriptionId = NULL`, `currentPeriodEnd` = +30 dias): `/dashboard/billing` mostra "PRO ativo até {data} · pago via Pix" e o botão "Renovar mais 1 mês", sem os botões de cancelar/atualizar cartão.
3. Com uma assinatura Stripe real (`stripeSubscriptionId` preenchido) e `plan = PRO`: comportamento inalterado (cancelar/reativar/atualizar cartão).

- [ ] **Step 6: Commit**

```bash
git add components/billing/BillingCard.tsx
git commit -m "feat: integra pagamento Pix manual no BillingCard"
```

---

### Task 13: Documentação e verificação final

**Files:**
- Modify: `docs/DEPLOY.md`

**Interfaces:**
- Nenhuma nova — só documentação e checagem de regressão.

- [ ] **Step 1: Documentar as novas env vars no `docs/DEPLOY.md`**

No bloco de Environment do Easypanel (depois de `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=...`), adicionar:

```
ADMIN_EMAIL=seu-email@exemplo.com
VITRINY_PIX_KEY=chave-pix-da-vitriny
VITRINY_PIX_HOLDER_NAME=Nome do titular
VITRINY_PIX_CITY=Sua cidade
```

E uma nota, junto das notas de "Serviços externos":

```markdown
- **Pix da assinatura PRO**: sem Stripe (Pix no Stripe é mediante convite pra
  contas BR — ver `docs/superpowers/specs/2026-08-01-pix-assinatura-pro-design.md`).
  `VITRINY_PIX_KEY`/`_HOLDER_NAME`/`_CITY` são a chave Pix da própria Vitriny, não
  a do provedor. Pagamentos informados aparecem em `/admin/pix-payments` — só o
  e-mail em `ADMIN_EMAIL` acessa essa página.
```

- [ ] **Step 2: Rodar a suíte completa**

Run: `npx vitest run`
Expected: PASS — todos os testes (unit + actions), incluindo os novos das Tasks 2-8.

- [ ] **Step 3: Rodar o typecheck completo**

Run: `npx tsc --noEmit`
Expected: os mesmos erros pré-existentes de antes desta feature (Prisma Client desincronizado em `brand-appearance`/`storefront-view`, não relacionados) — nenhum erro novo em nenhum arquivo tocado por este plano.

- [ ] **Step 4: Commit**

```bash
git add docs/DEPLOY.md
git commit -m "docs: documenta env vars do Pix da assinatura PRO"
```
