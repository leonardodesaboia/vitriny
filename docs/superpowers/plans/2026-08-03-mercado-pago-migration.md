# Migração Stripe → Mercado Pago (assinatura PRO) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Substituir o Stripe pelo Mercado Pago como gateway da assinatura PRO da Vitriny, oferecendo assinatura recorrente automática por **Pix Automático (padrão)** e **cartão (fallback)**, com confirmação por webhook — eliminando a confirmação manual de Pix da branch `develop`.

**Architecture:** O MP usa o recurso `preapproval` (assinatura) para cobrança recorrente. Criamos a assinatura no backend, redirecionamos o pagador para o `init_point` do MP (onde ele autoriza cartão OU Pix Automático no app do banco), e o **webhook assinado** confirma e ativa o PRO. A resolução de plano deixa de depender de campos `stripe*` e passa a usar campos `mp*` gateway-neutros. Mantemos os campos Stripe no schema como legado (limpeza é follow-up), seguindo o padrão que este codebase já usa para resíduos.

**Tech Stack:** Next.js App Router · Server Actions · Prisma/PostgreSQL · `mercadopago` (SDK Node oficial) · Vitest.

---

## Decisões de arquitetura (leia antes de executar)

1. **Redirect para `init_point`, não checkout embutido (v1).** O Stripe hoje usa Elements embutido. O Pix Automático exige autorização no app do banco do pagador — não há como embutir isso. Para não manter dois fluxos divergentes, **v1 usa o `init_point` (checkout hospedado do MP) para cartão E Pix**. Checkout de cartão embutido (MP Bricks/tokenização) fica como enhancement futuro. Isso reduz drasticamente a superfície PCI e o risco da migração.

2. **Campos gateway-neutros.** Adicionamos `mpPreapprovalId` e `mpPayerId` ao `ProviderProfile`. Reaproveitamos `subscriptionStatus`, `currentPeriodEnd`, `cancelAtPeriodEnd`, `plan`. Os campos `stripe*` ficam como legado (não lidos no fluxo novo).

3. **`ProPixPayment` (Pix manual da `develop`) é descontinuado no fluxo novo**, mas o model e o admin permanecem para não quebrar dados/pendências em aberto. Removê-los é follow-up após confirmar que não há Pix manual pendente em produção.

4. **`effective-plan` continua rebaixando na leitura** — agora considera assinatura MP ativa em vez de `stripeSubscriptionId`.

5. **Convivência durante a migração:** o código Stripe (webhook, actions) permanece funcional até o cutover final (Task 12), para não derrubar assinantes Stripe existentes. Novos assinantes vão para o MP.

## Pré-requisito operacional (fora do código)

- Conta Mercado Pago criada, com **Credenciais de produção** (`Access Token`) e **assinatura de webhook (secret)** geradas no painel de desenvolvedor.
- **Verificar no painel MP se o Pix Automático está habilitado** para a conta (Task 0). Se não estiver, o fluxo entrega cartão e o Pix comum via `init_point`, e o Pix Automático é ligado depois sem mudança de código.

## Mapa de arquivos

**Criar:**
- `lib/mercadopago.ts` — client singleton do SDK (espelha `lib/stripe.ts`).
- `lib/mp-plan.ts` — resolve `PlanTier` a partir do status da preapproval (espelha `lib/stripe-plan.ts`), puro e testável.
- `lib/actions/mp-billing.ts` — Server Actions: criar assinatura (retorna `init_point`), cancelar, consultar.
- `app/api/mercadopago/webhook/route.ts` — recebe eventos MP, valida assinatura, atualiza plano.
- `tests/unit/mp-plan.test.ts` — testes da resolução de plano.
- `tests/actions/mp-billing.test.ts` — testes das actions (SDK mockado).

