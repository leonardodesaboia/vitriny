# Mercado Pago — Hardening da assinatura PRO (pós-migração) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fechar os gaps deixados pela migração Stripe→Mercado Pago: cancelamento com acesso até o fim do período, trava contra assinatura duplicada, webhook mais completo (`subscriptionStatus`, soft-cancel, tópicos de Pix por plano), `mpPayerId`, reativação via MP na UI, Pix por plano (`preapproval_plan`) implementado atrás de env, e faturas MP na tela de billing.

**Architecture:** Segue o spec `docs/superpowers/specs/2026-08-03-mercado-pago-hardening-design.md`. Nenhum cron novo — tudo lazy (corrige na leitura/escrita seguinte), mesmo padrão já usado em `resolveEffectivePlan`. Cancelamento MP é sempre imediato do lado do MP (irreversível lá); o acesso até o fim do período é só um estado local (`cancelAtPeriodEnd`) resolvido preguiçosamente. Cutover (remoção do Stripe) fica fora deste plano.

**Tech Stack:** Next.js App Router · Server Actions · Prisma/PostgreSQL · `mercadopago` (SDK Node) · Vitest.

## Global Constraints

- Não mexer no caminho Stripe (`lib/actions/billing.ts`, webhook Stripe) além do estritamente necessário para a UI de reativação decidir qual gateway usar — sem cutover.
- Sem tabela de dedupe de eventos de webhook: handlers continuam idempotentes por natureza (reaplicar o mesmo status é no-op) — decisão do spec.
- `MP_PRO_PLAN_INIT_POINT` é opcional; ausente em todos os ambientes hoje — nenhuma mudança pode quebrar o comportamento atual quando a env não está setada.
- TDD em toda mudança de lógica: teste falhando → implementação mínima → teste passando → commit.

---

## Task 1: Schema — campo de trava de assinatura duplicada

**Files:**
- Modify: `prisma/schema.prisma` (model `ProviderProfile`, logo abaixo de `mpPayerId`)

**Interfaces:**
- Produces: campo `mpSubscriptionLockedAt DateTime?` no `ProviderProfile`, usado pelas Tasks 4 e 7.

- [ ] **Step 1: Adicionar o campo**

Em `prisma/schema.prisma`, logo após a linha `mpPayerId            String?`:

```prisma
  mpSubscriptionLockedAt DateTime?
```

- [ ] **Step 2: Validar o schema**

Run: `npx prisma validate`
Expected: "The schema is valid".

- [ ] **Step 3: Criar a migration**

Run: `npm run prisma:migrate -- --name add_mp_subscription_lock`
Expected: nova pasta em `prisma/migrations/*_add_mp_subscription_lock/` com `ALTER TABLE ... ADD COLUMN "mpSubscriptionLockedAt" TIMESTAMP(3)`.

- [ ] **Step 4: Gerar o client**

Run: `npm run prisma:generate`
Expected: client regenerado sem erro.

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat: adiciona campo de trava de assinatura Mercado Pago duplicada"
```

---

## Task 2: Expiração lazy considera cancelamento agendado (MP)

**Files:**
- Modify: `lib/plan-limits.ts` (tipo `OneTimeProProfile` + `isOneTimeProExpired`)
- Modify: `lib/effective-plan.ts` (`EffectivePlanInput` + `resolveEffectivePlan`)
- Modify: `lib/actions/auth-guard.ts:29-36` (`select` do `requireProviderProfile`)
- Modify: `app/(dashboard)/dashboard/page.tsx:40-62` (`select` do profile)
- Test: `tests/unit/effective-plan.test.ts` (estender)

**Interfaces:**
- Consumes: nada de tasks anteriores.
- Produces: `isOneTimeProExpired(profile: { plan, stripeSubscriptionId, mpPreapprovalId, currentPeriodEnd, cancelAtPeriodEnd })`. `EffectivePlanInput` ganha `cancelAtPeriodEnd: boolean`. Tasks 3, 4 e 5 devem manter esse campo sempre presente nos `select`s que alimentam `resolveEffectivePlan`.

Regra: uma preapproval MP marcada para cancelar no fim do período (`cancelAtPeriodEnd: true`) expira sozinha quando `currentPeriodEnd` passa — mesmo com `mpPreapprovalId` ainda preenchido (a preapproval já está cancelada no MP, só não limpamos o id local ainda). **Assinantes Stripe não são afetados**: o webhook Stripe (já existente, fora de escopo) continua sendo a única fonte de verdade pra eles, exatamente como hoje — não estamos tocando no ciclo de vida Stripe.

- [ ] **Step 1: Escrever os testes que falham**

Em `tests/unit/effective-plan.test.ts`, adicionar ao describe `"isOneTimeProExpired com assinatura MP"` (depois do teste existente "PRO avulso ainda dentro do prazo NAO expira"):

```typescript
  it("PRO com preapproval MP marcada para cancelar expira quando o periodo passa", () => {
    expect(
      isOneTimeProExpired({
        plan: "PRO",
        stripeSubscriptionId: null,
        mpPreapprovalId: "2c93808",
        currentPeriodEnd: past,
        cancelAtPeriodEnd: true
      })
    ).toBe(true);
  });

  it("PRO com preapproval MP marcada para cancelar mas ainda dentro do prazo NAO expira", () => {
    expect(
      isOneTimeProExpired({
        plan: "PRO",
        stripeSubscriptionId: null,
        mpPreapprovalId: "2c93808",
        currentPeriodEnd: future,
        cancelAtPeriodEnd: true
      })
    ).toBe(false);
  });

  it("PRO com assinatura Stripe NAO expira via cancelAtPeriodEnd (fora de escopo, webhook Stripe decide)", () => {
    expect(
      isOneTimeProExpired({
        plan: "PRO",
        stripeSubscriptionId: "sub_123",
        mpPreapprovalId: null,
        currentPeriodEnd: past,
        cancelAtPeriodEnd: true
      })
    ).toBe(false);
  });
```

E ao describe `"resolveEffectivePlan"`:

```typescript
  it("rebaixa e limpa mpPreapprovalId/cancelAtPeriodEnd quando a assinatura MP cancelada venceu", async () => {
    db.providerProfile.update.mockResolvedValue({});
    const past = new Date("2020-01-01");

    const { resolveEffectivePlan } = await import("@/lib/effective-plan");
    const result = await resolveEffectivePlan({
      id: "profile-1",
      plan: "PRO",
      stripeSubscriptionId: null,
      mpPreapprovalId: "2c93808",
      currentPeriodEnd: past,
      cancelAtPeriodEnd: true
    });

    expect(result).toEqual({ plan: "FREE", currentPeriodEnd: null });
    expect(db.providerProfile.update).toHaveBeenCalledWith({
      where: { id: "profile-1" },
      data: {
        plan: "FREE",
        currentPeriodEnd: null,
        mpPreapprovalId: null,
        cancelAtPeriodEnd: false,
        subscriptionStatus: null
      }
    });
  });
```

Também adicionar `cancelAtPeriodEnd: false` aos três `resolveEffectivePlan(...)` já existentes nesse arquivo (os testes "mantém PRO..." e "rebaixa pra FREE... Pix manual venceu").

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run tests/unit/effective-plan.test.ts`
Expected: FAIL (tipo não tem `cancelAtPeriodEnd`, comportamento ainda não implementado).

- [ ] **Step 3: Atualizar `lib/plan-limits.ts`**

Substituir o bloco `OneTimeProProfile` + `isOneTimeProExpired`:

```typescript
type OneTimeProProfile = {
  plan: PlanTier;
  stripeSubscriptionId: string | null;
  mpPreapprovalId: string | null;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
};

// PRO expira sozinho na leitura em dois casos: (1) não há NENHUMA assinatura
// recorrente por trás (nem Stripe nem MP) e o período venceu — caso do Pix
// avulso legado; (2) há uma preapproval MP, mas ela foi marcada para
// cancelar no fim do período (cancelAtPeriodEnd) e o período já passou — a
// preapproval em si já está cancelada no MP desde o clique em "cancelar",
// só não limpamos o id local até aqui. Assinantes Stripe nunca caem aqui:
// o webhook Stripe continua sendo a única fonte de verdade para eles.
export function isOneTimeProExpired(profile: OneTimeProProfile): boolean {
  if (profile.plan !== "PRO" || profile.currentPeriodEnd === null) return false;
  if (profile.currentPeriodEnd >= new Date()) return false;

  if (profile.mpPreapprovalId !== null) {
    return profile.cancelAtPeriodEnd;
  }

  return profile.stripeSubscriptionId === null;
}
```

- [ ] **Step 4: Atualizar `lib/effective-plan.ts`**

```typescript
import { prisma } from "@/lib/prisma";
import { isOneTimeProExpired } from "@/lib/plan-limits";
import type { PlanTier } from "@prisma/client";

export type EffectivePlanInput = {
  id: string;
  plan: PlanTier;
  stripeSubscriptionId: string | null;
  mpPreapprovalId: string | null;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
};

// PRO comprado via Pix manual (sem assinatura) ou com preapproval MP
// cancelada não tem cobrança recorrente ativa — vence sozinho. Corrige na
// leitura em vez de cron: primeiro acesso ao dashboard depois do vencimento
// já rebaixa e persiste, limpando qualquer resquício de assinatura MP.
export async function resolveEffectivePlan(
  profile: EffectivePlanInput
): Promise<{ plan: PlanTier; currentPeriodEnd: Date | null }> {
  if (!isOneTimeProExpired(profile)) {
    return { plan: profile.plan, currentPeriodEnd: profile.currentPeriodEnd };
  }

  await prisma.providerProfile.update({
    where: { id: profile.id },
    data: {
      plan: "FREE",
      currentPeriodEnd: null,
      mpPreapprovalId: null,
      cancelAtPeriodEnd: false,
      subscriptionStatus: null
    }
  });

  return { plan: "FREE", currentPeriodEnd: null };
}
```

