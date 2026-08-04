# Pix único da assinatura PRO via Mercado Pago — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir que o prestador pague 1 mês de PRO via Pix gerado pela Mercado Pago (Payments API), com QR na hora, confirmação automática por webhook e liberação de 30 dias — sem confirmação manual do admin.

**Architecture:** Uma server action cria um pagamento Pix na MP e persiste uma linha em `ProPixPayment` (reusando a tabela existente, com `mpPaymentId`/`expiresAt` novos). O webhook `payment` da MP concede os 30 dias via um helper idempotente compartilhado. O modal na UI faz polling de uma action de status (lê só o banco) e vira "confirmado" sozinho. Nenhuma env nova.

**Tech Stack:** Next.js (App Router, server actions), Prisma/PostgreSQL, SDK `mercadopago` (Node), Vitest, TypeScript, Tailwind.

Spec: `docs/superpowers/specs/2026-08-04-pix-unico-mercado-pago-design.md`

---

## File Structure

- `prisma/schema.prisma` — +2 colunas em `ProPixPayment`.
- `lib/pro-pix.ts` (novo) — `nextProPeriodEnd()` (cálculo puro do fim do período) + `grantProPixPeriodFromMp()` (concessão idempotente para o webhook).
- `lib/actions/admin-pix-payments.ts` — passa a usar `nextProPeriodEnd()` (DRY, comportamento inalterado).
- `lib/actions/mp-billing.ts` — +`createMpPixPayment()` e +`getMpPixPaymentStatus()`.
- `app/api/mercadopago/webhook/route.ts` — ramo `payment` passa a confirmar Pix único.
- `components/billing/MpPixPaymentModal.tsx` (novo) — QR + polling + contagem regressiva.
- `components/billing/BillingCard.tsx` — botão "Pagar 1 mês via Pix".
- `app/(dashboard)/dashboard/billing/page.tsx` — passa `mpPixAvailable`.
- `tests/helpers.ts` — mock de `proPixPayment` ganha `findUnique` + `updateMany`.
- Testes: `tests/unit/pro-pix.test.ts` (novo), `tests/actions/mp-billing.test.ts`, `tests/api/mercadopago-webhook.test.ts`.

---

## Task 1: Migration — `ProPixPayment` ganha `mpPaymentId` e `expiresAt`

**Files:**
- Modify: `prisma/schema.prisma` (bloco `model ProPixPayment`)

- [ ] **Step 1: Adicionar as colunas ao schema**

No bloco `model ProPixPayment`, adicionar as duas linhas antes de `updatedAt`:

```prisma
model ProPixPayment {
  id                String    @id @default(cuid())
  providerProfileId String
  amount            Decimal   @db.Decimal(10, 2)
  requestedAt       DateTime  @default(now())
  clientPaidAt      DateTime?
  confirmedAt       DateTime?
  mpPaymentId       String?   @unique
  expiresAt         DateTime?
  updatedAt         DateTime  @updatedAt

  providerProfile ProviderProfile @relation(fields: [providerProfileId], references: [id], onDelete: Cascade)

  @@index([providerProfileId])
}
```

- [ ] **Step 2: Gerar a migration**

Run: `npm run prisma:migrate -- --name pro_pix_mp_payment`
Expected: cria `prisma/migrations/<timestamp>_pro_pix_mp_payment/` e regenera o client sem erro. As colunas são nulas, sem backfill.

- [ ] **Step 3: Commit**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat(db): ProPixPayment ganha mpPaymentId e expiresAt para Pix via MP"
```

---

## Task 2: Helper compartilhado de concessão — `lib/pro-pix.ts`

**Files:**
- Create: `lib/pro-pix.ts`
- Modify: `tests/helpers.ts:87-92` (mock `proPixPayment`)
- Modify: `lib/actions/admin-pix-payments.ts:10,43-48` (usar `nextProPeriodEnd`)
- Test: `tests/unit/pro-pix.test.ts`

- [ ] **Step 1: Adicionar `findUnique` e `updateMany` ao mock de `proPixPayment`**

Em `tests/helpers.ts`, trocar o bloco `proPixPayment` por:

```typescript
    proPixPayment: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn()
    },
```

- [ ] **Step 2: Escrever o teste do helper (falhando)**

Criar `tests/unit/pro-pix.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { makePrismaMock, type PrismaMock } from "../helpers";

vi.mock("@/lib/prisma", () => ({ prisma: {} }));

let db: PrismaMock;

beforeEach(async () => {
  vi.resetModules();
  const prismaModule = await import("@/lib/prisma");
  db = makePrismaMock();
  Object.assign(prismaModule.prisma, db);
});