**Modificar:**
- `prisma/schema.prisma` — campos `mpPreapprovalId`, `mpPayerId` em `ProviderProfile`.
- `lib/plan-limits.ts:156-172` — `isOneTimeProExpired` / adicionar helper `hasActiveMpSubscription`.
- `lib/effective-plan.ts` — usar assinatura MP na resolução.
- `lib/actions/auth-guard.ts:25-46` — `select` dos novos campos.
- `components/billing/BillingCard.tsx` — botões "Assinar PRO" apontando para o fluxo MP (redirect).
- `app/(dashboard)/dashboard/billing/page.tsx` — passar novos campos e tratar retorno `?status=`.
- `.env.example` — envs MP.

---

## Task 0: Spike — validar credenciais e Pix Automático da conta MP

**Files:**
- Nenhum arquivo de código. Registro em `docs/superpowers/plans/2026-08-03-mercado-pago-migration.md` (marcar o checkbox).

- [ ] **Step 1: Confirmar credenciais**

No painel MP (Suas integrações → Credenciais de produção), copiar `Access Token` e o `secret` da assinatura de webhook. Guardar para as envs.

- [ ] **Step 2: Verificar disponibilidade de Pix Automático**

No painel MP, confirmar em "Assinaturas / Pagamentos recorrentes" se **Pix Automático** aparece como meio habilitado para a conta. Anotar o resultado (SIM/NÃO) abaixo:

```
Pix Automático habilitado na conta: [ ] SIM  [ ] NÃO
```

Se NÃO: seguir o plano normalmente — o `init_point` entregará cartão + Pix comum, e o Pix Automático liga depois sem código novo.

- [ ] **Step 3: Commit (registro)**

```bash
git add docs/superpowers/plans/2026-08-03-mercado-pago-migration.md
git commit -m "docs: registra spike de credenciais e Pix Automatico do Mercado Pago"
```

---

## Task 1: Instalar SDK e criar o client singleton

**Files:**
- Create: `lib/mercadopago.ts`
- Modify: `package.json` (dependência)

- [ ] **Step 1: Instalar o SDK oficial**

Run: `npm install mercadopago`
Expected: `mercadopago` aparece em `dependencies` no `package.json`.

- [ ] **Step 2: Criar o client singleton**

Espelha o padrão lazy de `lib/stripe.ts` (proxy que só instancia quando usado, para não quebrar o build sem env).

```typescript
// lib/mercadopago.ts
import { MercadoPagoConfig } from "mercadopago";

let _client: MercadoPagoConfig | undefined;

export function getMercadoPago(): MercadoPagoConfig {
  if (!_client) {
    const accessToken = process.env.MP_ACCESS_TOKEN;
    if (!accessToken) {
      throw new Error("MP_ACCESS_TOKEN environment variable is not set");
    }
    _client = new MercadoPagoConfig({
      accessToken,
      options: { timeout: 5000 }
    });
  }
  return _client;
}
```

- [ ] **Step 3: Verificar build**

Run: `npm run build`
Expected: build passa (o client não é instanciado em build time).

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json lib/mercadopago.ts
git commit -m "feat: adiciona client singleton do Mercado Pago"
```

---

## Task 2: Resolver plano a partir do status da preapproval (TDD)

**Files:**
- Create: `lib/mp-plan.ts`
- Test: `tests/unit/mp-plan.test.ts`

O MP retorna status de preapproval: `authorized` (ativa), `paused`, `cancelled`, `pending`. Espelha a lógica de `lib/stripe-plan.ts`.

- [ ] **Step 1: Escrever o teste que falha**

```typescript
// tests/unit/mp-plan.test.ts
import { describe, it, expect } from "vitest";
import { resolvePlanFromPreapproval } from "@/lib/mp-plan";

