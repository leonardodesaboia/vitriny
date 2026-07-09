# Seção 2 (plano A): refactor de planos, snapshot, hash de reset, reabrir reserva — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar 2.1 (capacidades de plano + webhook por preço), 2.2 (snapshot primário), 2.3 (hash no token de reset) e 2.5 (reabrir reserva Pix expirada) do spec `docs/superpowers/specs/2026-07-09-secao2-mudancas-logica-design.md`.

**Architecture:** Capacidades de plano viram um mapa único em `lib/plan-limits.ts` consumido por helpers; a resolução de plano do webhook vira função pura em `lib/stripe-plan.ts` (testável sem Stripe). O hash de token generaliza o SHA-256 já usado na verificação de e-mail. Reabrir reserva segue o padrão das actions provider-only existentes.

**Tech Stack:** Next 16, Prisma 6, vitest, Stripe SDK.

## Global Constraints

- Nenhuma mudança de comportamento visível nas tasks de 2.1/2.2 (blindagem/semântica) — a suíte existente é critério de regressão.
- Copy pt-BR; `Decimal` nunca cruza server→client; moeda via `Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" })`.
- Testes com `npx vitest run <arquivo>`; commits pequenos com os trailers da sessão.
- Redirects de action nos testes: `rejects.toThrow("<path>")`.

---

### Task 1: `PLAN_FEATURES` + helpers (TDD)

**Files:**
- Modify: `lib/plan-limits.ts`
- Test: Create `tests/unit/plan-limits.test.ts`

**Interfaces:**
- Produces: `PLAN_FEATURES: Record<PlanTier, { serviceImages: boolean; themePresets: boolean }>`; `canUseServiceImages(plan: PlanTier): boolean`; `canUseThemePresets(plan: PlanTier): boolean`; `isPaidPlan(plan: PlanTier): boolean`; `PLAN_PRICES: Record<PlanTier, string>` (`FREE: "R$ 0"`, `PRO: "R$ 19,90"`).

- [ ] **Step 1: Teste que falha** (`tests/unit/plan-limits.test.ts`)

```ts
import { describe, expect, it } from "vitest";

import {
  canUseServiceImages,
  canUseThemePresets,
  isPaidPlan,
  PLAN_PRICES
} from "@/lib/plan-limits";

describe("capacidades por plano", () => {
  it("FREE não tem imagens nem temas; PRO tem ambos", () => {
    expect(canUseServiceImages("FREE")).toBe(false);
    expect(canUseThemePresets("FREE")).toBe(false);
    expect(canUseServiceImages("PRO")).toBe(true);
    expect(canUseThemePresets("PRO")).toBe(true);
  });

  it("isPaidPlan distingue FREE de planos pagos", () => {
    expect(isPaidPlan("FREE")).toBe(false);
    expect(isPaidPlan("PRO")).toBe(true);
  });

  it("expõe o preço de cada plano", () => {
    expect(PLAN_PRICES.PRO).toBe("R$ 19,90");
  });
});
```

Run: `npx vitest run tests/unit/plan-limits.test.ts` → FAIL (exports inexistentes).

- [ ] **Step 2: Implementar em `lib/plan-limits.ts`** (após `PLAN_NAMES`)

```ts
// Capacidades por plano: um plano novo entra aqui e nos limites — nunca em
// checagens `plan === "PRO"` espalhadas.
export const PLAN_FEATURES: Record<
  PlanTier,
  { serviceImages: boolean; themePresets: boolean }
> = {
  FREE: { serviceImages: false, themePresets: false },
  PRO: { serviceImages: true, themePresets: true }
};

export const canUseServiceImages = (plan: PlanTier) =>
  PLAN_FEATURES[plan].serviceImages;

export const canUseThemePresets = (plan: PlanTier) =>
  PLAN_FEATURES[plan].themePresets;

export const isPaidPlan = (plan: PlanTier) => plan !== "FREE";

// Fonte única do preço exibido na landing (o preço real vive no Stripe).
export const PLAN_PRICES: Record<PlanTier, string> = {
  FREE: "R$ 0",
  PRO: "R$ 19,90"
};
```