describe("nextProPeriodEnd", () => {
  it("estende a partir de agora quando já venceu", async () => {
    const { nextProPeriodEnd } = await import("@/lib/pro-pix");
    const now = new Date("2026-08-04T00:00:00.000Z");
    const result = nextProPeriodEnd(new Date("2020-01-01T00:00:00.000Z"), now);
    expect(result).toEqual(new Date("2026-09-03T00:00:00.000Z"));
  });

  it("estende a partir do que resta quando ainda não venceu", async () => {
    const { nextProPeriodEnd } = await import("@/lib/pro-pix");
    const now = new Date("2026-08-04T00:00:00.000Z");
    const future = new Date("2026-08-20T00:00:00.000Z");
    const result = nextProPeriodEnd(future, now);
    expect(result).toEqual(new Date("2026-09-19T00:00:00.000Z"));
  });

  it("usa agora quando currentPeriodEnd é null", async () => {
    const { nextProPeriodEnd } = await import("@/lib/pro-pix");
    const now = new Date("2026-08-04T00:00:00.000Z");
    expect(nextProPeriodEnd(null, now)).toEqual(new Date("2026-09-03T00:00:00.000Z"));
  });
});

describe("grantProPixPeriodFromMp", () => {
  it("retorna not_found quando o pagamento não existe", async () => {
    db.proPixPayment.findUnique.mockResolvedValue(null);
    const { grantProPixPeriodFromMp } = await import("@/lib/pro-pix");
    expect(await grantProPixPeriodFromMp("pix-x")).toBe("not_found");
    expect(db.proPixPayment.updateMany).not.toHaveBeenCalled();
  });

  it("retorna already quando já confirmado", async () => {
    db.proPixPayment.findUnique.mockResolvedValue({
      id: "pix-1", providerProfileId: "profile-1", confirmedAt: new Date("2026-01-01")
    });
    const { grantProPixPeriodFromMp } = await import("@/lib/pro-pix");
    expect(await grantProPixPeriodFromMp("pix-1")).toBe("already");
    expect(db.proPixPayment.updateMany).not.toHaveBeenCalled();
  });

  it("concede 30 dias e ativa PRO", async () => {
    db.proPixPayment.findUnique.mockResolvedValue({
      id: "pix-1", providerProfileId: "profile-1", confirmedAt: null
    });
    db.proPixPayment.updateMany.mockResolvedValue({ count: 1 });
    db.providerProfile.findUnique.mockResolvedValue({ currentPeriodEnd: null });
    db.providerProfile.update.mockResolvedValue({});

    const { grantProPixPeriodFromMp } = await import("@/lib/pro-pix");
    expect(await grantProPixPeriodFromMp("pix-1")).toBe("granted");

    expect(db.proPixPayment.updateMany).toHaveBeenCalledWith({
      where: { id: "pix-1", confirmedAt: null },
      data: { confirmedAt: expect.any(Date) }
    });
    const call = db.providerProfile.update.mock.calls[0][0];
    expect(call.where).toEqual({ id: "profile-1" });
    expect(call.data.plan).toBe("PRO");
    expect(call.data.currentPeriodEnd.getTime()).toBeGreaterThan(Date.now());
  });

  it("retorna already quando a trava atômica perde a corrida (count 0)", async () => {
    db.proPixPayment.findUnique.mockResolvedValue({
      id: "pix-1", providerProfileId: "profile-1", confirmedAt: null
    });
    db.proPixPayment.updateMany.mockResolvedValue({ count: 0 });

    const { grantProPixPeriodFromMp } = await import("@/lib/pro-pix");
    expect(await grantProPixPeriodFromMp("pix-1")).toBe("already");
    expect(db.providerProfile.update).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 3: Rodar o teste (deve falhar)**

Run: `npm test -- tests/unit/pro-pix.test.ts`
Expected: FAIL — `Cannot find module '@/lib/pro-pix'`.

- [ ] **Step 4: Implementar `lib/pro-pix.ts`**

```typescript
import { prisma } from "@/lib/prisma";

export const PRO_PERIOD_DAYS = 30;

const PERIOD_MS = PRO_PERIOD_DAYS * 24 * 60 * 60 * 1000;

/**
 * Fim do próximo período PRO. Renovar antes de vencer não perde os dias que
 * já restavam: a base é o maior entre agora e o vencimento atual.
 */
export function nextProPeriodEnd(currentPeriodEnd: Date | null, now: Date): Date {
  const base = currentPeriodEnd && currentPeriodEnd > now ? currentPeriodEnd : now;
  return new Date(base.getTime() + PERIOD_MS);
}

export type GrantResult = "granted" | "already" | "not_found";

/**
 * Concede 30 dias de PRO a partir de um ProPixPayment já pago na MP.
 * Idempotente: a trava atômica (updateMany where confirmedAt=null) garante que
 * webhooks reentregues/concorrentes não estendem o período duas vezes.
 */
export async function grantProPixPeriodFromMp(
  proPixPaymentId: string
): Promise<GrantResult> {
  const payment = await prisma.proPixPayment.findUnique({
    where: { id: proPixPaymentId },
    select: { id: true, providerProfileId: true, confirmedAt: true }
  });

  if (!payment) return "not_found";
  if (payment.confirmedAt) return "already";

  const now = new Date();

  const claimed = await prisma.proPixPayment.updateMany({
    where: { id: payment.id, confirmedAt: null },
    data: { confirmedAt: now }
  });
  if (claimed.count === 0) return "already";

  const profile = await prisma.providerProfile.findUnique({
    where: { id: payment.providerProfileId },
    select: { currentPeriodEnd: true }
  });

  await prisma.providerProfile.update({
    where: { id: payment.providerProfileId },
    data: {
      plan: "PRO",
      currentPeriodEnd: nextProPeriodEnd(profile?.currentPeriodEnd ?? null, now)
    }
  });

  return "granted";
}
```

- [ ] **Step 5: Rodar o teste (deve passar)**

Run: `npm test -- tests/unit/pro-pix.test.ts`
Expected: PASS (todos os casos).

- [ ] **Step 6: Refatorar o admin para usar `nextProPeriodEnd` (DRY)**

Em `lib/actions/admin-pix-payments.ts`, adicionar o import no topo (após os imports existentes):

```typescript
import { nextProPeriodEnd } from "@/lib/pro-pix";
```

E substituir o cálculo inline dentro de `confirmProPixPayment` (as linhas que definem `const base = ...` e `const currentPeriodEnd = new Date(base.getTime() + ...)`) por:

```typescript
  const now = new Date();
  const currentPeriodEnd = nextProPeriodEnd(profile.currentPeriodEnd, now);
```

Manter o resto (findFirst, guard `confirmedAt`, os dois updates) exatamente como está. Remover a constante `PRO_PERIOD_DAYS` local se ela ficar sem uso.

- [ ] **Step 7: Rodar os testes do admin (não devem quebrar)**

Run: `npm test -- tests/actions/admin-pix-payments.test.ts tests/unit/pro-pix.test.ts`
Expected: PASS em ambos.

- [ ] **Step 8: Commit**

```bash
git add lib/pro-pix.ts tests/unit/pro-pix.test.ts tests/helpers.ts lib/actions/admin-pix-payments.ts
git commit -m "feat: helper idempotente de concessao de periodo PRO por Pix"
```

---

## Task 3: Actions `createMpPixPayment` e `getMpPixPaymentStatus`

**Files:**
- Modify: `lib/actions/mp-billing.ts`
- Test: `tests/actions/mp-billing.test.ts`

- [ ] **Step 1: Estender os mocks do teste**

Em `tests/actions/mp-billing.test.ts`, ampliar o mock do SDK (topo do arquivo) para incluir `Payment`:

```typescript
const preApprovalCreate = vi.fn();
const preApprovalUpdate = vi.fn();
const paymentCreate = vi.fn();
const paymentGet = vi.fn();
vi.mock("mercadopago", () => ({
  MercadoPagoConfig: vi.fn(),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  PreApproval: vi.fn(function (this: any) { this.create = preApprovalCreate; this.update = preApprovalUpdate; }),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Payment: vi.fn(function (this: any) { this.create = paymentCreate; this.get = paymentGet; })
}));
```

E ampliar o mock do prisma para incluir `proPixPayment`:

```typescript
const findUnique = vi.fn();
const update = vi.fn();
const updateMany = vi.fn();
const proPixCreate = vi.fn();
const proPixFindFirst = vi.fn();
const proPixFindUnique = vi.fn();
const proPixUpdate = vi.fn();
vi.mock("@/lib/prisma", () => ({
  prisma: {
    providerProfile: { findUnique, update, updateMany },
    proPixPayment: {
      create: proPixCreate,
      findFirst: proPixFindFirst,
      findUnique: proPixFindUnique,
      update: proPixUpdate
    }
  }
}));
```

No `beforeEach`, resetar os novos mocks e garantir o token:

```typescript
  paymentCreate.mockReset();
  paymentGet.mockReset();
  proPixCreate.mockReset();
  proPixFindFirst.mockReset();
  proPixFindUnique.mockReset();
  proPixUpdate.mockReset();
  process.env.MP_ACCESS_TOKEN = "TEST-token";
```

- [ ] **Step 2: Escrever os testes das novas actions (falhando)**

Adicionar ao final de `tests/actions/mp-billing.test.ts`:

```typescript
describe("createMpPixPayment", () => {
  it("cria pagamento Pix na MP e retorna QR", async () => {
    findUnique.mockResolvedValue({
      id: "p1", plan: "FREE", mpPreapprovalId: null, stripeSubscriptionId: null, cancelAtPeriodEnd: false
    });
    proPixFindFirst.mockResolvedValue(null);
    proPixCreate.mockResolvedValue({ id: "row-1" });
    paymentCreate.mockResolvedValue({
      id: 12345,
      status: "pending",
      point_of_interaction: {
        transaction_data: { qr_code: "COPIA-E-COLA", qr_code_base64: "BASE64PNG" }
      }
    });
    proPixUpdate.mockResolvedValue({});

    const { createMpPixPayment } = await import("@/lib/actions/mp-billing");
    const result = await createMpPixPayment("payer@test.com");

    expect(result).toEqual({
      qrCode: "COPIA-E-COLA",
      qrCodeBase64: "BASE64PNG",
      paymentId: "row-1",
      expiresAt: expect.any(String)
    });
    expect(paymentCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.objectContaining({
          transaction_amount: 19.9,
          payment_method_id: "pix",
          payer: { email: "payer@test.com" },
          external_reference: "p1",
          metadata: { pro_pix_payment_id: "row-1" }
        }),
        requestOptions: { idempotencyKey: "row-1" }
      })
    );
    expect(proPixUpdate).toHaveBeenCalledWith({
      where: { id: "row-1" },
      data: { mpPaymentId: "12345", expiresAt: expect.any(Date) }
    });
  });

  it("reaproveita o pendente não-expirado em vez de criar outro", async () => {
    findUnique.mockResolvedValue({
      id: "p1", plan: "FREE", mpPreapprovalId: null, stripeSubscriptionId: null, cancelAtPeriodEnd: false
    });
    proPixFindFirst.mockResolvedValue({
      id: "row-old", mpPaymentId: "999", expiresAt: new Date(Date.now() + 60_000)
    });
    paymentGet.mockResolvedValue({
      id: 999,
      point_of_interaction: {
        transaction_data: { qr_code: "OLD-COPIA", qr_code_base64: "OLD-BASE64" }
      }
    });

    const { createMpPixPayment } = await import("@/lib/actions/mp-billing");
    const result = await createMpPixPayment("payer@test.com");

    expect(result).toEqual({
      qrCode: "OLD-COPIA",
      qrCodeBase64: "OLD-BASE64",
      paymentId: "row-old",
      expiresAt: expect.any(String)
    });
    expect(paymentCreate).not.toHaveBeenCalled();
    expect(paymentGet).toHaveBeenCalledWith({ id: "999" });
  });

  it("bloqueia quem já é PRO", async () => {
    findUnique.mockResolvedValue({
      id: "p1", plan: "PRO", mpPreapprovalId: "sub-1", stripeSubscriptionId: null, cancelAtPeriodEnd: false
    });

    const { createMpPixPayment } = await import("@/lib/actions/mp-billing");
    const result = await createMpPixPayment("payer@test.com");

    expect("error" in result).toBe(true);
    expect(paymentCreate).not.toHaveBeenCalled();
  });

  it("rejeita email inválido antes de chamar a MP", async () => {
    findUnique.mockResolvedValue({
      id: "p1", plan: "FREE", mpPreapprovalId: null, stripeSubscriptionId: null, cancelAtPeriodEnd: false
    });
    proPixFindFirst.mockResolvedValue(null);

    const { createMpPixPayment } = await import("@/lib/actions/mp-billing");
    const result = await createMpPixPayment("email-invalido");

    expect(result).toEqual({ error: "Confira o e-mail do pagador." });
    expect(paymentCreate).not.toHaveBeenCalled();
  });
});

describe("getMpPixPaymentStatus", () => {
  it("retorna confirmed quando confirmedAt está preenchido", async () => {
    findUnique.mockResolvedValue({ id: "p1" });
    proPixFindFirst.mockResolvedValue({
      id: "row-1", confirmedAt: new Date(), expiresAt: new Date(Date.now() + 60_000)
    });

    const { getMpPixPaymentStatus } = await import("@/lib/actions/mp-billing");
    expect(await getMpPixPaymentStatus("row-1")).toEqual({ status: "confirmed" });
  });

  it("retorna expired quando passou o expiresAt sem confirmar", async () => {
    findUnique.mockResolvedValue({ id: "p1" });
    proPixFindFirst.mockResolvedValue({
      id: "row-1", confirmedAt: null, expiresAt: new Date(Date.now() - 1000)
    });

    const { getMpPixPaymentStatus } = await import("@/lib/actions/mp-billing");
    expect(await getMpPixPaymentStatus("row-1")).toEqual({ status: "expired" });
  });

  it("retorna pending caso contrário", async () => {
    findUnique.mockResolvedValue({ id: "p1" });
    proPixFindFirst.mockResolvedValue({
      id: "row-1", confirmedAt: null, expiresAt: new Date(Date.now() + 60_000)
    });

    const { getMpPixPaymentStatus } = await import("@/lib/actions/mp-billing");
    expect(await getMpPixPaymentStatus("row-1")).toEqual({ status: "pending" });
  });
});
```

- [ ] **Step 3: Rodar (deve falhar)**

Run: `npm test -- tests/actions/mp-billing.test.ts`
Expected: FAIL — `createMpPixPayment` / `getMpPixPaymentStatus` não existem.

- [ ] **Step 4: Implementar as actions em `lib/actions/mp-billing.ts`**

No topo, ampliar o import do SDK e adicionar o import do prisma nativo (já existe `prisma`), e um tipo de expiração:

```typescript
import { PreApproval, Payment } from "mercadopago";
```

Adicionar as duas actions (por ex. após `createMpPixSubscription`):

```typescript
const PIX_EXPIRATION_MINUTES = 30;

type MpPixQr = { qrCode: string; qrCodeBase64: string; paymentId: string; expiresAt: string };

export async function createMpPixPayment(
  payerEmail: string
): Promise<MpPixQr | { error: string }> {
  const loaded = await loadSubscribableProfile();
  if ("error" in loaded) return loaded;
  const { profile } = loaded;

  const amount = proAmount();
  if (amount === null) return { error: "Valor do plano não configurado." };

  if (!payerEmailSchema.safeParse(payerEmail).success) {
    return { error: "Confira o e-mail do pagador." };
  }
  const normalizedEmail = payerEmail.trim().toLowerCase();

  const payment = new Payment(getMercadoPago());

  // Idempotência: reaproveita um Pix pendente não-expirado em vez de gerar outro.
  const pending = await prisma.proPixPayment.findFirst({
    where: {
      providerProfileId: profile.id,
      confirmedAt: null,
      mpPaymentId: { not: null },
      expiresAt: { gt: new Date() }
    },
    orderBy: { requestedAt: "desc" }
  });

  if (pending?.mpPaymentId && pending.expiresAt) {
    try {
      const existing = await payment.get({ id: pending.mpPaymentId });
      const data = existing.point_of_interaction?.transaction_data;
      if (data?.qr_code && data.qr_code_base64) {
        return {
          qrCode: data.qr_code,
          qrCodeBase64: data.qr_code_base64,
          paymentId: pending.id,
          expiresAt: pending.expiresAt.toISOString()
        };
      }
    } catch (error) {
      console.error("Falha ao rebuscar Pix pendente na MP; criando novo.", {
        profileId: profile.id,
        errorMessage: error instanceof Error ? error.message : "Erro desconhecido"
      });
    }
  }

  const row = await prisma.proPixPayment.create({
    data: { providerProfileId: profile.id, amount: amount.toFixed(2) }
  });

  const expiresAt = new Date(Date.now() + PIX_EXPIRATION_MINUTES * 60 * 1000);

  let created;
  try {
    created = await payment.create({
      body: {
        transaction_amount: amount,
        description: "Vitriny PRO",
        payment_method_id: "pix",
        payer: { email: normalizedEmail },
        external_reference: profile.id,
        date_of_expiration: expiresAt.toISOString(),
        metadata: { pro_pix_payment_id: row.id }
      },
      requestOptions: { idempotencyKey: row.id }
    });
  } catch (error) {
    console.error("Erro ao criar pagamento Pix Mercado Pago.", {
      profileId: profile.id,
      errorMessage: error instanceof Error ? error.message : "Erro desconhecido"
    });
    return { error: "Não foi possível gerar o Pix agora. Tente novamente." };
  }

  const data = created.point_of_interaction?.transaction_data;
  if (!created.id || !data?.qr_code || !data.qr_code_base64) {
    console.error("Pagamento Pix Mercado Pago sem QR na resposta.", {
      profileId: profile.id,
      paymentId: created?.id ?? null
    });
    return { error: "Não foi possível gerar o Pix agora. Tente novamente." };
  }

  await prisma.proPixPayment.update({
    where: { id: row.id },
    data: { mpPaymentId: String(created.id), expiresAt }
  });

  return {
    qrCode: data.qr_code,
    qrCodeBase64: data.qr_code_base64,
    paymentId: row.id,
    expiresAt: expiresAt.toISOString()
  };
}

export async function getMpPixPaymentStatus(
  paymentRowId: string
): Promise<{ status: "pending" | "confirmed" | "expired" } | { error: string }> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Não autenticado." };

  const profile = await prisma.providerProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true }
  });
  if (!profile) return { error: "Dados do negócio não encontrados." };

  const row = await prisma.proPixPayment.findFirst({
    where: { id: paymentRowId, providerProfileId: profile.id },
    select: { confirmedAt: true, expiresAt: true }
  });
  if (!row) return { error: "Pagamento não encontrado." };

  if (row.confirmedAt) return { status: "confirmed" };
  if (row.expiresAt && row.expiresAt.getTime() < Date.now()) return { status: "expired" };
  return { status: "pending" };
}
```

> Nota: `amount` é `number` (ex. `19.9`) para a MP; a coluna `amount` do Prisma é `Decimal`, então persistimos `amount.toFixed(2)` na criação da row.

- [ ] **Step 5: Rodar (deve passar)**

Run: `npm test -- tests/actions/mp-billing.test.ts`
Expected: PASS (novos describes + os antigos de card/subscription intactos).

- [ ] **Step 6: Commit**

```bash
git add lib/actions/mp-billing.ts tests/actions/mp-billing.test.ts
git commit -m "feat: actions de Pix unico via Mercado Pago (criar + status)"
```

---

## Task 4: Webhook confirma o Pix único

**Files:**
- Modify: `app/api/mercadopago/webhook/route.ts:109-124`
- Test: `tests/api/mercadopago-webhook.test.ts`

- [ ] **Step 1: Estender os mocks do teste do webhook**

Em `tests/api/mercadopago-webhook.test.ts`, adicionar um mock de `@/lib/pro-pix` no topo (junto dos outros `vi.mock`):

```typescript
const grantProPixPeriodFromMp = vi.fn();
vi.mock("@/lib/pro-pix", () => ({ grantProPixPeriodFromMp }));
```

No `beforeEach`, resetar: `grantProPixPeriodFromMp.mockReset();` e `grantProPixPeriodFromMp.mockResolvedValue("granted");`

- [ ] **Step 2: Escrever os testes do ramo Pix único (falhando)**

Adicionar dentro do `describe("POST /api/mercadopago/webhook", ...)`:

```typescript
  it("payment aprovado de Pix único concede 30 dias via helper", async () => {
    paymentGet.mockResolvedValue({
      id: "payment-9",
      status: "approved",
      metadata: { pro_pix_payment_id: "row-1" },
      external_reference: "profile-1"
    });

    const { POST } = await import("@/app/api/mercadopago/webhook/route");
    const response = await POST(makeRequest({ type: "payment", data: { id: "payment-9" } }));

    expect(response.status).toBe(200);
    expect(grantProPixPeriodFromMp).toHaveBeenCalledWith("row-1");
    expect(preApprovalGet).not.toHaveBeenCalled();
  });

  it("payment de Pix único ainda não aprovado não concede", async () => {
    paymentGet.mockResolvedValue({
      id: "payment-9",
      status: "pending",
      metadata: { pro_pix_payment_id: "row-1" },
      external_reference: "profile-1"
    });

    const { POST } = await import("@/app/api/mercadopago/webhook/route");
    const response = await POST(makeRequest({ type: "payment", data: { id: "payment-9" } }));

    expect(response.status).toBe(200);
    expect(grantProPixPeriodFromMp).not.toHaveBeenCalled();
  });
```

> O teste existente "payment sem preapproval_id no metadata e ignorado" continua válido: seu `metadata` é `{}` (sem `pro_pix_payment_id`), então nem o ramo de assinatura nem o de Pix único agem.

- [ ] **Step 3: Rodar (deve falhar)**

Run: `npm test -- tests/api/mercadopago-webhook.test.ts`
Expected: FAIL — `grantProPixPeriodFromMp` não é chamado (ramo ainda não existe).

- [ ] **Step 4: Implementar o ramo no webhook**

Em `app/api/mercadopago/webhook/route.ts`, adicionar o import:

```typescript
import { grantProPixPeriodFromMp } from "@/lib/pro-pix";
```

E no ramo `if (body.type === "subscription_authorized_payment" || body.type === "payment")`, logo após obter `paymentResource` e antes do bloco atual de `preapprovalId`, inserir:

```typescript
      // Pix único (Payments API): pagamento avulso que carrega o id da nossa
      // row em metadata. Confirmação automática, sem preapproval.
      const proPixPaymentId =
        typeof paymentResource.metadata?.pro_pix_payment_id === "string"
          ? paymentResource.metadata.pro_pix_payment_id
          : null;

      if (proPixPaymentId) {
        if (paymentResource.status === "approved") {
          await grantProPixPeriodFromMp(proPixPaymentId);
        }
        return new Response(null, { status: 200 });
      }
```

O restante do ramo (`preapprovalId`, `syncPreapproval`) fica inalterado.

- [ ] **Step 5: Rodar (deve passar)**

Run: `npm test -- tests/api/mercadopago-webhook.test.ts`
Expected: PASS (novos casos + todos os antigos de assinatura).

- [ ] **Step 6: Commit**

```bash
git add app/api/mercadopago/webhook/route.ts tests/api/mercadopago-webhook.test.ts
git commit -m "feat: webhook MP confirma Pix unico e libera 30 dias"
```

---

## Task 5: UI — modal, botão e prop da página

**Files:**
- Create: `components/billing/MpPixPaymentModal.tsx`
- Modify: `components/billing/BillingCard.tsx`
- Modify: `app/(dashboard)/dashboard/billing/page.tsx:55,136`

- [ ] **Step 1: Criar `components/billing/MpPixPaymentModal.tsx`**

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

import { CopyButton } from "@/components/ui/CopyButton";
import { getMpPixPaymentStatus } from "@/lib/actions/mp-billing";

type MpPixPaymentModalProps = {
  qrCode: string;
  qrCodeBase64: string;
  paymentId: string;
  expiresAt: string;
  onClose: () => void;
  onRegenerate: () => void;
};

function formatRemaining(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function MpPixPaymentModal({
  qrCode,
  qrCodeBase64,
  paymentId,
  expiresAt,
  onClose,
  onRegenerate
}: MpPixPaymentModalProps) {
  const router = useRouter();
  const expiryMs = new Date(expiresAt).getTime();
  const [status, setStatus] = useState<"pending" | "confirmed" | "expired">("pending");
  const [remaining, setRemaining] = useState(() => expiryMs - Date.now());
  const confirmedRef = useRef(false);

  // Polling do status: o webhook é quem confirma; aqui só lemos o banco.
  useEffect(() => {
    if (status !== "pending") return;
    const interval = setInterval(async () => {
      const result = await getMpPixPaymentStatus(paymentId);
      if ("error" in result) return;
      if (result.status === "confirmed" && !confirmedRef.current) {
        confirmedRef.current = true;
        setStatus("confirmed");
        router.refresh();
      } else if (result.status === "expired") {
        setStatus("expired");
      }
    }, 4000);
    return () => clearInterval(interval);
  }, [status, paymentId, router]);

  // Contagem regressiva local.
  useEffect(() => {
    if (status !== "pending") return;
    const tick = setInterval(() => {
      const left = expiryMs - Date.now();
      setRemaining(left);
      if (left <= 0) setStatus("expired");
    }, 1000);
    return () => clearInterval(tick);
  }, [status, expiryMs]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="mp-pix-modal-title"
        tabIndex={-1}
        onKeyDown={(e) => e.key === "Escape" && onClose()}
        className="w-full max-w-md rounded-xl border border-paper-soft bg-white p-6 shadow-card"
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 id="mp-pix-modal-title" className="font-fraunces text-xl font-bold text-ink">
            Pagar 1 mês via Pix
          </h2>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="flex h-8 w-8 items-center justify-center rounded-md text-ink-muted transition hover:bg-paper hover:text-ink"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {status === "confirmed" ? (
          <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3">
            <p className="text-sm font-semibold text-green-800">
              Pagamento confirmado! Seu plano PRO já está ativo.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-4 inline-flex min-h-9 items-center justify-center rounded-md bg-leaf px-4 text-xs font-semibold text-white transition hover:bg-leaf-hover"
            >
              Fechar
            </button>
          </div>
        ) : status === "expired" ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
            <p className="text-sm font-semibold text-amber-800">
              O QR expirou. Gere um novo Pix para pagar.
            </p>
            <button
              type="button"
              onClick={onRegenerate}
              className="mt-4 inline-flex min-h-9 items-center justify-center rounded-md bg-leaf px-4 text-xs font-semibold text-white transition hover:bg-leaf-hover"
            >
              Gerar novo Pix
            </button>
          </div>
        ) : (
          <>
            <Image
              alt="QR Code Pix para pagamento da assinatura PRO"
              className="mx-auto h-auto w-full max-w-[280px] rounded-lg bg-white"
              height={280}
              src={`data:image/png;base64,${qrCodeBase64}`}
              unoptimized
              width={280}
            />

            <p className="mt-3 text-center text-xs text-ink-muted">
              Expira em <span className="font-semibold text-ink">{formatRemaining(remaining)}</span> · a
              confirmação aparece aqui automaticamente
            </p>

            <div className="mt-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-ink-muted">
                Código Pix copia e cola
              </p>
              <code className="mt-1.5 block max-h-28 overflow-auto break-all rounded-lg border border-paper-soft bg-paper px-3 py-2 text-xs leading-5 text-ink">
                {qrCode}
              </code>
              <div className="mt-2">
                <CopyButton
                  text={qrCode}
                  label="Copiar código Pix"
                  className="inline-flex min-h-8 items-center justify-center rounded-md bg-leaf px-3 text-xs font-semibold text-white transition hover:bg-leaf-hover"
                />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Ligar o botão e o modal no `BillingCard.tsx`**

Adicionar ao import de `mp-billing` a nova action:

```typescript
import { cancelMpSubscription, createMpPixSubscription, createMpPixPayment } from "@/lib/actions/mp-billing";
```

Adicionar `import { MpPixPaymentModal } from "@/components/billing/MpPixPaymentModal";` junto dos outros imports de componente.

No tipo `BillingCardProps`, adicionar `mpPixAvailable: boolean;` e desestruturar `mpPixAvailable` nos parâmetros.

Adicionar estado do modal Pix e o handler (perto dos outros `useState`/handlers):

```typescript
  const [pixQr, setPixQr] = useState<
    { qrCode: string; qrCodeBase64: string; paymentId: string; expiresAt: string } | null
  >(null);

  function handlePayWithPixOneTime() {
    setError(null);
    startTransition(async () => {
      const result = await createMpPixPayment(payerEmail);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setPixQr(result);
    });
  }
```

Renderizar o modal (perto do `MpSubscriptionModal`):

```tsx
      {pixQr ? (
        <MpPixPaymentModal
          qrCode={pixQr.qrCode}
          qrCodeBase64={pixQr.qrCodeBase64}
          paymentId={pixQr.paymentId}
          expiresAt={pixQr.expiresAt}
          onClose={() => setPixQr(null)}
          onRegenerate={() => {
            setPixQr(null);
            handlePayWithPixOneTime();
          }}
        />
      ) : null}
```

No ramo FREE (dentro do `<div className="flex w-full flex-col gap-2 sm:w-auto">` que tem o botão "Assinar com cartão"), adicionar após o botão de cartão:

```tsx
                {mpPixAvailable ? (
                  <button
                    onClick={handlePayWithPixOneTime}
                    disabled={pending || hasActiveSubscription}
                    className="inline-flex min-h-9 items-center justify-center rounded-md border border-paper-soft bg-white px-5 text-xs font-semibold text-ink transition hover:border-leaf hover:text-leaf disabled:opacity-60"
                  >
                    {pending ? "Aguarde..." : "Pagar 1 mês via Pix"}
                  </button>
                ) : null}
```

- [ ] **Step 3: Passar a prop na página de billing**

Em `app/(dashboard)/dashboard/billing/page.tsx`, após a linha `const pixAvailable = ...` (linha 55), adicionar:

```typescript
  const mpPixAvailable = proAmount > 0;
```

E no JSX do `<BillingCard ... />` (junto de `pixAvailable={pixAvailable}`), adicionar:

```tsx
              mpPixAvailable={mpPixAvailable}
```

- [ ] **Step 4: Verificar tipos e lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: sem erros de tipo (o `mpPixAvailable` obrigatório está sendo passado) nem de lint.

- [ ] **Step 5: Commit**

```bash
git add components/billing/MpPixPaymentModal.tsx components/billing/BillingCard.tsx "app/(dashboard)/dashboard/billing/page.tsx"
git commit -m "feat: botao e modal de Pix unico (MP) na tela de assinatura"
```

---

## Task 6: Verificação final

- [ ] **Step 1: Suite completa**

Run: `npm test`
Expected: todos os testes passam (unit + actions + api).

- [ ] **Step 2: Tipos e lint no projeto inteiro**

Run: `npx tsc --noEmit && npm run lint`
Expected: zero erros.

- [ ] **Step 3: Smoke manual (opcional, requer MP sandbox)**

Com `MP_ACCESS_TOKEN` de teste e `MP_PRO_AMOUNT` setados: `/dashboard/billing` mostra "Pagar 1 mês via Pix" → clicar gera QR no modal → simular pagamento aprovado (ou POST manual no webhook com `type:"payment"`, `metadata.pro_pix_payment_id` da row e `status:"approved"`) → modal vira "Pagamento confirmado!" e o plano vira PRO com `currentPeriodEnd` ~30 dias.

- [ ] **Step 4: Atualizar o estado da integração (se aplicável)**

Se `docs/MERCADO_PAGO.md` existir, registrar que o Pix único agora usa a Payments API da MP com confirmação por webhook (o fluxo manual `VITRINY_PIX` fica redundante). Commit:

```bash
git add docs/MERCADO_PAGO.md
git commit -m "docs: Pix unico da assinatura passa a usar Mercado Pago"
```

---

## Notas de decisão (deviations)

- **DRY sem tocar no shape do admin:** em vez de reescrever `confirmProPixPayment` para usar a trava atômica nova (o que quebraria os mocks `findFirst`/`update` já testados), extraí apenas `nextProPeriodEnd()` como código compartilhado. O admin mantém seu fluxo; o webhook usa `grantProPixPeriodFromMp()` (com trava atômica própria).
- **Polling lê só o banco.** O webhook é a fonte da confirmação. Se um dia o atraso do webhook incomodar, dá pra `getMpPixPaymentStatus` consultar `payment.get` ao vivo e chamar `grantProPixPeriodFromMp` como fallback — sem mudar a interface.
- **Fluxo manual `VITRINY_PIX` intacto** (fora de escopo), agora redundante.
```