describe("resolvePlanFromPreapproval", () => {
  it("assinatura autorizada vira PRO", () => {
    expect(resolvePlanFromPreapproval("authorized")).toBe("PRO");
  });

  it("cancelada vira FREE", () => {
    expect(resolvePlanFromPreapproval("cancelled")).toBe("FREE");
  });

  it("pausada vira FREE", () => {
    expect(resolvePlanFromPreapproval("paused")).toBe("FREE");
  });

  it("pending nao muda o plano (retorna null)", () => {
    expect(resolvePlanFromPreapproval("pending")).toBeNull();
  });

  it("status desconhecido nao muda o plano (retorna null)", () => {
    expect(resolvePlanFromPreapproval("whatever")).toBeNull();
  });
});
```

- [ ] **Step 2: Rodar o teste e ver falhar**

Run: `npx vitest run tests/unit/mp-plan.test.ts`
Expected: FAIL com "Cannot find module '@/lib/mp-plan'".

- [ ] **Step 3: Implementar**

```typescript
// lib/mp-plan.ts
import type { PlanTier } from "@prisma/client";

// Resolve o plano pelo status da assinatura (preapproval) do Mercado Pago.
// `authorized` = ativa → PRO. Estados terminais → FREE. `pending` e
// desconhecidos retornam null (não mexem no plano — o valor só muda quando a
// assinatura confirma ou termina de fato).
export function resolvePlanFromPreapproval(
  status: string
): PlanTier | null {
  if (status === "authorized") return "PRO";
  if (status === "cancelled" || status === "paused") return "FREE";
  return null;
}
```

- [ ] **Step 4: Rodar o teste e ver passar**

Run: `npx vitest run tests/unit/mp-plan.test.ts`
Expected: PASS (5 testes).

- [ ] **Step 5: Commit**

```bash
git add lib/mp-plan.ts tests/unit/mp-plan.test.ts
git commit -m "feat: resolve plano a partir do status da preapproval do Mercado Pago"
```

---

## Task 3: Adicionar campos MP ao schema

**Files:**
- Modify: `prisma/schema.prisma` (model `ProviderProfile`, junto dos campos `stripe*`)

- [ ] **Step 1: Adicionar os campos**

No model `ProviderProfile`, logo abaixo de `stripePriceId`, adicionar:

```prisma
  mpPreapprovalId      String?             @unique
  mpPayerId            String?