Run: `npx vitest run tests/unit/plan-limits.test.ts` → PASS.

- [ ] **Step 3: Commit** — `git add lib/plan-limits.ts tests/unit/plan-limits.test.ts && git commit -m "feat(planos): mapa de capacidades e precos por plano"`

---

### Task 2: Substituir as checagens `plan === "PRO"` de produto

**Files:**
- Modify: `app/api/services/[id]/image/route.ts:55` e `:144`; `app/u/[slug]/page.tsx:250`; `app/u/[slug]/orcamento/page.tsx:159`; `app/(dashboard)/dashboard/servicos/page.tsx:129` e `:136`; `components/provider-profile/ProfileForm.tsx:89`; `lib/actions/provider-profile.ts:101-107`; `lib/theme-presets.ts:103`

**Interfaces:**
- Consumes: helpers da Task 1.

- [ ] **Step 1: Aplicar as substituições** (import dos helpers em cada arquivo):

| Local | De | Para |
|---|---|---|
| image route (POST/DELETE) | `profile.plan !== "PRO"` | `!canUseServiceImages(profile.plan)` |
| `/u/[slug]/page.tsx` | `profile.plan === "PRO" ? (s.imageUrl ?? null) : null` | `canUseServiceImages(profile.plan) ? (s.imageUrl ?? null) : null` |
| orcamento page | `profile.plan === "PRO" && selectedService.imageUrl` | `canUseServiceImages(profile.plan) && selectedService.imageUrl` |
| servicos page (×2) | `isPro={profile.plan === "PRO"}` | `isPro={canUseServiceImages(profile.plan)}` |
| ProfileForm | `const isPro = profile?.plan === "PRO";` | `const isPro = profile ? canUseThemePresets(profile.plan) : false;` |
| provider-profile action | `currentProfile?.plan === "PRO" ? parsed.data.themePreset : ...` | `currentProfile && canUseThemePresets(currentProfile.plan) ? parsed.data.themePreset : ...` |
| theme-presets.ts | `if (plan !== "PRO") return THEME_PRESETS.DEFAULT;` | `if (!canUseThemePresets(plan)) return THEME_PRESETS.DEFAULT;` |

`BillingCard` e `lib/actions/billing.ts` ficam como estão (assunto é o plano).
Atenção: `lib/theme-presets.ts` não pode importar nada server-only — `plan-limits.ts` é puro, ok.

- [ ] **Step 2: Regressão** — `npx vitest run` → PASS; `npm run lint` → limpo.

- [ ] **Step 3: Commit** — `git add -A && git commit -m "refactor(planos): checagens de capacidade via helpers"` (conferir com `git status` que só os 8 arquivos entraram)

---

### Task 3: Webhook resolve plano por preço (TDD)

**Files:**
- Create: `lib/stripe-plan.ts`
- Modify: `app/api/stripe/webhook/route.ts` (remover `resolvePlan` local, usar o novo)
- Test: Create `tests/unit/stripe-plan.test.ts`

**Interfaces:**
- Produces: `resolvePlanFromSubscription(stripeStatus: string, priceId: string | null | undefined, env?: { proPriceId?: string }): PlanTier | null` — ativo/trialing: se `priceId === proPriceId` → `"PRO"`; price desconhecido ou env ausente → `"PRO"` (fallback preserva comportamento atual); status terminal (canceled/unpaid/incomplete_expired/paused) → `"FREE"`; demais → `null`. `env` default lê `process.env.STRIPE_PRO_PRICE_ID`.

- [ ] **Step 1: Teste que falha** (`tests/unit/stripe-plan.test.ts`)