- [ ] **Step 5: Atualizar os `select`s que alimentam `resolveEffectivePlan`**

Em `lib/actions/auth-guard.ts`, no `select` de `requireProviderProfile` (linhas 29-36), adicionar `cancelAtPeriodEnd: true`:

```typescript
    select: {
      id: true,
      plan: true,
      businessType: true,
      stripeSubscriptionId: true,
      mpPreapprovalId: true,
      currentPeriodEnd: true,
      cancelAtPeriodEnd: true
    }
```

Em `app/(dashboard)/dashboard/page.tsx`, no `select` do `profile` (linhas 40-62), adicionar `cancelAtPeriodEnd: true` junto de `currentPeriodEnd: true`.

- [ ] **Step 6: Rodar os testes e ver passar**

Run: `npx vitest run tests/unit/effective-plan.test.ts`
Expected: PASS.

- [ ] **Step 7: Build (checa os dois call-sites do Step 5)**

Run: `npm run build`
Expected: build passa sem erro de tipo.

- [ ] **Step 8: Commit**

```bash
git add lib/plan-limits.ts lib/effective-plan.ts lib/actions/auth-guard.ts "app/(dashboard)/dashboard/page.tsx" tests/unit/effective-plan.test.ts
git commit -m "feat: expiracao lazy considera cancelamento agendado da assinatura MP"
```

---

## Task 3: `cancelMpSubscription` — cancelamento com acesso até o fim do período

**Files:**
- Modify: `lib/actions/mp-billing.ts` (`cancelMpSubscription`)
- Test: `tests/actions/mp-billing.test.ts` (describe `"cancelMpSubscription"`)

**Interfaces:**
- Consumes: nada de tasks anteriores.
- Produces: `cancelMpSubscription` passa a gravar `cancelAtPeriodEnd: true` e `subscriptionStatus: "CANCELED"` em vez de só cancelar no MP. Task 5 (webhook) replica essa mesma semântica para cancelamento vindo de fora.

- [ ] **Step 1: Escrever o teste que falha**

Em `tests/actions/mp-billing.test.ts`, substituir o teste `"chama update com status cancelled"` do describe `"cancelMpSubscription"`:

```typescript
  it("cancela no MP e marca cancelAtPeriodEnd em vez de rebaixar na hora", async () => {
    findUnique.mockResolvedValue({ id: "p1", mpPreapprovalId: "2c93808" });
    preApprovalUpdate.mockResolvedValue({ id: "2c93808", status: "cancelled" });

    const { cancelMpSubscription } = await import("@/lib/actions/mp-billing");
    const result = await cancelMpSubscription();

    expect(result).toEqual({ success: true });
    expect(preApprovalUpdate).toHaveBeenCalledWith({
      id: "2c93808",
      body: { status: "cancelled" }
    });
    expect(update).toHaveBeenCalledWith({
      where: { id: "p1" },
      data: { cancelAtPeriodEnd: true, subscriptionStatus: "CANCELED" }
    });
  });
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run tests/actions/mp-billing.test.ts -t "cancelMpSubscription"`
Expected: FAIL (`update` não chamado — `findUnique` hoje só seleciona `mpPreapprovalId`, sem `id`, e a função não persiste nada depois de cancelar no MP).

- [ ] **Step 3: Implementar**

Em `lib/actions/mp-billing.ts`, substituir `cancelMpSubscription`:

```typescript
export async function cancelMpSubscription(): Promise<
  { success: true } | { error: string }
> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Não autenticado." };

  const profile = await prisma.providerProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true, mpPreapprovalId: true }
  });

  if (!profile?.mpPreapprovalId) return { error: "Assinatura não encontrada." };

  const preApproval = new PreApproval(getMercadoPago());
  await preApproval.update({
    id: profile.mpPreapprovalId,
    body: { status: "cancelled" }
  });

  // Cancelamento no MP é imediato e irreversível (não dá pra "descancelar"
  // uma preapproval lá). O acesso PRO continua até currentPeriodEnd — quem
  // rebaixa de verdade é a expiração lazy (lib/plan-limits.ts).
  await prisma.providerProfile.update({
    where: { id: profile.id },
    data: { cancelAtPeriodEnd: true, subscriptionStatus: "CANCELED" }
  });

  return { success: true };
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run tests/actions/mp-billing.test.ts -t "cancelMpSubscription"`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/actions/mp-billing.ts tests/actions/mp-billing.test.ts
git commit -m "feat: cancelamento MP mantem acesso ate o fim do periodo pago"
```

---

## Task 4: Trava contra assinatura duplicada + reativação + `mpPayerId`

**Files:**
- Create: `lib/mp-subscription-lock.ts`
- Test: `tests/unit/mp-subscription-lock.test.ts`
- Modify: `lib/actions/mp-billing.ts` (`loadSubscribableProfile`, `createMpCardSubscription`)
- Test: `tests/actions/mp-billing.test.ts` (estender)

**Interfaces:**
- Produces: `acquireSubscriptionLock(profileId): Promise<boolean>`, `releaseSubscriptionLock(profileId): Promise<void>`, `isSubscriptionLockActive(lockedAt: Date | null): boolean`, `SUBSCRIPTION_LOCK_TTL_MS: number` — todos exportados de `lib/mp-subscription-lock.ts`. Task 7 (`deleteAccount`) consome `isSubscriptionLockActive`.
- `loadSubscribableProfile` passa a devolver `cancelAtPeriodEnd` no `profile` e permite reativação (PRO + `mpPreapprovalId` + `cancelAtPeriodEnd: true`).

Módulo separado (não `"use server"`) porque `lib/actions/mp-billing.ts` e `lib/actions/account.ts` (Task 7) precisam importar as mesmas funções, e um arquivo `"use server"` só pode exportar Server Actions (funções async), não constantes.

- [ ] **Step 1: Escrever os testes que falham (lock)**

Criar `tests/unit/mp-subscription-lock.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { makePrismaMock } from "../helpers";

vi.mock("@/lib/prisma", () => ({ prisma: {} }));

let db: ReturnType<typeof makePrismaMock>;

beforeEach(async () => {
  const prismaModule = await import("@/lib/prisma");
  db = makePrismaMock();
  Object.assign(prismaModule.prisma, db);
});

describe("acquireSubscriptionLock", () => {
  it("reivindica a trava quando nenhuma outra tentativa esta em andamento", async () => {
    db.providerProfile.updateMany.mockResolvedValue({ count: 1 });

    const { acquireSubscriptionLock } = await import("@/lib/mp-subscription-lock");
    const result = await acquireSubscriptionLock("profile-1");

    expect(result).toBe(true);
    expect(db.providerProfile.updateMany).toHaveBeenCalledWith({
      where: {
        id: "profile-1",
        OR: [
          { mpSubscriptionLockedAt: null },
          { mpSubscriptionLockedAt: { lt: expect.any(Date) } }
        ]
      },
      data: { mpSubscriptionLockedAt: expect.any(Date) }
    });
  });

  it("nao reivindica quando ja existe uma trava ativa (0 linhas afetadas)", async () => {
    db.providerProfile.updateMany.mockResolvedValue({ count: 0 });

    const { acquireSubscriptionLock } = await import("@/lib/mp-subscription-lock");
    const result = await acquireSubscriptionLock("profile-1");

    expect(result).toBe(false);
  });
});

describe("releaseSubscriptionLock", () => {
  it("limpa mpSubscriptionLockedAt", async () => {
    db.providerProfile.update.mockResolvedValue({});

    const { releaseSubscriptionLock } = await import("@/lib/mp-subscription-lock");
    await releaseSubscriptionLock("profile-1");

    expect(db.providerProfile.update).toHaveBeenCalledWith({
      where: { id: "profile-1" },
      data: { mpSubscriptionLockedAt: null }
    });
  });
});