```

- [ ] **Step 2: Validar o schema**

Run: `npx prisma validate`
Expected: "The schema is valid".

- [ ] **Step 3: Criar a migration**

Run: `npm run prisma:migrate -- --name add_mercado_pago_fields`
Expected: nova pasta em `prisma/migrations/*_add_mercado_pago_fields/` com `ALTER TABLE ... ADD COLUMN`.

- [ ] **Step 4: Gerar o client**

Run: `npm run prisma:generate`
Expected: client regenerado sem erro.

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat: adiciona campos mpPreapprovalId e mpPayerId ao ProviderProfile"
```

---

## Task 4: Helper de assinatura MP ativa + ajuste do effective-plan (TDD)

**Files:**
- Modify: `lib/plan-limits.ts:156-172`
- Modify: `lib/effective-plan.ts`
- Test: `tests/unit/effective-plan.test.ts` (já existe — estender)

Hoje `isOneTimeProExpired` verifica `stripeSubscriptionId === null`. Com MP, uma assinatura ativa é `mpPreapprovalId !== null`. O rebaixamento na leitura deve valer para PRO **sem** assinatura recorrente (nem Stripe nem MP) e com período vencido.

- [ ] **Step 1: Escrever o teste que falha**

```typescript
// tests/unit/effective-plan.test.ts  (adicionar dentro do describe existente)
import { isOneTimeProExpired } from "@/lib/plan-limits";

describe("isOneTimeProExpired com assinatura MP", () => {
  const past = new Date(Date.now() - 86_400_000);
  const future = new Date(Date.now() + 86_400_000);

  it("PRO com preapproval MP ativa NAO expira mesmo com data passada", () => {
    expect(
      isOneTimeProExpired({
        plan: "PRO",
        stripeSubscriptionId: null,
        mpPreapprovalId: "2c93808",
        currentPeriodEnd: past
      })
    ).toBe(false);
  });

  it("PRO avulso (sem assinatura) e vencido expira", () => {
    expect(
      isOneTimeProExpired({
        plan: "PRO",
        stripeSubscriptionId: null,
        mpPreapprovalId: null,
        currentPeriodEnd: past
      })
    ).toBe(true);
  });

  it("PRO avulso ainda dentro do prazo NAO expira", () => {
    expect(
      isOneTimeProExpired({
        plan: "PRO",
        stripeSubscriptionId: null,
        mpPreapprovalId: null,
        currentPeriodEnd: future
      })
    ).toBe(false);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run tests/unit/effective-plan.test.ts`
Expected: FAIL — o tipo `OneTimeProProfile` não tem `mpPreapprovalId`.

- [ ] **Step 3: Atualizar o tipo e a função**

Em `lib/plan-limits.ts`, substituir o bloco `OneTimeProProfile` + `isOneTimeProExpired`:

```typescript
type OneTimeProProfile = {
  plan: PlanTier;
  stripeSubscriptionId: string | null;
  mpPreapprovalId: string | null;
  currentPeriodEnd: Date | null;
};

// PRO só expira sozinho quando NÃO há assinatura recorrente por trás (nem
// Stripe nem preapproval MP) e o período venceu. Assinatura recorrente real
// nunca cai aqui: o webhook mantém currentPeriodEnd atualizado a cada ciclo.
export function isOneTimeProExpired(profile: OneTimeProProfile): boolean {
  return (
    profile.plan === "PRO" &&
    profile.stripeSubscriptionId === null &&
    profile.mpPreapprovalId === null &&
    profile.currentPeriodEnd !== null &&
    profile.currentPeriodEnd < new Date()
  );
}
```

- [ ] **Step 4: Atualizar o effective-plan para carregar/repassar o campo**

Em `lib/effective-plan.ts`, estender `EffectivePlanInput`:

```typescript
export type EffectivePlanInput = {
  id: string;
  plan: PlanTier;
  stripeSubscriptionId: string | null;
  mpPreapprovalId: string | null;
  currentPeriodEnd: Date | null;
};
```

(O corpo de `resolveEffectivePlan` não muda — só passa o objeto completo para `isOneTimeProExpired`.)

- [ ] **Step 5: Atualizar o select em auth-guard**

Em `lib/actions/auth-guard.ts:29-35`, adicionar `mpPreapprovalId: true` ao `select`.

- [ ] **Step 6: Rodar os testes e ver passar**

Run: `npx vitest run tests/unit/effective-plan.test.ts tests/actions/auth-guard.test.ts`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add lib/plan-limits.ts lib/effective-plan.ts lib/actions/auth-guard.ts tests/unit/effective-plan.test.ts
git commit -m "feat: considera assinatura MP na expiracao e resolucao de plano"
```

---

## Task 5: Server Action — criar assinatura MP (retorna init_point) (TDD)

**Files:**
- Create: `lib/actions/mp-billing.ts`
- Test: `tests/actions/mp-billing.test.ts`

Cria a preapproval no MP com `auto_recurring` mensal em BRL, status `pending` (sem card token — o pagador escolhe cartão ou Pix Automático no `init_point`), `external_reference` = id do perfil, e `back_url` para a billing. Persiste `mpPreapprovalId` e retorna `init_point`.

- [ ] **Step 1: Escrever o teste que falha**

```typescript
// tests/actions/mp-billing.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const preApprovalCreate = vi.fn();
vi.mock("mercadopago", () => ({
  MercadoPagoConfig: vi.fn(),
  PreApproval: vi.fn(() => ({ create: preApprovalCreate }))
}));

const findUnique = vi.fn();
const update = vi.fn();
vi.mock("@/lib/prisma", () => ({
  prisma: { providerProfile: { findUnique, update } }
}));

vi.mock("@/auth", () => ({ auth: vi.fn(async () => ({ user: { id: "u1" } })) }));

beforeEach(() => {
  vi.clearAllMocks();
  process.env.MP_PRO_AMOUNT = "19.90";
  process.env.NEXT_PUBLIC_APP_URL = "https://app.test";
});

describe("createMpSubscription", () => {
  it("cria preapproval e retorna init_point", async () => {
    findUnique.mockResolvedValue({
      id: "p1",
      plan: "FREE",
      mpPreapprovalId: null,
      stripeSubscriptionId: null
    });
    preApprovalCreate.mockResolvedValue({
      id: "2c93808",
      init_point: "https://mp.test/checkout/2c93808"
    });

    const { createMpSubscription } = await import("@/lib/actions/mp-billing");
    const result = await createMpSubscription("payer@test.com");

    expect(result).toEqual({ initPoint: "https://mp.test/checkout/2c93808" });
    expect(update).toHaveBeenCalledWith({
      where: { id: "p1" },
      data: { mpPreapprovalId: "2c93808" }
    });
  });

  it("bloqueia quem ja e PRO com assinatura MP ativa", async () => {
    findUnique.mockResolvedValue({
      id: "p1",
      plan: "PRO",
      mpPreapprovalId: "2c93808",
      stripeSubscriptionId: null
    });

    const { createMpSubscription } = await import("@/lib/actions/mp-billing");
    const result = await createMpSubscription("payer@test.com");

    expect("error" in result).toBe(true);
    expect(preApprovalCreate).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run tests/actions/mp-billing.test.ts`
Expected: FAIL com "Cannot find module '@/lib/actions/mp-billing'".

- [ ] **Step 3: Implementar a action**

```typescript
// lib/actions/mp-billing.ts
"use server";

import { PreApproval } from "mercadopago";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getMercadoPago } from "@/lib/mercadopago";

export async function createMpSubscription(
  payerEmail: string
): Promise<{ initPoint: string } | { error: string }> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Não autenticado." };

  const profile = await prisma.providerProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true, plan: true, mpPreapprovalId: true, stripeSubscriptionId: true }
  });

  if (!profile) return { error: "Dados do negócio não encontrados." };
  if (profile.plan === "PRO" && (profile.mpPreapprovalId || profile.stripeSubscriptionId)) {
    return { error: "Você já tem uma assinatura PRO ativa." };
  }

  const amount = Number(process.env.MP_PRO_AMOUNT);
  if (!Number.isFinite(amount) || amount <= 0) {
    return { error: "Valor do plano não configurado." };
  }

  const backUrl = `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/billing?mp=return`;

  const preApproval = new PreApproval(getMercadoPago());
  const result = await preApproval.create({
    body: {
      reason: "Vitriny PRO",
      external_reference: profile.id,
      payer_email: payerEmail,
      auto_recurring: {
        frequency: 1,
        frequency_type: "months",
        transaction_amount: amount,
        currency_id: "BRL"
      },
      back_url: backUrl,
      status: "pending"
    }
  });

  if (!result.id || !result.init_point) {
    return { error: "Não foi possível iniciar a assinatura. Tente novamente." };
  }

  await prisma.providerProfile.update({
    where: { id: profile.id },
    data: { mpPreapprovalId: result.id }
  });

  return { initPoint: result.init_point };
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run tests/actions/mp-billing.test.ts`
Expected: PASS (2 testes).

- [ ] **Step 5: Commit**

```bash
git add lib/actions/mp-billing.ts tests/actions/mp-billing.test.ts
git commit -m "feat: cria assinatura Mercado Pago retornando init_point"
```

---

## Task 6: Server Action — cancelar assinatura MP (TDD)

**Files:**
- Modify: `lib/actions/mp-billing.ts`
- Test: `tests/actions/mp-billing.test.ts` (estender)

Cancela via `preApproval.update({ id, body: { status: "cancelled" } })`. O plano só cai para FREE quando o webhook confirmar (`cancelled`), mantendo uma fonte de verdade só.

- [ ] **Step 1: Escrever o teste que falha**

```typescript
// tests/actions/mp-billing.test.ts (adicionar)
const preApprovalUpdate = vi.fn();
// Ajustar o mock de PreApproval para incluir update:
//   PreApproval: vi.fn(() => ({ create: preApprovalCreate, update: preApprovalUpdate }))

describe("cancelMpSubscription", () => {
  it("chama update com status cancelled", async () => {
    findUnique.mockResolvedValue({ mpPreapprovalId: "2c93808" });
    preApprovalUpdate.mockResolvedValue({ id: "2c93808", status: "cancelled" });

    const { cancelMpSubscription } = await import("@/lib/actions/mp-billing");
    const result = await cancelMpSubscription();

    expect(result).toEqual({ success: true });
    expect(preApprovalUpdate).toHaveBeenCalledWith({
      id: "2c93808",
      body: { status: "cancelled" }
    });
  });
});
```

Atualizar o `vi.mock("mercadopago", ...)` no topo do arquivo para o `PreApproval` retornar também `update: preApprovalUpdate`.

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run tests/actions/mp-billing.test.ts`
Expected: FAIL com "cancelMpSubscription is not a function".

- [ ] **Step 3: Implementar**

Adicionar em `lib/actions/mp-billing.ts`:

```typescript
export async function cancelMpSubscription(): Promise<
  { success: true } | { error: string }
> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Não autenticado." };

  const profile = await prisma.providerProfile.findUnique({
    where: { userId: session.user.id },
    select: { mpPreapprovalId: true }
  });

  if (!profile?.mpPreapprovalId) return { error: "Assinatura não encontrada." };

  const preApproval = new PreApproval(getMercadoPago());
  await preApproval.update({
    id: profile.mpPreapprovalId,
    body: { status: "cancelled" }
  });

  return { success: true };
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run tests/actions/mp-billing.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/actions/mp-billing.ts tests/actions/mp-billing.test.ts
git commit -m "feat: cancela assinatura Mercado Pago via preapproval update"
```

---

## Task 7: Webhook MP com validação de assinatura

**Files:**
- Create: `app/api/mercadopago/webhook/route.ts`

O MP envia `POST` com header `x-signature`/`x-request-id` e `?data.id=` na query. Validamos com `WebhookSignatureValidator` do SDK, buscamos a preapproval por id, resolvemos o plano e atualizamos o perfil por `external_reference` (id do perfil) ou `mpPreapprovalId`.

- [ ] **Step 1: Implementar o route handler**

```typescript
// app/api/mercadopago/webhook/route.ts
import {
  PreApproval,
  WebhookSignatureValidator,
  InvalidWebhookSignatureError
} from "mercadopago";
import { getMercadoPago } from "@/lib/mercadopago";
import { resolvePlanFromPreapproval } from "@/lib/mp-plan";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const url = new URL(request.url);
  const dataId = url.searchParams.get("data.id") ?? url.searchParams.get("id");

  try {
    WebhookSignatureValidator.validate({
      xSignature: request.headers.get("x-signature") ?? "",
      xRequestId: request.headers.get("x-request-id") ?? "",
      dataId: dataId ?? "",
      secret: process.env.MP_WEBHOOK_SECRET!
    });
  } catch (err) {
    if (err instanceof InvalidWebhookSignatureError) {
      return new Response("Invalid signature", { status: 401 });
    }
    throw err;
  }

  const body = (await request.json().catch(() => ({}))) as {
    type?: string;
    data?: { id?: string };
  };

  // Só tratamos eventos de assinatura. Pagamentos avulsos de ciclo já se
  // refletem no status da preapproval, que consultamos abaixo.
  if (body.type !== "subscription_preapproval") {
    return new Response(null, { status: 200 });
  }

  const preapprovalId = body.data?.id ?? dataId;
  if (!preapprovalId) return new Response(null, { status: 200 });

  try {
    const preApproval = new PreApproval(getMercadoPago());
    const sub = await preApproval.get({ id: preapprovalId });

    const plan = resolvePlanFromPreapproval(sub.status ?? "");
    const nextPayment = sub.next_payment_date
      ? new Date(sub.next_payment_date)
      : null;

    await prisma.providerProfile.updateMany({
      where: { mpPreapprovalId: preapprovalId },
      data: {
        ...(plan !== null ? { plan } : {}),
        ...(plan === "FREE" ? { mpPreapprovalId: null } : {}),
        currentPeriodEnd: plan === "FREE" ? null : nextPayment,
        cancelAtPeriodEnd: false
      }
    });
  } catch (err) {
    console.error("Erro ao processar webhook Mercado Pago:", err);
    return new Response("Internal error", { status: 500 });
  }

  return new Response(null, { status: 200 });
}
```

- [ ] **Step 2: Verificar build/typecheck**

Run: `npm run build`
Expected: build passa.

- [ ] **Step 3: Commit**

```bash
git add app/api/mercadopago/webhook/route.ts
git commit -m "feat: webhook Mercado Pago com validacao de assinatura e ativacao de plano"
```

> **Nota de verificação manual:** após o deploy, cadastrar a URL `https://SEU-DOMINIO/api/mercadopago/webhook` no painel MP (eventos de "Assinaturas/preapproval") e testar com o simulador do painel. Confirmar 200 na assinatura válida e 401 numa inválida.

---

## Task 8: UI — botão "Assinar PRO" via Mercado Pago (redirect)

**Files:**
- Modify: `components/billing/BillingCard.tsx`
- Modify: `app/(dashboard)/dashboard/billing/page.tsx`

Substituir o `handleSubscribe` (Stripe Elements) por um handler que chama `createMpSubscription` e **redireciona** para o `initPoint`. O botão "Pagar 1 mês via Pix" (manual, `develop`) é removido do caminho FREE, já que o MP passa a cobrir Pix.

- [ ] **Step 1: Trocar o handler de assinatura**

Em `components/billing/BillingCard.tsx`, substituir o import e o `handleSubscribe`:

```typescript
import { createMpSubscription, cancelMpSubscription } from "@/lib/actions/mp-billing";
```

```typescript
function handleSubscribe() {
  setError(null);
  startTransition(async () => {
    const result = await createMpSubscription(payerEmail);
    if ("error" in result) {
      setError(result.error);
      return;
    }
    window.location.href = result.initPoint;
  });
}
```

Adicionar `payerEmail: string` às `BillingCardProps` e ao destructuring do componente.

- [ ] **Step 2: Trocar o cancelamento para MP**

Substituir a chamada em `handleConfirmCancel` de `cancelSubscription()` para `cancelMpSubscription()`.

- [ ] **Step 3: Remover o caminho de Pix manual do bloco FREE**

No JSX do bloco `plan === "FREE"` (linhas ~306-325), remover o botão "Pagar 1 mês via Pix" e o `pixError`, deixando só "Assinar PRO" (que agora cobre cartão + Pix via MP). Trocar o texto do botão para `"Assinar PRO (Pix ou cartão)"`.

- [ ] **Step 4: Passar payerEmail na página**

Em `app/(dashboard)/dashboard/billing/page.tsx`, buscar o e-mail (`ProviderProfile.email ?? User.email`) e passar `payerEmail` ao `<BillingCard />`. Tratar `searchParams.mp === "return"` mostrando um aviso "Estamos confirmando seu pagamento. Seu plano é atualizado em instantes." (o webhook confirma de forma assíncrona).

- [ ] **Step 5: Verificar build**

Run: `npm run build`
Expected: build passa.

- [ ] **Step 6: Commit**

```bash
git add components/billing/BillingCard.tsx "app/(dashboard)/dashboard/billing/page.tsx"
git commit -m "feat: botao Assinar PRO redireciona para checkout Mercado Pago"
```

---

## Task 9: Envs e documentação de deploy

**Files:**
- Modify: `.env.example`
- Modify: `docs/DEPLOY.md`

- [ ] **Step 1: Adicionar envs ao .env.example**

```env
# Mercado Pago
MP_ACCESS_TOKEN="APP_USR-..."
MP_WEBHOOK_SECRET="..."
MP_PRO_AMOUNT="19.90"
```

- [ ] **Step 2: Documentar no DEPLOY.md**

Na seção "Serviços externos" do `docs/DEPLOY.md`, adicionar:
- Cadastrar webhook MP em `https://SEU-DOMINIO/api/mercadopago/webhook` (evento preapproval).
- Copiar o secret da assinatura para `MP_WEBHOOK_SECRET`.

- [ ] **Step 3: Commit**

```bash
git add .env.example docs/DEPLOY.md
git commit -m "docs: documenta env vars e webhook do Mercado Pago"
```

---

## Task 10: Atualizar a fonte do preço do plano

**Files:**
- Modify: `lib/plan-limits.ts:91-95`

- [ ] **Step 1: Atualizar o comentário da fonte de preço**

Trocar o comentário de `PLAN_PRICES` (que hoje cita "o preço real vive no Stripe") para citar `MP_PRO_AMOUNT`. Manter o valor `"R$ 19,90"` alinhado ao `MP_PRO_AMOUNT="19.90"`.

- [ ] **Step 2: Commit**

```bash
git add lib/plan-limits.ts
git commit -m "docs: alinha fonte do preco do plano ao Mercado Pago"
```

---

## Task 11: Rodar a suíte completa

**Files:** nenhum (verificação).

- [ ] **Step 1: Rodar unit + actions**

Run: `npm test`
Expected: PASS (incluindo `mp-plan`, `mp-billing`, `effective-plan`).

- [ ] **Step 2: Build de produção**

Run: `npm run build`
Expected: build passa sem erro de tipo.

- [ ] **Step 3: Commit (se houver ajuste)**

```bash
git add -A
git commit -m "test: garante suite verde apos migracao Mercado Pago"
```

---

## Task 12: Cutover — descontinuar caminho Stripe/Pix manual para novos assinantes

**Files:**
- Modify: `components/billing/BillingCard.tsx`
- Modify: `app/(dashboard)/dashboard/billing/page.tsx`

> Fazer **só depois** de confirmar o webhook MP em produção (Task 7, nota) e que não há Pix manual pendente no admin (`/admin/pix-payments`).

- [ ] **Step 1: Remover imports Stripe do BillingCard**

Remover `createCheckoutSession`, `createSetupIntent`, `requestProPixPayment` e os modais `SubscriptionModal`/`UpdatePaymentModal`/`ProPixPaymentModal` que não são mais acionados no fluxo novo. Manter o bloco de assinante MP ativo (status + cancelar).

- [ ] **Step 2: Verificar que nenhum caminho FREE chama Stripe**

Run: `grep -rn "createCheckoutSession\|requestProPixPayment\|createSetupIntent" components/ app/`
Expected: sem resultados em `components/billing/BillingCard.tsx`.

- [ ] **Step 3: Build + testes**

Run: `npm run build && npm test`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "refactor: remove caminho Stripe/Pix manual do fluxo de assinatura"
```

> **Follow-up (fora deste plano):** migration de limpeza removendo campos `stripe*` e o model `ProPixPayment` após confirmar que nenhum assinante legado depende deles; e Task futura de Pix Automático embutido (Bricks) se quiser sair do redirect.

---

## Self-review

- **Cobertura do spec:** client (T1), resolução de plano (T2), schema (T3), expiração/effective-plan (T4), criar assinatura Pix+cartão via init_point (T5), cancelar (T6), webhook assinado (T7), UI redirect (T8), envs/deploy (T9), preço (T10), suíte (T11), cutover (T12). ✅
- **Pix Automático:** entregue via `init_point` da preapproval `pending` (T5) — o pagador escolhe cartão ou Pix Automático no checkout do MP; a disponibilidade do método é config de conta (T0), não código.
- **Consistência de tipos:** `mpPreapprovalId`/`mpPayerId` usados igual em schema (T3), effective-plan (T4), actions (T5/T6) e webhook (T7). `resolvePlanFromPreapproval` mesma assinatura em T2 e T7. `createMpSubscription(payerEmail)` mesma assinatura em T5 e T8.
- **Riscos conhecidos:** (a) confirmar `type` exato do evento de assinatura no painel MP (assumido `subscription_preapproval`) — validar no simulador na nota da T7; (b) redirect substitui o Elements embutido — decisão registrada na seção de arquitetura.