```ts
import { describe, expect, it } from "vitest";

import { resolvePlanFromSubscription } from "@/lib/stripe-plan";

describe("resolvePlanFromSubscription", () => {
  const env = { proPriceId: "price_pro" };

  it("status ativo com priceId do PRO vira PRO", () => {
    expect(resolvePlanFromSubscription("active", "price_pro", env)).toBe("PRO");
    expect(resolvePlanFromSubscription("trialing", "price_pro", env)).toBe("PRO");
  });

  it("priceId desconhecido cai no fallback PRO (único plano pago hoje)", () => {
    expect(resolvePlanFromSubscription("active", "price_outro", env)).toBe("PRO");
    expect(resolvePlanFromSubscription("active", null, env)).toBe("PRO");
  });

  it("status terminal derruba para FREE independente do preço", () => {
    expect(resolvePlanFromSubscription("canceled", "price_pro", env)).toBe("FREE");
    expect(resolvePlanFromSubscription("unpaid", null, env)).toBe("FREE");
    expect(resolvePlanFromSubscription("incomplete_expired", null, env)).toBe("FREE");
    expect(resolvePlanFromSubscription("paused", null, env)).toBe("FREE");
  });

  it("status intermediário não mexe no plano", () => {
    expect(resolvePlanFromSubscription("past_due", "price_pro", env)).toBeNull();
    expect(resolvePlanFromSubscription("incomplete", null, env)).toBeNull();
  });
});
```

Run: `npx vitest run tests/unit/stripe-plan.test.ts` → FAIL.

- [ ] **Step 2: Implementar `lib/stripe-plan.ts`**

```ts
import type { PlanTier } from "@prisma/client";

type StripePlanEnv = { proPriceId?: string };

const TERMINAL_STATUSES = new Set([
  "canceled",
  "unpaid",
  "incomplete_expired",
  "paused"
]);

// Resolve o plano pelo preço da assinatura quando ela está ativa; por status
// nos estados terminais. Com um único plano pago, price desconhecido cai em
// PRO para não rebaixar assinante por env desconfigurada — ao criar um novo
// plano, adicionar o price aqui ANTES de vendê-lo.
export function resolvePlanFromSubscription(
  stripeStatus: string,
  priceId: string | null | undefined,
  env: StripePlanEnv = { proPriceId: process.env.STRIPE_PRO_PRICE_ID }
): PlanTier | null {
  if (stripeStatus === "active" || stripeStatus === "trialing") {
    const priceToPlan: Record<string, PlanTier> = env.proPriceId
      ? { [env.proPriceId]: "PRO" }
      : {};
    return (priceId && priceToPlan[priceId]) || "PRO";
  }
  if (TERMINAL_STATUSES.has(stripeStatus)) return "FREE";
  return null;
}
```

Run: `npx vitest run tests/unit/stripe-plan.test.ts` → PASS.

- [ ] **Step 3: Usar no webhook** — em `app/api/stripe/webhook/route.ts`: importar `resolvePlanFromSubscription`; no case `customer.subscription.created/updated` trocar
`const plan = resolvePlan(subscription.status);` por
`const firstItem = subscription.items.data[0];` (mover a linha para cima) e
`const plan = resolvePlanFromSubscription(subscription.status, firstItem?.price.id);`
Apagar a função local `resolvePlan`.

- [ ] **Step 4: Regressão + commit** — `npx vitest run` → PASS; `npm run lint` → limpo.
`git add lib/stripe-plan.ts app/api/stripe/webhook/route.ts tests/unit/stripe-plan.test.ts && git commit -m "feat(planos): webhook resolve plano pelo priceId da assinatura"`

---

### Task 4: Preço da landing via `PLAN_PRICES`

**Files:**
- Modify: `components/landing/LandingPricing.tsx:75` e `:120-121`

- [ ] **Step 1: Usar a constante** — importar `PLAN_PRICES` de `@/lib/plan-limits`. No topo do componente:

```tsx
const [proPriceMain, proPriceCents] = PLAN_PRICES.PRO.split(",");
```

Linha 75 (FREE): `>R$ 0<` → `>{PLAN_PRICES.FREE}<`.
Linhas 120–121 (PRO):