describe("isSubscriptionLockActive", () => {
  it("null nao esta ativa", async () => {
    const { isSubscriptionLockActive } = await import("@/lib/mp-subscription-lock");
    expect(isSubscriptionLockActive(null)).toBe(false);
  });

  it("trava recente esta ativa", async () => {
    const { isSubscriptionLockActive } = await import("@/lib/mp-subscription-lock");
    expect(isSubscriptionLockActive(new Date())).toBe(true);
  });

  it("trava com mais de 2 minutos nao esta mais ativa", async () => {
    const { isSubscriptionLockActive } = await import("@/lib/mp-subscription-lock");
    const staleDate = new Date(Date.now() - 3 * 60 * 1000);
    expect(isSubscriptionLockActive(staleDate)).toBe(false);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run tests/unit/mp-subscription-lock.test.ts`
Expected: FAIL com "Cannot find module '@/lib/mp-subscription-lock'".

- [ ] **Step 3: Implementar `lib/mp-subscription-lock.ts`**

```typescript
import { prisma } from "@/lib/prisma";

export const SUBSCRIPTION_LOCK_TTL_MS = 2 * 60 * 1000;

// Trava otimista com TTL: evita duas preapprovals criadas em paralelo pro
// mesmo perfil (clique duplo, duas abas). Sem cron — uma trava órfã (processo
// caiu no meio) se autocura sozinha depois de 2 minutos, mesmo padrão de
// "corrige na leitura/escrita seguinte" usado no resto do projeto.
export async function acquireSubscriptionLock(profileId: string): Promise<boolean> {
  const staleBefore = new Date(Date.now() - SUBSCRIPTION_LOCK_TTL_MS);
  const claimed = await prisma.providerProfile.updateMany({
    where: {
      id: profileId,
      OR: [{ mpSubscriptionLockedAt: null }, { mpSubscriptionLockedAt: { lt: staleBefore } }]
    },
    data: { mpSubscriptionLockedAt: new Date() }
  });
  return claimed.count === 1;
}

export async function releaseSubscriptionLock(profileId: string): Promise<void> {
  await prisma.providerProfile.update({
    where: { id: profileId },
    data: { mpSubscriptionLockedAt: null }
  });
}

export function isSubscriptionLockActive(lockedAt: Date | null): boolean {
  if (!lockedAt) return false;
  return lockedAt.getTime() > Date.now() - SUBSCRIPTION_LOCK_TTL_MS;
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run tests/unit/mp-subscription-lock.test.ts`
Expected: PASS (6 testes).

- [ ] **Step 5: Commit**

```bash
git add lib/mp-subscription-lock.ts tests/unit/mp-subscription-lock.test.ts
git commit -m "feat: trava com TTL contra assinatura Mercado Pago duplicada"
```

- [ ] **Step 6: Escrever os testes que falham (wiring em `createMpCardSubscription`)**

Em `tests/actions/mp-billing.test.ts`, adicionar no topo (junto dos outros mocks) `vi.fn()` para `updateMany` e configurar o default em `beforeEach`:

```typescript
const updateMany = vi.fn();
vi.mock("@/lib/prisma", () => ({
  prisma: { providerProfile: { findUnique, update, updateMany } }
}));
```

No `beforeEach`, depois de `preApprovalUpdate.mockReset();`:

```typescript
  updateMany.mockReset();
  updateMany.mockResolvedValue({ count: 1 });
```

Atualizar o teste `"cria assinatura autorizada por cartao e ativa PRO"` (o `payer_id` e os novos campos persistidos):

```typescript
  it("cria assinatura autorizada por cartao e ativa PRO", async () => {
    findUnique.mockResolvedValue({
      id: "p1", plan: "FREE", mpPreapprovalId: null, stripeSubscriptionId: null, cancelAtPeriodEnd: false
    });
    preApprovalCreate.mockResolvedValue({
      id: "2c93808",
      status: "authorized",
      payer_id: 123456,
      next_payment_date: "2026-09-03T00:00:00.000Z"
    });

    const { createMpCardSubscription } = await import("@/lib/actions/mp-billing");
    const result = await createMpCardSubscription("card-token-abc", "payer@test.com");

    expect(result).toEqual({ success: true });
    expect(updateMany).toHaveBeenCalledWith({
      where: {
        id: "p1",
        OR: [
          { mpSubscriptionLockedAt: null },
          { mpSubscriptionLockedAt: { lt: expect.any(Date) } }
        ]
      },
      data: { mpSubscriptionLockedAt: expect.any(Date) }
    });
    expect(update).toHaveBeenCalledWith({
      where: { id: "p1" },
      data: {
        mpPreapprovalId: "2c93808",
        mpPayerId: "123456",
        plan: "PRO",
        subscriptionStatus: "ACTIVE",
        cancelAtPeriodEnd: false,
        mpSubscriptionLockedAt: null,
        currentPeriodEnd: new Date("2026-09-03T00:00:00.000Z")
      }
    });
  });
```

Atualizar `"bloqueia quem ja e PRO com assinatura MP ativa"` para incluir `cancelAtPeriodEnd: false`:

```typescript
    findUnique.mockResolvedValue({
      id: "p1", plan: "PRO", mpPreapprovalId: "2c93808", stripeSubscriptionId: null, cancelAtPeriodEnd: false
    });
```

Adicionar dois testes novos no describe `"createMpCardSubscription"`:

```typescript
  it("permite reativar (nova preapproval) quando cancelAtPeriodEnd e true", async () => {
    findUnique.mockResolvedValue({
      id: "p1", plan: "PRO", mpPreapprovalId: "old-preapproval", stripeSubscriptionId: null, cancelAtPeriodEnd: true
    });
    preApprovalCreate.mockResolvedValue({
      id: "new-preapproval",
      status: "authorized",
      next_payment_date: "2026-09-03T00:00:00.000Z"
    });

    const { createMpCardSubscription } = await import("@/lib/actions/mp-billing");
    const result = await createMpCardSubscription("card-token-abc", "payer@test.com");

    expect(result).toEqual({ success: true });
    expect(preApprovalCreate).toHaveBeenCalled();
    expect(update).toHaveBeenCalledWith({
      where: { id: "p1" },
      data: expect.objectContaining({ mpPreapprovalId: "new-preapproval", cancelAtPeriodEnd: false })
    });
  });

  it("recusa nova tentativa quando ja ha uma assinatura em andamento (trava ativa)", async () => {
    findUnique.mockResolvedValue({
      id: "p1", plan: "FREE", mpPreapprovalId: null, stripeSubscriptionId: null, cancelAtPeriodEnd: false
    });
    updateMany.mockResolvedValue({ count: 0 });

    const { createMpCardSubscription } = await import("@/lib/actions/mp-billing");
    const result = await createMpCardSubscription("card-token-abc", "payer@test.com");

    expect(result).toEqual({
      error: "Já existe uma tentativa de assinatura em andamento. Aguarde um instante e tente novamente."
    });
    expect(preApprovalCreate).not.toHaveBeenCalled();
  });
```

- [ ] **Step 7: Rodar e ver falhar**

Run: `npx vitest run tests/actions/mp-billing.test.ts`
Expected: FAIL nos testes novos/atualizados (guard ainda bloqueia reativação; sem trava; sem `mpPayerId`).

- [ ] **Step 8: Implementar em `lib/actions/mp-billing.ts`**

Adicionar o import e atualizar `ProfileResult`/`loadSubscribableProfile`:

```typescript
import {
  acquireSubscriptionLock,
  releaseSubscriptionLock
} from "@/lib/mp-subscription-lock";
```

```typescript
type ProfileResult =
  | { error: string }
  | {
      profile: {
        id: string;
        plan: string;
        mpPreapprovalId: string | null;
        stripeSubscriptionId: string | null;
        cancelAtPeriodEnd: boolean;
      };
    };

async function loadSubscribableProfile(): Promise<ProfileResult> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Não autenticado." };

  const profile = await prisma.providerProfile.findUnique({
    where: { userId: session.user.id },
    select: {
      id: true,
      plan: true,
      mpPreapprovalId: true,
      stripeSubscriptionId: true,
      cancelAtPeriodEnd: true
    }
  });

  if (!profile) return { error: "Dados do negócio não encontrados." };
  if (profile.plan === "PRO" && profile.stripeSubscriptionId) {
    return { error: "Você já tem uma assinatura PRO ativa." };
  }
  // MP com cancelAtPeriodEnd true está no período de graça (já cancelada no
  // MP, esperando o fim do período) — reativar aqui significa criar uma
  // preapproval nova, então essa combinação passa.
  if (profile.plan === "PRO" && profile.mpPreapprovalId && !profile.cancelAtPeriodEnd) {
    return { error: "Você já tem uma assinatura PRO ativa." };
  }
  return { profile };
}
```

Substituir o corpo de `createMpCardSubscription` a partir da validação de input:

```typescript
  const parsedInput = cardSubscriptionSchema.safeParse({ cardToken, payerEmail });
  if (!parsedInput.success) {
    return { error: "Confira os dados do cartão e do pagador." };
  }
  const { cardToken: normalizedCardToken, payerEmail: normalizedPayerEmail } =
    parsedInput.data;

  const locked = await acquireSubscriptionLock(profile.id);
  if (!locked) {
    return {
      error: "Já existe uma tentativa de assinatura em andamento. Aguarde um instante e tente novamente."
    };
  }

  let preApproval: PreApproval;
  let result;

  try {
    preApproval = new PreApproval(getMercadoPago());
    result = await preApproval.create({
      body: {
        reason: "Vitriny PRO",
        external_reference: profile.id,
        payer_email: normalizedPayerEmail,
        card_token_id: normalizedCardToken,
        auto_recurring: {
          frequency: 1,
          frequency_type: "months",
          transaction_amount: amount,
          currency_id: "BRL"
        },
        back_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/billing`,
        status: "authorized"
      }
    });
  } catch (error) {
    console.error("Erro ao criar assinatura Mercado Pago por cartão.", {
      profileId: profile.id,
      errorName: error instanceof Error ? error.name : "UnknownError",
      errorMessage: error instanceof Error ? error.message : "Erro desconhecido"
    });
    await releaseSubscriptionLock(profile.id);
    return { error: "Não foi possível processar o cartão agora. Tente novamente." };
  }

  if (!result.id || result.status !== "authorized") {
    await releaseSubscriptionLock(profile.id);
    return { error: "Não foi possível confirmar o cartão. Verifique os dados e tente novamente." };
  }

  try {
    await prisma.providerProfile.update({
      where: { id: profile.id },
      data: {
        mpPreapprovalId: result.id,
        mpPayerId: result.payer_id != null ? String(result.payer_id) : null,
        plan: "PRO",
        subscriptionStatus: "ACTIVE",
        cancelAtPeriodEnd: false,
        mpSubscriptionLockedAt: null,
        currentPeriodEnd: result.next_payment_date
          ? new Date(result.next_payment_date)
          : null
      }
    });
  } catch (error) {
    console.error("Erro ao persistir assinatura Mercado Pago autorizada.", {
      profileId: profile.id,
      preapprovalId: result.id,
      errorName: error instanceof Error ? error.name : "UnknownError",
      errorMessage: error instanceof Error ? error.message : "Erro desconhecido"
    });

    try {
      await preApproval.update({
        id: result.id,
        body: { status: "cancelled" }
      });
    } catch (compensationError) {
      console.error("Falha ao compensar assinatura Mercado Pago não persistida.", {
        profileId: profile.id,
        preapprovalId: result.id,
        errorName:
          compensationError instanceof Error ? compensationError.name : "UnknownError",
        errorMessage:
          compensationError instanceof Error
            ? compensationError.message
            : "Erro desconhecido"
      });
    }

    try {
      await releaseSubscriptionLock(profile.id);
    } catch (releaseError) {
      console.error("Falha ao liberar trava de assinatura Mercado Pago.", {
        profileId: profile.id,
        errorName: releaseError instanceof Error ? releaseError.name : "UnknownError",
        errorMessage: releaseError instanceof Error ? releaseError.message : "Erro desconhecido"
      });
    }

    return {
      error:
        "A assinatura foi autorizada, mas não conseguimos atualizar seu plano. Não tente novamente agora; entre em contato com o suporte."
    };
  }

  return { success: true };
```

- [ ] **Step 9: Rodar e ver passar**

Run: `npx vitest run tests/actions/mp-billing.test.ts`
Expected: PASS.

- [ ] **Step 10: Commit**

```bash
git add lib/actions/mp-billing.ts tests/actions/mp-billing.test.ts
git commit -m "feat: trava contra assinatura MP duplicada, reativacao e mpPayerId"
```

---

## Task 5: Webhook — `subscriptionStatus` e soft-cancel

**Files:**
- Modify: `vitest.config.ts` (incluir `tests/api/**`)
- Modify: `app/api/mercadopago/webhook/route.ts`
- Create: `tests/api/mercadopago-webhook.test.ts`

**Interfaces:**
- Consumes: `resolvePlanFromPreapproval` (`lib/mp-plan.ts`, inalterado).
- Produces: comportamento do `POST` documentado pelos testes abaixo. Task 9 estende este arquivo (novos tópicos) e reaproveita o mesmo describe.

- [ ] **Step 1: Incluir `tests/api` no Vitest**

Em `vitest.config.ts`, no array `include`:

```typescript
    include: ["tests/unit/**/*.test.ts", "tests/actions/**/*.test.ts", "tests/api/**/*.test.ts"],
```

- [ ] **Step 2: Escrever os testes que falham**

Criar `tests/api/mercadopago-webhook.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

const preApprovalGet = vi.fn();
const validate = vi.fn();

class FakeInvalidWebhookSignatureError extends Error {}

vi.mock("mercadopago", () => ({
  MercadoPagoConfig: vi.fn(),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  PreApproval: vi.fn(function (this: any) {
    this.get = preApprovalGet;
  }),
  WebhookSignatureValidator: { validate },
  InvalidWebhookSignatureError: FakeInvalidWebhookSignatureError
}));

const updateMany = vi.fn();
vi.mock("@/lib/prisma", () => ({
  prisma: { providerProfile: { updateMany } }
}));

vi.mock("@/lib/mercadopago", () => ({
  getMercadoPago: vi.fn(() => ({}))
}));

beforeEach(() => {
  vi.clearAllMocks();
  validate.mockImplementation(() => undefined);
  updateMany.mockResolvedValue({ count: 1 });
  process.env.MP_WEBHOOK_SECRET = "test-secret";
});

function makeRequest(body: unknown) {
  return new Request("https://app.test/api/mercadopago/webhook?data.id=preapproval-1", {
    method: "POST",
    headers: {
      "x-signature": "ts=1,v1=abc",
      "x-request-id": "req-1",
      "content-type": "application/json"
    },
    body: JSON.stringify(body)
  });
}

describe("POST /api/mercadopago/webhook", () => {
  it("retorna 401 quando a assinatura e invalida", async () => {
    validate.mockImplementation(() => {
      throw new FakeInvalidWebhookSignatureError("invalid");
    });

    const { POST } = await import("@/app/api/mercadopago/webhook/route");
    const response = await POST(
      makeRequest({ type: "subscription_preapproval", data: { id: "preapproval-1" } })
    );

    expect(response.status).toBe(401);
    expect(updateMany).not.toHaveBeenCalled();
  });

  it("ignora tipos de evento desconhecidos", async () => {
    const { POST } = await import("@/app/api/mercadopago/webhook/route");
    const response = await POST(makeRequest({ type: "topic_claims_integration_wh", data: { id: "x" } }));

    expect(response.status).toBe(200);
    expect(updateMany).not.toHaveBeenCalled();
  });

  it("cancelamento marca cancelAtPeriodEnd em vez de rebaixar na hora", async () => {
    preApprovalGet.mockResolvedValue({ id: "preapproval-1", status: "cancelled" });

    const { POST } = await import("@/app/api/mercadopago/webhook/route");
    const response = await POST(
      makeRequest({ type: "subscription_preapproval", data: { id: "preapproval-1" } })
    );

    expect(response.status).toBe(200);
    expect(updateMany).toHaveBeenCalledWith({
      where: { mpPreapprovalId: "preapproval-1" },
      data: { cancelAtPeriodEnd: true, subscriptionStatus: "CANCELED" }
    });
  });

  it("autorizada ativa o plano e grava subscriptionStatus ACTIVE", async () => {
    preApprovalGet.mockResolvedValue({
      id: "preapproval-1",
      status: "authorized",
      next_payment_date: "2026-09-03T00:00:00.000Z"
    });

    const { POST } = await import("@/app/api/mercadopago/webhook/route");
    const response = await POST(
      makeRequest({ type: "subscription_preapproval", data: { id: "preapproval-1" } })
    );

    expect(response.status).toBe(200);
    expect(updateMany).toHaveBeenCalledWith({
      where: { mpPreapprovalId: "preapproval-1" },
      data: {
        plan: "PRO",
        subscriptionStatus: "ACTIVE",
        currentPeriodEnd: new Date("2026-09-03T00:00:00.000Z"),
        cancelAtPeriodEnd: false
      }
    });
  });

  it("pausada rebaixa na hora (nao e o mesmo caso do cancelamento voluntario)", async () => {
    preApprovalGet.mockResolvedValue({ id: "preapproval-1", status: "paused" });

    const { POST } = await import("@/app/api/mercadopago/webhook/route");
    const response = await POST(
      makeRequest({ type: "subscription_preapproval", data: { id: "preapproval-1" } })
    );

    expect(response.status).toBe(200);
    expect(updateMany).toHaveBeenCalledWith({
      where: { mpPreapprovalId: "preapproval-1" },
      data: {
        plan: "FREE",
        subscriptionStatus: "CANCELED",
        mpPreapprovalId: null,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false
      }
    });
  });

  it("pending nao mexe no perfil", async () => {
    preApprovalGet.mockResolvedValue({ id: "preapproval-1", status: "pending" });

    const { POST } = await import("@/app/api/mercadopago/webhook/route");
    const response = await POST(
      makeRequest({ type: "subscription_preapproval", data: { id: "preapproval-1" } })
    );

    expect(response.status).toBe(200);
    expect(updateMany).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 3: Rodar e ver falhar**

Run: `npx vitest run tests/api/mercadopago-webhook.test.ts`
Expected: FAIL (cancelamento hoje zera `mpPreapprovalId`/`currentPeriodEnd` em vez de marcar `cancelAtPeriodEnd`; `subscriptionStatus` nunca é gravado).

- [ ] **Step 4: Implementar**

Substituir `app/api/mercadopago/webhook/route.ts`:

```typescript
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

  if (body.type !== "subscription_preapproval") {
    return new Response(null, { status: 200 });
  }

  const preapprovalId = body.data?.id ?? dataId;
  if (!preapprovalId) return new Response(null, { status: 200 });

  try {
    const preApproval = new PreApproval(getMercadoPago());
    const sub = await preApproval.get({ id: preapprovalId });
    const status = sub.status ?? "";

    // Cancelamento (nosso, via cancelMpSubscription, ou feito direto no app
    // do MP) nunca rebaixa na hora: só marca cancelAtPeriodEnd. Quem rebaixa
    // de verdade é a expiração lazy, quando currentPeriodEnd já tiver
    // passado — mesma semântica de lib/actions/mp-billing.ts.
    if (status === "cancelled") {
      await prisma.providerProfile.updateMany({
        where: { mpPreapprovalId: preapprovalId },
        data: { cancelAtPeriodEnd: true, subscriptionStatus: "CANCELED" }
      });
      return new Response(null, { status: 200 });
    }

    const plan = resolvePlanFromPreapproval(status);

    // Status sem plano resolvido (pending/desconhecido): não mexe no perfil.
    if (plan === null) {
      return new Response(null, { status: 200 });
    }

    const nextPayment = sub.next_payment_date ? new Date(sub.next_payment_date) : null;

    await prisma.providerProfile.updateMany({
      where: { mpPreapprovalId: preapprovalId },
      data: {
        plan,
        subscriptionStatus: plan === "PRO" ? "ACTIVE" : "CANCELED",
        ...(plan === "FREE"
          ? { mpPreapprovalId: null, currentPeriodEnd: null }
          : { currentPeriodEnd: nextPayment }),
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

- [ ] **Step 5: Rodar e ver passar**

Run: `npx vitest run tests/api/mercadopago-webhook.test.ts`
Expected: PASS (6 testes).

- [ ] **Step 6: Rodar a suíte inteira (checa regressão)**

Run: `npm test`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add vitest.config.ts app/api/mercadopago/webhook/route.ts tests/api/mercadopago-webhook.test.ts
git commit -m "feat: webhook MP marca subscriptionStatus e faz soft-cancel"
```

---

## Task 6: Reativação de assinatura na UI (MP vs Stripe) + botão de Pix atrás de `pixAvailable`

> Esta task também introduz a prop `pixAvailable` e o botão "Assinar com Pix" no `BillingCard`, já que os testes de reativação e os de Pix tocam o mesmo componente e a mesma bateria de props — a Task 8 só implementa a lógica da Server Action que esse botão chama.

**Files:**
- Modify: `lib/billing-status.ts` (`resolveSubscriptionGateway`)
- Test: `tests/unit/billing-status.test.ts` (estender)
- Modify: `components/billing/BillingCard.tsx`
- Modify: `app/(dashboard)/dashboard/billing/page.tsx`
- Test: `tests/unit/billing-card-payment-options.test.ts` (estender)

**Interfaces:**
- Produces: `resolveSubscriptionGateway(profile: { stripeSubscriptionId, mpPreapprovalId }): "stripe" | "mp" | null`.
- `BillingCard` ganha as props `subscriptionGateway: "stripe" | "mp" | null` e `pixAvailable: boolean`. Task 8 consome `pixAvailable` indiretamente — ela só implementa o que `handlePayWithPix` (definido aqui) chama (`createMpPixSubscription`), sem mudar a UI de novo.

Como cancelar uma preapproval no MP é irreversível, "reativar" para assinantes MP não pode só desfazer uma flag (como no Stripe) — precisa criar uma preapproval nova. A UI passa a abrir de novo o `MpSubscriptionModal` (Card Brick) quando a assinatura ativa é MP, e continua chamando `reactivateSubscription()` (zero-input) para Stripe, sem tocar nesse caminho.

Este projeto testa componentes client via `renderToStaticMarkup` (sem jsdom/testing-library — ver `tests/unit/mp-subscription-modal.test.ts`), então os testes de UI aqui verificam o HTML estático renderizado com cada combinação de props, não cliques reais.

- [ ] **Step 1: Escrever o teste que falha (`resolveSubscriptionGateway`)**

Em `tests/unit/billing-status.test.ts`, adicionar:

```typescript
import { resolveSubscriptionGateway } from "@/lib/billing-status";

describe("resolveSubscriptionGateway", () => {
  it("MP tem prioridade quando ambos os ids existem (nao deveria acontecer, mas MP e o caminho atual)", () => {
    expect(
      resolveSubscriptionGateway({ stripeSubscriptionId: "sub_123", mpPreapprovalId: "2c93808" })
    ).toBe("mp");
  });

  it("mp quando so ha mpPreapprovalId", () => {
    expect(
      resolveSubscriptionGateway({ stripeSubscriptionId: null, mpPreapprovalId: "2c93808" })
    ).toBe("mp");
  });

  it("stripe quando so ha stripeSubscriptionId", () => {
    expect(
      resolveSubscriptionGateway({ stripeSubscriptionId: "sub_123", mpPreapprovalId: null })
    ).toBe("stripe");
  });

  it("null quando nao ha nenhum", () => {
    expect(
      resolveSubscriptionGateway({ stripeSubscriptionId: null, mpPreapprovalId: null })
    ).toBeNull();
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run tests/unit/billing-status.test.ts`
Expected: FAIL com "resolveSubscriptionGateway is not a function".

- [ ] **Step 3: Implementar em `lib/billing-status.ts`**

Adicionar, depois de `hasActiveRecurringSubscription`:

```typescript
export function resolveSubscriptionGateway(profile: {
  stripeSubscriptionId: string | null;
  mpPreapprovalId: string | null;
}): "stripe" | "mp" | null {
  if (profile.mpPreapprovalId !== null) return "mp";
  if (profile.stripeSubscriptionId !== null) return "stripe";
  return null;
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run tests/unit/billing-status.test.ts`
Expected: PASS.

- [ ] **Step 5: Escrever o teste que falha (`BillingCard`)**

Substituir `tests/unit/billing-card-payment-options.test.ts` por:

```typescript
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/actions/mp-billing", () => ({
  cancelMpSubscription: vi.fn(),
  createMpPixSubscription: vi.fn()
}));
vi.mock("@/lib/actions/billing", () => ({ reactivateSubscription: vi.fn() }));
vi.mock("@mercadopago/sdk-react", () => ({
  initMercadoPago: vi.fn(),
  CardPayment: () => null
}));

const baseProps = {
  plan: "PRO" as const,
  subscriptionStatus: "CANCELED" as const,
  currentPeriodEnd: new Date("2026-09-03"),
  cancelAtPeriodEnd: true,
  hasActiveSubscription: true,
  payerEmail: "profile@test.com",
  proAmount: 19.9,
  pixAvailable: false
};

describe("BillingCard - reativacao por gateway", () => {
  it("assinante MP cancelado ve o botao de reativar (reabre o Card Brick)", async () => {
    const { BillingCard } = await import("@/components/billing/BillingCard");

    const html = renderToStaticMarkup(
      createElement(BillingCard, { ...baseProps, subscriptionGateway: "mp" })
    );

    expect(html).toContain("Reativar assinatura");
  });

  it("assinante Stripe cancelado tambem ve o botao de reativar", async () => {
    const { BillingCard } = await import("@/components/billing/BillingCard");

    const html = renderToStaticMarkup(
      createElement(BillingCard, { ...baseProps, subscriptionGateway: "stripe" })
    );

    expect(html).toContain("Reativar assinatura");
  });
});

describe("opcoes de pagamento da assinatura FREE", () => {
  const freeProps = {
    plan: "FREE" as const,
    subscriptionStatus: null,
    currentPeriodEnd: null,
    cancelAtPeriodEnd: false,
    hasActiveSubscription: false,
    subscriptionGateway: null,
    payerEmail: "profile@test.com",
    proAmount: 19.9
  };

  it("mostra cartao sempre e Pix so quando pixAvailable", async () => {
    const { BillingCard } = await import("@/components/billing/BillingCard");

    const withoutPix = renderToStaticMarkup(
      createElement(BillingCard, { ...freeProps, pixAvailable: false })
    );
    expect(withoutPix).toContain("Assinar com cart");
    expect(withoutPix).not.toContain("Assinar com Pix");

    const withPix = renderToStaticMarkup(
      createElement(BillingCard, { ...freeProps, pixAvailable: true })
    );
    expect(withPix).toContain("Assinar com Pix");
  });
});
```

- [ ] **Step 6: Rodar e ver falhar**

Run: `npx vitest run tests/unit/billing-card-payment-options.test.ts`
Expected: FAIL (`BillingCard` ainda não aceita `subscriptionGateway`/`pixAvailable`, e reativar sempre chama `reactivateSubscription` direto).

- [ ] **Step 7: Implementar em `components/billing/BillingCard.tsx`**

Adicionar `subscriptionGateway` e `pixAvailable` ao `BillingCardProps` e ao destructuring:

```typescript
type BillingCardProps = {
  plan: PlanTier;
  subscriptionStatus: SubscriptionStatus | null;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  hasActiveSubscription: boolean;
  subscriptionGateway: "stripe" | "mp" | null;
  payerEmail: string;
  proAmount: number;
  pixAvailable: boolean;
};

export function BillingCard({
  plan,
  subscriptionStatus,
  currentPeriodEnd,
  cancelAtPeriodEnd,
  hasActiveSubscription,
  subscriptionGateway,
  payerEmail,
  proAmount,
  pixAvailable
}: BillingCardProps) {
```

Substituir `handleReactivate`:

```typescript
  function handleReactivate() {
    setError(null);
    if (subscriptionGateway === "mp") {
      // Preapproval cancelada no MP é terminal — reativar significa criar
      // uma nova (novo card_token, cobrança imediata), não "descancelar".
      setShowCardModal(true);
      return;
    }
    startTransition(async () => {
      const result = await reactivateSubscription();
      if ("error" in result) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }
```

Adicionar `handlePayWithPix` (usado no Step do Task 8, já preparado aqui):

```typescript
  function handlePayWithPix() {
    setError(null);
    startTransition(async () => {
      const result = await createMpPixSubscription(payerEmail);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      window.location.href = result.initPoint;
    });
  }
```

Adicionar o import de `createMpPixSubscription` junto do de `cancelMpSubscription`:

```typescript
import { cancelMpSubscription, createMpPixSubscription } from "@/lib/actions/mp-billing";
```

No bloco `plan === "FREE"` do JSX (o `<div className="flex w-full flex-col gap-2 sm:w-auto">` que hoje só tem o botão "Assinar com cartão"), adicionar o botão de Pix condicionado a `pixAvailable`:

```tsx
              <div className="flex w-full flex-col gap-2 sm:w-auto">
                <button
                  onClick={handleSubscribe}
                  disabled={pending || hasActiveSubscription}
                  className="inline-flex min-h-9 items-center justify-center rounded-md bg-leaf px-5 text-xs font-semibold text-white transition hover:bg-leaf-hover disabled:opacity-60"
                >
                  {pending ? "Aguarde..." : "Assinar com cartão"}
                </button>
                {pixAvailable ? (
                  <button
                    onClick={handlePayWithPix}
                    disabled={pending || hasActiveSubscription}
                    className="inline-flex min-h-9 items-center justify-center rounded-md border border-paper-soft bg-white px-5 text-xs font-semibold text-ink transition hover:border-leaf hover:text-leaf disabled:opacity-60"
                  >
                    {pending ? "Aguarde..." : "Assinar com Pix"}
                  </button>
                ) : null}
              </div>
```

- [ ] **Step 8: Atualizar o call site em `app/(dashboard)/dashboard/billing/page.tsx`**

No `select` do `profile` (linha 33-41), adicionar `stripeSubscriptionId: true` (hoje não está selecionado — só `mpPreapprovalId` chega até `hasActiveRecurringSubscription`, mas `resolveSubscriptionGateway` também precisa dele):

```typescript
  const profile = await prisma.providerProfile.findUnique({
    where: { userId: session.user.id },
    include: {
      services: { select: { id: true, isActive: true } },
      quoteRequests: { select: { id: true, createdAt: true } },
      proposals: { select: { id: true, createdAt: true } },
      proposalTemplates: { select: { id: true } }
    }
  });
```

(`include` sem `select` já traz todos os campos escalares, então `stripeSubscriptionId` já vem — nenhuma mudança necessária aqui, só confirmar.)

Adicionar, antes do `<BillingCard`:

```typescript
  const subscriptionGateway = profile
    ? resolveSubscriptionGateway({
        stripeSubscriptionId: profile.stripeSubscriptionId,
        mpPreapprovalId: profile.mpPreapprovalId
      })
    : null;
  const pixAvailable = Boolean(process.env.MP_PRO_PLAN_INIT_POINT);
```

E adicionar o import:

```typescript
import { hasActiveRecurringSubscription, resolveSubscriptionGateway } from "@/lib/billing-status";
```

No JSX do `<BillingCard`, adicionar as duas props:

```tsx
            <BillingCard
              plan={plan}
              subscriptionStatus={profile.subscriptionStatus}
              currentPeriodEnd={currentPeriodEnd}
              cancelAtPeriodEnd={profile.cancelAtPeriodEnd}
              hasActiveSubscription={hasActiveRecurringSubscription({
                plan,
                stripeSubscriptionId: profile.stripeSubscriptionId,
                mpPreapprovalId: profile.mpPreapprovalId
              })}
              subscriptionGateway={subscriptionGateway}
              payerEmail={payerEmail}
              proAmount={proAmount}
              pixAvailable={pixAvailable}
            />
```

- [ ] **Step 9: Rodar e ver passar**

Run: `npx vitest run tests/unit/billing-card-payment-options.test.ts tests/unit/billing-status.test.ts tests/unit/mp-subscription-modal.test.ts`
Expected: PASS.

- [ ] **Step 10: Build**

Run: `npm run build`
Expected: build passa (checa os dois call-sites de `BillingCard`).

- [ ] **Step 11: Commit**

```bash
git add lib/billing-status.ts components/billing/BillingCard.tsx "app/(dashboard)/dashboard/billing/page.tsx" tests/unit/billing-status.test.ts tests/unit/billing-card-payment-options.test.ts
git commit -m "feat: reativacao MP reabre o Card Brick, Stripe mantem fluxo atual"
```

---

## Task 7: `deleteAccount` respeita a trava de assinatura

**Files:**
- Modify: `lib/actions/account.ts`
- Test: criar `tests/actions/account.test.ts` (não existe ainda)

- [ ] **Step 1: Escrever o teste que falha**

Criar `tests/actions/account.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("mercadopago", () => ({
  MercadoPagoConfig: vi.fn(),
  PreApproval: vi.fn()
}));

const findUnique = vi.fn();
vi.mock("@/lib/prisma", () => ({
  prisma: { user: { findUnique } }
}));

vi.mock("@/lib/actions/auth-guard", () => ({
  requireAuth: vi.fn(async () => "user-1")
}));

vi.mock("@/auth", () => ({ signOut: vi.fn() }));
vi.mock("@/lib/mercadopago", () => ({ getMercadoPago: vi.fn(() => ({})) }));
vi.mock("@/lib/stripe", () => ({ stripe: { subscriptions: { cancel: vi.fn() } } }));
vi.mock("@/lib/storage", () => ({ deleteFromStorage: vi.fn() }));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("deleteAccount", () => {
  it("aborta quando ha uma trava de assinatura ativa", async () => {
    findUnique.mockResolvedValue({
      id: "user-1",
      email: "user@test.com",
      deletedAt: null,
      providerProfile: {
        id: "p1",
        slug: "negocio",
        stripeSubscriptionId: null,
        mpPreapprovalId: null,
        mpSubscriptionLockedAt: new Date(),
        services: []
      }
    });

    const { deleteAccount } = await import("@/lib/actions/account");
    const result = await deleteAccount();

    expect(result).toEqual({
      error: "Uma operação de assinatura está em andamento. Tente novamente em instantes."
    });
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run tests/actions/account.test.ts`
Expected: FAIL (função não checa `mpSubscriptionLockedAt`; provavelmente quebra em outro ponto do fluxo já que o mock não cobre `prisma.$transaction` — o teste espera retornar antes de chegar lá).

- [ ] **Step 3: Implementar**

Em `lib/actions/account.ts`, importar `isSubscriptionLockActive`:

```typescript
import { isSubscriptionLockActive } from "@/lib/mp-subscription-lock";
```

No `select` de `providerProfile` dentro de `prisma.user.findUnique` (linhas 33-43), adicionar `mpSubscriptionLockedAt: true`:

```typescript
      providerProfile: {
        select: {
          id: true,
          slug: true,
          stripeSubscriptionId: true,
          mpPreapprovalId: true,
          mpSubscriptionLockedAt: true,
          services: {
            select: { id: true, imageStorageKey: true }
          }
        }
      }
```

Logo depois de `const profile = user.providerProfile;`, adicionar:

```typescript
  if (profile && isSubscriptionLockActive(profile.mpSubscriptionLockedAt)) {
    return { error: "Uma operação de assinatura está em andamento. Tente novamente em instantes." };
  }
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run tests/actions/account.test.ts`
Expected: PASS.

- [ ] **Step 5: Rodar a suíte inteira**

Run: `npm test`
Expected: PASS (checa que o `select` novo não quebrou nada em `deleteAccount`).

- [ ] **Step 6: Commit**

```bash
git add lib/actions/account.ts tests/actions/account.test.ts
git commit -m "fix: exclusao de conta aborta se ha assinatura MP sendo criada"
```

---

## Task 8: Pix por plano (`createMpPixSubscription`) + botão na UI

**Files:**
- Modify: `lib/actions/mp-billing.ts` (`createMpPixSubscription`)
- Test: `tests/actions/mp-billing.test.ts` (estender)
- Modify: `.env.example`

> **Risco conhecido:** o `preapproval_plan` em si (a chamada única `POST /preapproval_plan` que gera o `init_point`) é criado manualmente fora do código — a conta MP ainda não tem Pix Automático habilitado, então isso não pode ser validado ponta a ponta agora. O código abaixo só monta a URL de redirect a partir de um `init_point` já existente; a Task 9 (webhook) é quem confirma a assinatura depois.

- [ ] **Step 1: Escrever o teste que falha**

Em `tests/actions/mp-billing.test.ts`, no `beforeEach`, adicionar `delete process.env.MP_PRO_PLAN_INIT_POINT;` (isolamento entre testes). No describe `"createMpPixSubscription"`, adicionar:

```typescript
  it("retorna o initPoint do plano com external_reference quando o Pix por plano esta configurado", async () => {
    process.env.MP_PRO_PLAN_INIT_POINT =
      "https://www.mercadopago.com.br/subscriptions/checkout?preapproval_plan_id=plan-1";
    findUnique.mockResolvedValue({
      id: "p1", plan: "FREE", mpPreapprovalId: null, stripeSubscriptionId: null, cancelAtPeriodEnd: false
    });

    const { createMpPixSubscription } = await import("@/lib/actions/mp-billing");
    const result = await createMpPixSubscription("payer@test.com");

    expect(result).toEqual({
      initPoint:
        "https://www.mercadopago.com.br/subscriptions/checkout?preapproval_plan_id=plan-1&external_reference=p1"
    });
    expect(preApprovalCreate).not.toHaveBeenCalled();
  });

  it("rejeita email invalido mesmo com o Pix por plano configurado", async () => {
    process.env.MP_PRO_PLAN_INIT_POINT =
      "https://www.mercadopago.com.br/subscriptions/checkout?preapproval_plan_id=plan-1";
    findUnique.mockResolvedValue({
      id: "p1", plan: "FREE", mpPreapprovalId: null, stripeSubscriptionId: null, cancelAtPeriodEnd: false
    });

    const { createMpPixSubscription } = await import("@/lib/actions/mp-billing");
    const result = await createMpPixSubscription("email-invalido");

    expect(result).toEqual({ error: "Confira o e-mail do pagador." });
  });
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run tests/actions/mp-billing.test.ts -t "createMpPixSubscription"`
Expected: FAIL (função hoje sempre retorna o erro fixo, ignora a env).

- [ ] **Step 3: Implementar**

Substituir `createMpPixSubscription` em `lib/actions/mp-billing.ts`:

```typescript
const payerEmailSchema = z.string().trim().toLowerCase().email().max(254);

export async function createMpPixSubscription(
  payerEmail: string
): Promise<{ initPoint: string } | { error: string }> {
  const loaded = await loadSubscribableProfile();
  if ("error" in loaded) return loaded;
  const { profile } = loaded;

  const planInitPoint = process.env.MP_PRO_PLAN_INIT_POINT;
  if (!planInitPoint) {
    return { error: "Pix Automático ainda não está disponível para esta assinatura." };
  }

  if (!payerEmailSchema.safeParse(payerEmail).success) {
    return { error: "Confira o e-mail do pagador." };
  }

  let redirectUrl: URL;
  try {
    redirectUrl = new URL(planInitPoint);
  } catch {
    console.error("MP_PRO_PLAN_INIT_POINT configurado com URL inválida.", { planInitPoint });
    return { error: "Pix Automático ainda não está disponível para esta assinatura." };
  }
  // A preapproval nasce quando o pagador completa o checkout do plano no MP
  // — não criamos nada via API aqui, só redirecionamos com o id do perfil
  // pra o webhook (Task 9) conseguir casar a confirmação depois.
  redirectUrl.searchParams.set("external_reference", profile.id);

  return { initPoint: redirectUrl.toString() };
}
```

Remover o `cardSubscriptionSchema`'s `payerEmail` duplicated logic não é necessário — `payerEmailSchema` é só usado aqui, `cardSubscriptionSchema` continua como está.

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run tests/actions/mp-billing.test.ts`
Expected: PASS.

- [ ] **Step 5: Atualizar `.env.example`**

No bloco `# Mercado Pago`, adicionar depois de `NEXT_PUBLIC_MP_PUBLIC_KEY`:

```env
# Opcional: init_point do preapproval_plan com Pix habilitado (payment_methods_allowed).
# Só configurar depois que o Mercado Pago liberar Pix Automático pra Assinaturas
# nesta conta — ver docs/MERCADO_PAGO.md. Ausente = botão de Pix continua oculto.
MP_PRO_PLAN_INIT_POINT=""
```

- [ ] **Step 6: Build**

Run: `npm run build`
Expected: build passa.

- [ ] **Step 7: Commit**

```bash
git add lib/actions/mp-billing.ts tests/actions/mp-billing.test.ts .env.example
git commit -m "feat: Pix por plano via MP_PRO_PLAN_INIT_POINT (atras de env opcional)"
```

---

## Task 9: Webhook — tópicos de pagamento do Pix por plano

**Files:**
- Modify: `app/api/mercadopago/webhook/route.ts`
- Modify: `tests/api/mercadopago-webhook.test.ts`

> **Risco conhecido (comunicado ao usuário antes deste plano):** a notificação do MP só traz o `id` do recurso — o payload de `payment`/`subscription_authorized_payment` que confirma qual campo referencia a preapproval associada (`metadata.preapproval_id`, neste código) não pôde ser validado contra uma cobrança real, porque o Pix por plano depende do gate de conta que ainda está fechado. Por isso o handler é defensivo: se não achar `preapproval_id`, não faz nada — nunca arrisca uma escrita errada.

- [ ] **Step 1: Escrever os testes que falham**

Em `tests/api/mercadopago-webhook.test.ts`, adicionar ao `vi.mock("mercadopago", ...)` um `Payment` mockado:

```typescript
const preApprovalGet = vi.fn();
const paymentGet = vi.fn();
const validate = vi.fn();

class FakeInvalidWebhookSignatureError extends Error {}

vi.mock("mercadopago", () => ({
  MercadoPagoConfig: vi.fn(),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  PreApproval: vi.fn(function (this: any) {
    this.get = preApprovalGet;
  }),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Payment: vi.fn(function (this: any) {
    this.get = paymentGet;
  }),
  WebhookSignatureValidator: { validate },
  InvalidWebhookSignatureError: FakeInvalidWebhookSignatureError
}));
```

(Isso substitui o `vi.mock("mercadopago", ...)` já existente no arquivo — mesma estrutura, só acrescenta `paymentGet`/`Payment`.)

Adicionar os testes no fim do describe existente:

```typescript
  it("payment sem preapproval_id no metadata e ignorado (nao ha o que sincronizar)", async () => {
    paymentGet.mockResolvedValue({ id: "payment-1", metadata: {}, external_reference: "profile-1" });

    const { POST } = await import("@/app/api/mercadopago/webhook/route");
    const response = await POST(makeRequest({ type: "payment", data: { id: "payment-1" } }));

    expect(response.status).toBe(200);
    expect(preApprovalGet).not.toHaveBeenCalled();
    expect(updateMany).not.toHaveBeenCalled();
  });

  it("subscription_authorized_payment com preapproval_id reivindica perfil ainda sem assinatura MP", async () => {
    paymentGet.mockResolvedValue({
      id: "payment-1",
      metadata: { preapproval_id: "preapproval-plan-1" },
      external_reference: "profile-1"
    });
    preApprovalGet.mockResolvedValue({
      id: "preapproval-plan-1",
      status: "authorized",
      external_reference: "profile-1",
      next_payment_date: "2026-09-03T00:00:00.000Z"
    });
    updateMany.mockResolvedValueOnce({ count: 0 });
    updateMany.mockResolvedValueOnce({ count: 1 });

    const { POST } = await import("@/app/api/mercadopago/webhook/route");
    const response = await POST(
      makeRequest({ type: "subscription_authorized_payment", data: { id: "payment-1" } })
    );

    expect(response.status).toBe(200);
    expect(updateMany).toHaveBeenNthCalledWith(1, {
      where: { mpPreapprovalId: "preapproval-plan-1" },
      data: {
        plan: "PRO",
        subscriptionStatus: "ACTIVE",
        currentPeriodEnd: new Date("2026-09-03T00:00:00.000Z"),
        cancelAtPeriodEnd: false
      }
    });
    expect(updateMany).toHaveBeenNthCalledWith(2, {
      where: { id: "profile-1", mpPreapprovalId: null },
      data: {
        mpPreapprovalId: "preapproval-plan-1",
        plan: "PRO",
        subscriptionStatus: "ACTIVE",
        currentPeriodEnd: new Date("2026-09-03T00:00:00.000Z"),
        cancelAtPeriodEnd: false
      }
    });
  });

  it("nao reivindica de novo quando o perfil ja tem essa mesma preapproval vinculada", async () => {
    paymentGet.mockResolvedValue({
      id: "payment-1",
      metadata: { preapproval_id: "preapproval-plan-1" },
      external_reference: "profile-1"
    });
    preApprovalGet.mockResolvedValue({
      id: "preapproval-plan-1",
      status: "authorized",
      external_reference: "profile-1",
      next_payment_date: "2026-09-03T00:00:00.000Z"
    });
    updateMany.mockResolvedValueOnce({ count: 1 });

    const { POST } = await import("@/app/api/mercadopago/webhook/route");
    const response = await POST(
      makeRequest({ type: "subscription_authorized_payment", data: { id: "payment-1" } })
    );

    expect(response.status).toBe(200);
    expect(updateMany).toHaveBeenCalledTimes(1);
  });
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run tests/api/mercadopago-webhook.test.ts`
Expected: FAIL ("Payment is not a constructor" / tópicos novos ainda caem no ramo "ignora tipos desconhecidos").

- [ ] **Step 3: Implementar**

Substituir `app/api/mercadopago/webhook/route.ts` inteiro:

```typescript
import {
  PreApproval,
  Payment,
  WebhookSignatureValidator,
  InvalidWebhookSignatureError
} from "mercadopago";
import { getMercadoPago } from "@/lib/mercadopago";
import { resolvePlanFromPreapproval } from "@/lib/mp-plan";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

async function syncPreapproval(preapprovalId: string, externalReference: string | null): Promise<void> {
  const preApproval = new PreApproval(getMercadoPago());
  const sub = await preApproval.get({ id: preapprovalId });
  const status = sub.status ?? "";

  if (status === "cancelled") {
    await prisma.providerProfile.updateMany({
      where: { mpPreapprovalId: preapprovalId },
      data: { cancelAtPeriodEnd: true, subscriptionStatus: "CANCELED" }
    });
    return;
  }

  const plan = resolvePlanFromPreapproval(status);
  if (plan === null) return;

  const nextPayment = sub.next_payment_date ? new Date(sub.next_payment_date) : null;
  const reference = sub.external_reference ?? externalReference;

  // Perfil já vinculado a essa preapproval (fluxo de cartão, ou Pix já
  // confirmado antes): atualiza por id, como sempre.
  const matchedById = await prisma.providerProfile.updateMany({
    where: { mpPreapprovalId: preapprovalId },
    data: {
      plan,
      subscriptionStatus: plan === "PRO" ? "ACTIVE" : "CANCELED",
      ...(plan === "FREE"
        ? { mpPreapprovalId: null, currentPeriodEnd: null }
        : { currentPeriodEnd: nextPayment }),
      cancelAtPeriodEnd: false
    }
  });

  if (matchedById.count > 0 || !reference || plan !== "PRO") return;

  // Primeira confirmação de uma preapproval nascida no checkout do plano
  // (Pix por plano): ainda não tem mpPreapprovalId gravado, só existe o
  // external_reference que mandamos no redirect (createMpPixSubscription).
  // Só reivindica um perfil que ainda não tem NENHUMA preapproval — nunca
  // sobrescreve uma diferente já vinculada.
  await prisma.providerProfile.updateMany({
    where: { id: reference, mpPreapprovalId: null },
    data: {
      mpPreapprovalId: preapprovalId,
      plan: "PRO",
      subscriptionStatus: "ACTIVE",
      currentPeriodEnd: nextPayment,
      cancelAtPeriodEnd: false
    }
  });
}

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

  const eventId = body.data?.id ?? dataId;
  if (!eventId) return new Response(null, { status: 200 });

  try {
    if (body.type === "subscription_preapproval") {
      await syncPreapproval(eventId, null);
      return new Response(null, { status: 200 });
    }

    if (body.type === "subscription_authorized_payment" || body.type === "payment") {
      const payment = new Payment(getMercadoPago());
      const paymentResource = await payment.get({ id: eventId });

      const preapprovalId =
        typeof paymentResource.metadata?.preapproval_id === "string"
          ? paymentResource.metadata.preapproval_id
          : null;

      // Sem id de preapproval no pagamento, não há o que sincronizar aqui —
      // a confirmação de verdade chega pelo evento subscription_preapproval.
      if (!preapprovalId) return new Response(null, { status: 200 });

      await syncPreapproval(preapprovalId, paymentResource.external_reference ?? null);
      return new Response(null, { status: 200 });
    }

    return new Response(null, { status: 200 });
  } catch (err) {
    console.error("Erro ao processar webhook Mercado Pago:", err);
    return new Response("Internal error", { status: 500 });
  }
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run tests/api/mercadopago-webhook.test.ts`
Expected: PASS (todos os testes da Task 5 continuam passando — `syncPreapproval` reproduz exatamente a mesma lógica/shape).

- [ ] **Step 5: Commit**

```bash
git add app/api/mercadopago/webhook/route.ts tests/api/mercadopago-webhook.test.ts
git commit -m "feat: webhook MP trata pagamentos do Pix por plano via external_reference"
```

---

## Task 10: Faturas Mercado Pago na tela de billing

**Files:**
- Modify: `app/api/billing/invoices/route.ts`
- Create: `tests/api/billing-invoices.test.ts`

> **Risco conhecido:** a assinatura exata de `payment.search` (nomes de campo no corpo de resposta) segue o padrão dos outros recursos do SDK (`PreApproval`), mas não há uma cobrança MP real com `external_reference` pra confirmar contra a API de verdade. Os testes cobrem a lógica de mapeamento/mescla que o Vitriny controla; se o formato real vier diferente, é um ajuste pontual nesta rota, não uma mudança de arquitetura.

- [ ] **Step 1: Escrever os testes que falham**

Criar `tests/api/billing-invoices.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

const paymentSearch = vi.fn();
vi.mock("mercadopago", () => ({
  MercadoPagoConfig: vi.fn(),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Payment: vi.fn(function (this: any) {
    this.search = paymentSearch;
  })
}));

const stripeInvoicesList = vi.fn();
vi.mock("@/lib/stripe", () => ({
  stripe: { invoices: { list: stripeInvoicesList } }
}));

const findUnique = vi.fn();
vi.mock("@/lib/prisma", () => ({
  prisma: { providerProfile: { findUnique } }
}));

vi.mock("@/auth", () => ({ auth: vi.fn(async () => ({ user: { id: "u1" } })) }));
vi.mock("@/lib/mercadopago", () => ({ getMercadoPago: vi.fn(() => ({})) }));

beforeEach(() => {
  vi.clearAllMocks();
  paymentSearch.mockResolvedValue({ results: [] });
  stripeInvoicesList.mockResolvedValue({ data: [] });
});

describe("GET /api/billing/invoices", () => {
  it("mescla faturas Stripe e pagamentos MP ordenados por data (mais recente primeiro)", async () => {
    findUnique.mockResolvedValue({ id: "p1", stripeCustomerId: "cus_1" });
    stripeInvoicesList.mockResolvedValue({
      data: [
        {
          id: "in_1",
          created: 1750000000,
          amount_paid: 1990,
          currency: "brl",
          status: "paid",
          hosted_invoice_url: "https://stripe.test/in_1"
        }
      ]
    });
    paymentSearch.mockResolvedValue({
      results: [
        {
          id: 123456,
          date_created: "2026-08-01T12:00:00.000-03:00",
          transaction_amount: 19.9,
          currency_id: "BRL",
          status: "approved"
        }
      ]
    });

    const { GET } = await import("@/app/api/billing/invoices/route");
    const response = await GET();
    const json = await response.json();

    expect(json.invoices).toEqual([
      {
        id: "123456",
        created: Math.floor(new Date("2026-08-01T12:00:00.000-03:00").getTime() / 1000),
        amountPaid: 1990,
        currency: "brl",
        status: "approved",
        hostedUrl: null
      },
      {
        id: "in_1",
        created: 1750000000,
        amountPaid: 1990,
        currency: "brl",
        status: "paid",
        hostedUrl: "https://stripe.test/in_1"
      }
    ]);
  });

  it("perfil sem stripeCustomerId ainda busca pagamentos MP", async () => {
    findUnique.mockResolvedValue({ id: "p1", stripeCustomerId: null });
    paymentSearch.mockResolvedValue({ results: [] });

    const { GET } = await import("@/app/api/billing/invoices/route");
    const response = await GET();
    const json = await response.json();

    expect(stripeInvoicesList).not.toHaveBeenCalled();
    expect(paymentSearch).toHaveBeenCalledWith({
      options: { external_reference: "p1", sort: "date_created", criteria: "desc", limit: 10 }
    });
    expect(json.invoices).toEqual([]);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run tests/api/billing-invoices.test.ts`
Expected: FAIL (rota hoje nem importa `Payment`, nem busca por `id` do perfil quando não há `stripeCustomerId`).

- [ ] **Step 3: Implementar**

Substituir `app/api/billing/invoices/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { Payment } from "mercadopago";

import { auth } from "@/auth";
import { getMercadoPago } from "@/lib/mercadopago";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";

export const dynamic = "force-dynamic";

type InvoiceItem = {
  id: string;
  created: number;
  amountPaid: number;
  currency: string;
  status: string | null;
  hostedUrl: string | null;
};

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const profile = await prisma.providerProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true, stripeCustomerId: true }
  });

  if (!profile) {
    return NextResponse.json({ invoices: [] });
  }

  const stripeInvoices: InvoiceItem[] = profile.stripeCustomerId
    ? (await stripe.invoices.list({ customer: profile.stripeCustomerId, limit: 10 })).data.map(
        (inv) => ({
          id: inv.id,
          created: inv.created,
          amountPaid: inv.amount_paid,
          currency: inv.currency,
          status: inv.status ?? null,
          hostedUrl: inv.hosted_invoice_url ?? null
        })
      )
    : [];

  const payment = new Payment(getMercadoPago());
  const mpSearch = await payment.search({
    options: { external_reference: profile.id, sort: "date_created", criteria: "desc", limit: 10 }
  });

  const mpInvoices: InvoiceItem[] = (mpSearch.results ?? []).map((p) => ({
    id: String(p.id),
    created: p.date_created ? Math.floor(new Date(p.date_created).getTime() / 1000) : 0,
    amountPaid: Math.round((p.transaction_amount ?? 0) * 100),
    currency: (p.currency_id ?? "BRL").toLowerCase(),
    status: p.status ?? null,
    hostedUrl: null
  }));

  const invoices = [...stripeInvoices, ...mpInvoices].sort((a, b) => b.created - a.created);

  return NextResponse.json({ invoices });
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run tests/api/billing-invoices.test.ts`
Expected: PASS.

- [ ] **Step 5: Build**

Run: `npm run build`
Expected: build passa.

- [ ] **Step 6: Commit**

```bash
git add app/api/billing/invoices/route.ts tests/api/billing-invoices.test.ts
git commit -m "feat: tela de billing tambem lista pagamentos Mercado Pago"
```

---

## Task 11: Suíte completa, build e documentação

**Files:**
- Modify: `docs/MERCADO_PAGO.md` (checklist e pendências)

- [ ] **Step 1: Rodar a suíte inteira**

Run: `npm test`
Expected: PASS (todas as tasks anteriores + suíte pré-existente).

- [ ] **Step 2: Build de produção**

Run: `npm run build`
Expected: PASS sem erro de tipo.

- [ ] **Step 3: Atualizar `docs/MERCADO_PAGO.md`**

Marcar como concluídos, no checklist "Checklist para a integração funcionar por completo": os itens de cancelamento (seção 4: cancelamento imediato → **substituído** por "acesso até o fim do período", já implementado), trava de duplicidade (seção 3, os 4 itens), `subscriptionStatus`/idempotência do webhook (seção 2, itens de handler e tópicos), `mpPayerId` (seção 7). Atualizar a seção "Pendências" removendo os itens 2 (Pix por plano — implementado, falta só o gate de conta) e o follow-up de `cancelAtPeriodEnd`/`subscriptionStatus`/`mpPayerId`/guard duplo. Manter pendente: habilitação do Pix Automático na conta (gate externo, fora do código) e o cutover (Task 12 do plano de migração original).

- [ ] **Step 4: Commit**

```bash
git add docs/MERCADO_PAGO.md
git commit -m "docs: atualiza estado da integracao MP apos hardening"
```

---

## Self-review

- **Cobertura do spec:** A (cancelamento + reativação) → Tasks 3, 6. B (expiração lazy) → Task 2. C (trava) → Tasks 4, 7. D (webhook) → Tasks 5, 9. E (Pix por plano) → Tasks 6 (UI/prop `pixAvailable`), 8 (action), 9 (webhook). F (`mpPayerId`) → Task 4. G (faturas) → Task 10. Suíte/docs → Task 11. Cutover explicitamente fora, conforme spec. ✅
- **Consistência de tipos:** `EffectivePlanInput`/`OneTimeProProfile` ganham `cancelAtPeriodEnd: boolean` nas Tasks 2, consumido igual em `auth-guard.ts` e `dashboard/page.tsx`. `acquireSubscriptionLock`/`releaseSubscriptionLock`/`isSubscriptionLockActive` definidos na Task 4, consumidos sem modificação nas Tasks 4 e 7. `resolveSubscriptionGateway` definido na Task 6, usado só ali. `syncPreapproval` (Task 9) substitui a lógica inline da Task 5 preservando exatamente o mesmo formato de `updateMany` — os testes da Task 5 continuam válidos sem alteração.
- **Riscos sinalizados explicitamente nas tasks (não escondidos):** payload de `payment`/`subscription_authorized_payment` (Task 9) e forma de resposta de `payment.search` (Task 10) — nenhum dos dois pode ser validado contra a API real agora (gate de conta fechado / sem cobrança MP real com external_reference). Ambos implementados defensivamente (no-op quando os campos esperados não aparecem) em vez de arriscar escrita errada.