```tsx
              <span className="font-fraunces text-5xl font-bold text-ink">{proPriceMain}</span>
              <span className="mb-2 font-fraunces text-2xl font-bold text-ink">,{proPriceCents}</span>
```

- [ ] **Step 2: Lint + commit** — `npm run lint` → limpo.
`git add components/landing/LandingPricing.tsx && git commit -m "refactor(planos): preco da landing vem de PLAN_PRICES"`

---

### Task 5: Snapshot como fonte primária do nome (2.2)

**Files:**
- Modify: `components/quote-request/QuoteRequestCard.tsx:36-39`; `components/quote-request/QuoteRequestDetails.tsx:60-63`; `app/u/[slug]/reserva/[requestId]/page.tsx:83-86` e `:119-121`
- Verificar (já devem ser snapshot-first): `app/proposta/[publicToken]/page.tsx:118`, `app/api/proposals/[id]/pdf/route.ts:83-84`, `app/(dashboard)/dashboard/propostas/nova/page.tsx:102`

- [ ] **Step 1: Inverter o fallback** nos quatro pontos, de
`quoteRequest.service?.name ?? quoteRequest.serviceNameSnapshot ?? ...` para
`quoteRequest.serviceNameSnapshot ?? quoteRequest.service?.name ?? ...`
(no card/details o terceiro termo `legacyService.serviceLabel` permanece; na
reserva permanecem `"Seu pedido"`/`"Reserva"`). Atualizar o comentário
adjacente: "Snapshot primeiro: o histórico conta a verdade da época do pedido."

- [ ] **Step 2: Conferir os três pontos já snapshot-first** e normalizar se algum preferir a relação.

- [ ] **Step 3: Regressão + commit** — `npx vitest run` → PASS.
`git add -A && git commit -m "feat(pedidos): snapshot do nome do item e a fonte primaria do historico"`

---

### Task 6: Hash no token de reset de senha (TDD)

**Files:**
- Create: `lib/auth/tokens.ts`
- Modify: `lib/auth/email-verification.ts:9-11` (delegar); `prisma/schema.prisma:77` (`token` → `tokenHash`); `lib/actions/auth.ts` (`requestPasswordReset:170-181`, `resetPassword:306-308`); `app/(auth)/redefinir-senha/[token]/page.tsx:18-21`
- Test: `tests/actions/auth.test.ts`

**Interfaces:**
- Produces: `hashToken(token: string): string` (SHA-256 hex) em `lib/auth/tokens.ts`.

- [ ] **Step 1: `lib/auth/tokens.ts` + delegação**

```ts
import crypto from "node:crypto";

// SHA-256 dos tokens de uso único (verificação de e-mail, reset de senha):
// vazamento do banco não permite usar os links.
export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}
```

Em `email-verification.ts`: `import { hashToken } from "@/lib/auth/tokens";` e
`export function hashEmailVerificationToken(token: string) { return hashToken(token); }`
(mantém o nome usado nos chamadores).

- [ ] **Step 2: Migração** — no schema, `token String @unique` → `tokenHash String @unique` no model `PasswordResetToken`. Depois:

```
npx prisma migrate dev --create-only --name hash_password_reset_token
```

Editar o SQL gerado para preservar a intenção (apagar pendentes + rename, sem drop/add):

```sql
DELETE FROM "PasswordResetToken";
ALTER TABLE "PasswordResetToken" RENAME COLUMN "token" TO "tokenHash";
ALTER INDEX "PasswordResetToken_token_key" RENAME TO "PasswordResetToken_tokenHash_key";
```

Então `npx prisma migrate dev` (aplica e gera o client).

- [ ] **Step 3: Testes que falham** (em `tests/actions/auth.test.ts`, junto ao describe de `requestPasswordReset`; conferir mocks do topo do arquivo — `db.passwordResetToken` já existe no `makePrismaMock`)

```ts
  it("grava o hash do token, nunca o token puro", async () => {
    db.user.findUnique.mockResolvedValue({
      id: "user-1",
      password: "hash",
      emailVerified: new Date()
    });
    const { requestPasswordReset } = await import("@/lib/actions/auth");

    await expect(
      requestPasswordReset(makeFormData({ email: "ana@example.com" }))
    ).rejects.toThrow("/esqueci-senha?sent=1");

    const createArg = db.passwordResetToken.create.mock.calls[0][0];
    expect(createArg.data.tokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(createArg.data.token).toBeUndefined();
  });
```

E no fluxo de reset (novo describe se não houver):

```ts
describe("resetPassword", () => {
  it("busca o token pelo hash", async () => {
    const { hashToken } = await import("@/lib/auth/tokens");
    db.passwordResetToken.findUnique.mockResolvedValue({
      userId: "user-1",
      expiresAt: new Date(Date.now() + 60_000)
    });
    db.user.update.mockResolvedValue({});
    db.passwordResetToken.deleteMany.mockResolvedValue({});
    const { resetPassword } = await import("@/lib/actions/auth");

    await expect(
      resetPassword(
        makeFormData({
          token: "tok-puro",
          password: "SenhaForte1",
          confirmPassword: "SenhaForte1"
        })
      )
    ).rejects.toThrow("/login?reset=1");

    expect(db.passwordResetToken.findUnique).toHaveBeenCalledWith({
      where: { tokenHash: hashToken("tok-puro") }
    });
  });
});
```

(Se o schema de senha exigir formato diferente, ajustar `SenhaForte1` ao
`resetPasswordSchema` de `lib/validations/auth.ts`.)

Run: `npx vitest run tests/actions/auth.test.ts` → FAIL nos dois novos.

- [ ] **Step 4: Implementar em `lib/actions/auth.ts`** — importar `hashToken`;
em `requestPasswordReset`, no `create`: `data: { userId: user.id, tokenHash: hashToken(token), expiresAt: ... }`
(o link continua com o `token` puro); em `resetPassword`:
`findUnique({ where: { tokenHash: hashToken(parsed.data.token) } })`.
Na página `redefinir-senha/[token]`: `findUnique({ where: { tokenHash: hashToken(token) }, select: { expiresAt: true } })`
(importar `hashToken`).

- [ ] **Step 5: Suite + commit** — `npx vitest run` → PASS; `npm run lint` → limpo.
`git add -A && git commit -m "feat(auth): token de reset de senha armazenado como hash"`

---

### Task 7: Reabrir reserva Pix expirada (TDD)

**Files:**
- Modify: `lib/actions/quote-requests.ts` (nova action), `lib/email.ts` (novo e-mail), `components/quote-request/QuoteRequestDetails.tsx` (botão no bloco expirado)
- Test: `tests/actions/quote-requests.test.ts`

**Interfaces:**
- Produces: `reopenPixReservation(formData: FormData): Promise<void>` (fields: `requestId`, `returnTo?`); `sendPixReservationReopenedEmail({ to, customerName, businessName, serviceName, amount, reservaUrl }): Promise<void>`.

- [ ] **Step 1: Testes que falham** — adicionar `sendPixReservationReopenedEmail: vi.fn()` ao mock de `@/lib/email` do arquivo, e:

```ts
describe("reopenPixReservation", () => {
  function mockProvider() {
    return vi.mocked(
      require("@/lib/actions/auth-guard").requireProviderProfile
    );
  }

  function setup(overrides: Record<string, unknown> = {}) {
    db.quoteRequest.findFirst.mockResolvedValue({
      id: "request-1",
      customerName: "Maria",
      customerEmail: "maria@example.com",
      serviceNameSnapshot: "Pintura",
      fixedServiceAmount: { toString: () => "500" },
      pixReservationRequestedAt: new Date(Date.now() - 72 * 60 * 60 * 1000),
      pixReservationPaidAt: null,
      provider: { slug: "vitriny", businessName: "Vitriny Serviços" },
      ...overrides
    });
    db.quoteRequest.update.mockResolvedValue({});
  }

  beforeEach(async () => {
    const { requireProviderProfile } = await import("@/lib/actions/auth-guard");
    vi.mocked(requireProviderProfile).mockResolvedValue({
      profile: { id: "profile-1", plan: "FREE", businessType: "SERVICES" },
      userId: "user-1"
    });
  });

  it("reabre reserva expirada com novo prazo e avisa o cliente", async () => {
    setup();
    const { sendPixReservationReopenedEmail } = await import("@/lib/email");
    const { reopenPixReservation } = await import(
      "@/lib/actions/quote-requests"
    );

    await expect(
      reopenPixReservation(makeFormData({ requestId: "request-1" }))
    ).rejects.toThrow("/dashboard/pedidos");

    expect(db.quoteRequest.update).toHaveBeenCalledWith({
      data: { pixReservationRequestedAt: expect.any(Date) },
      where: { id: "request-1" }
    });
    expect(sendPixReservationReopenedEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "maria@example.com",
        customerName: "Maria",
        reservaUrl: expect.stringContaining("/u/vitriny/reserva/request-1")
      })
    );
  });

  it("não reabre reserva dentro do prazo", async () => {
    setup({ pixReservationRequestedAt: new Date() });
    const { reopenPixReservation } = await import(
      "@/lib/actions/quote-requests"
    );

    await expect(
      reopenPixReservation(makeFormData({ requestId: "request-1" }))
    ).rejects.toThrow("/dashboard/pedidos");

    expect(db.quoteRequest.update).not.toHaveBeenCalled();
  });

  it("não reabre reserva já paga", async () => {
    setup({ pixReservationPaidAt: new Date() });
    const { reopenPixReservation } = await import(
      "@/lib/actions/quote-requests"
    );

    await expect(
      reopenPixReservation(makeFormData({ requestId: "request-1" }))
    ).rejects.toThrow("/dashboard/pedidos");

    expect(db.quoteRequest.update).not.toHaveBeenCalled();
  });

  it("rejeita pedido de outro provider", async () => {
    db.quoteRequest.findFirst.mockResolvedValue(null);
    const { reopenPixReservation } = await import(
      "@/lib/actions/quote-requests"
    );

    await expect(
      reopenPixReservation(makeFormData({ requestId: "alheio" }))
    ).rejects.toThrow("/dashboard/pedidos?error=not-found");

    expect(db.quoteRequest.update).not.toHaveBeenCalled();
  });
});
```

(Remover o helper `mockProvider` se não usado — o `beforeEach` cobre.)

Run: `npx vitest run tests/actions/quote-requests.test.ts` → FAIL.

- [ ] **Step 2: E-mail em `lib/email.ts`**

```ts
type PixReservationReopenedEmailInput = {
  to: string;
  customerName: string;
  businessName: string;
  serviceName?: string | null;
  amount: string;
  reservaUrl: string;
};

export async function sendPixReservationReopenedEmail({
  to,
  customerName,
  businessName,
  serviceName,
  amount,
  reservaUrl
}: PixReservationReopenedEmailInput) {
  await sendAppEmail({
    to,
    subject: "Prazo de pagamento renovado — Vitriny",
    preview: `${businessName} renovou o prazo do seu pagamento Pix.`,
    html: [
      paragraph(`Olá, ${customerName}.`),
      paragraph(
        serviceName
          ? `${businessName} renovou o prazo do pagamento Pix de ${amount} referente ao item ${serviceName}. Você tem mais 48 horas.`
          : `${businessName} renovou o prazo do seu pagamento Pix de ${amount}. Você tem mais 48 horas.`
      ),
      emailButton("Pagar agora", reservaUrl)
    ].join("")
  });
}
```

- [ ] **Step 3: Action em `lib/actions/quote-requests.ts`**

```ts
export async function reopenPixReservation(formData: FormData) {
  const { profile } = await requireProviderProfile();
  const returnTo = resolveQuoteRequestReturnPath(formData.get("returnTo"));
  if (!profile) redirect(`${returnTo}?error=profile`);

  const requestId = String(formData.get("requestId") ?? "");
  if (!requestId) redirect(`${returnTo}?error=not-found`);

  const quoteRequest = await prisma.quoteRequest.findFirst({
    where: { id: requestId, providerId: profile.id },
    select: {
      id: true,
      customerName: true,
      customerEmail: true,
      serviceNameSnapshot: true,
      fixedServiceAmount: true,
      pixReservationRequestedAt: true,
      pixReservationPaidAt: true,
      provider: { select: { slug: true, businessName: true } }
    }
  });

  if (!quoteRequest?.pixReservationRequestedAt) {
    redirect(`${returnTo}?error=not-found`);
  }

  // Só reserva expirada e não paga ganha novo prazo; nos demais estados o
  // clique é no-op (idempotência).
  if (
    quoteRequest.pixReservationPaidAt ||
    !isPixPaymentExpired(quoteRequest.pixReservationRequestedAt)
  ) {
    redirect(returnTo);
  }

  await prisma.quoteRequest.update({
    where: { id: quoteRequest.id },
    data: { pixReservationRequestedAt: new Date() }
  });

  const customerEmail = quoteRequest.customerEmail;
  const amount = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(Number(quoteRequest.fixedServiceAmount ?? 0));
  const reservaUrl = appUrl(
    `/u/${quoteRequest.provider.slug}/reserva/${quoteRequest.id}`
  );

  after(async () => {
    if (!customerEmail) return;
    try {
      await sendPixReservationReopenedEmail({
        to: customerEmail,
        customerName: quoteRequest.customerName,
        businessName: quoteRequest.provider.businessName,
        serviceName: quoteRequest.serviceNameSnapshot,
        amount,
        reservaUrl
      });
    } catch (error) {
      console.error("Falha ao enviar e-mail de prazo renovado.", {
        error,
        quoteRequestId: quoteRequest.id
      });
    }
  });

  revalidatePath("/dashboard/pedidos");
  revalidatePath("/dashboard/pedidos/[id]", "page");
  redirect(returnTo);
}
```

(adicionar `sendPixReservationReopenedEmail` ao import de `@/lib/email`)

- [ ] **Step 4: Botão no bloco expirado do `QuoteRequestDetails`** — substituir o parágrafo "Você pode encerrar este pedido via alteração de status." por:

```tsx
                  <p className="mt-1 text-xs text-ink-muted">
                    Gere um novo prazo de 48h para o cliente pagar, ou encerre
                    o pedido via alteração de status.
                  </p>
                  <form action={reopenPixReservation} className="mt-2">
                    <input type="hidden" name="requestId" value={quoteRequest.id} />
                    {returnTo ? (
                      <input type="hidden" name="returnTo" value={returnTo} />
                    ) : null}
                    <button
                      type="submit"
                      className="inline-flex min-h-8 items-center justify-center rounded-md border border-leaf bg-white px-3 text-xs font-semibold text-leaf transition hover:bg-mint"
                    >
                      Gerar novo prazo
                    </button>
                  </form>
```

(adicionar `reopenPixReservation` ao import de `@/lib/actions/quote-requests`)

- [ ] **Step 5: Suite + commit** — `npx vitest run` → PASS; `npm run lint` → limpo.
`git add -A && git commit -m "feat(pix): reabrir reserva expirada com novo prazo e aviso ao cliente"`

---

### Task 8: Verificação final do plano A

- [ ] `npx vitest run` → PASS; `npm run lint` → limpo; `npm run build` → sem erros.
- [ ] Manual (dev): trocar tema como FREE continua bloqueado; upload de imagem FREE continua 403; preço na landing inalterado visualmente; reset de senha funciona ponta a ponta (pedir → e-mail → redefinir); botão "Gerar novo prazo" aparece só em reserva expirada.
