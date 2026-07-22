# Fase 2 — Itens mais vistos (PRO) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Registrar views por item (interesse) e mostrar ao dono PRO um ranking "Itens mais vistos" na dashboard; FREE vê um card de upsell.

**Architecture:** Reaproveita a infra da fase 1 — o beacon (`StorefrontViewBeacon`) ganha um `serviceId` opcional e é renderizado na página de orçamento; o endpoint `POST /api/storefront-view` passa a aceitar `serviceId` e grava num novo model `ItemView` (agregado por dia). A dashboard agrega o top 5 (só quando PRO, via `canUseStorefrontAnalytics`) e renderiza um card. Lógica pura (merge do ranking, gating) isolada e testada.

**Tech Stack:** Next.js (App Router, Route Handler, Server Components), Prisma/PostgreSQL, React 19, Vitest (unit + integração com DB real).

**Spec:** `docs/superpowers/specs/2026-07-22-fase2-itens-mais-vistos-design.md`

---

## File structure

- Modify `prisma/schema.prisma` — model `ItemView` + relação inversa `views` em `Service`.
- Modify `app/api/storefront-view/route.ts` — aceita `serviceId` opcional; grava `ItemView`.
- Modify `tests/integration/storefront-view.test.ts` — casos de view de item.
- Modify `tests/integration/setup.ts` — limpar `ItemView`.
- Modify `components/public/StorefrontViewBeacon.tsx` — prop `serviceId?` + dedupe por item.
- Modify `app/u/[slug]/orcamento/page.tsx` — renderiza o beacon com `serviceId`.
- Modify `lib/plan-limits.ts` — flag `storefrontAnalytics` + `canUseStorefrontAnalytics`.
- Test `tests/unit/plan-limits.test.ts` (existente) — caso do novo helper.
- Modify `lib/dashboard.ts` — `TopItem` + `mergeItemViewRanking`.
- Test `tests/unit/item-view-ranking.test.ts` — merge do ranking.
- Create `components/dashboard/DashboardTopItemsCard.tsx` — card (FREE upsell / PRO ranking).
- Modify `app/(dashboard)/dashboard/page.tsx` — agrega top 5 (PRO) e renderiza.
- Modify docs.

---

## Task 1: Model `ItemView`

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add the model + inverse relation**

Inside `model Service { ... }`, add alongside the other relation fields (near `quoteRequests QuoteRequest[]`):
```prisma
  views         ItemView[]
```
Add the new model at the end of the file:
```prisma
model ItemView {
  serviceId String
  // Bucket de dia. Uma linha por (item, dia); count agrega os hits de interesse.
  date      DateTime @db.Date
  count     Int      @default(0)

  service Service @relation(fields: [serviceId], references: [id], onDelete: Cascade)

  @@id([serviceId, date])
}
```

- [ ] **Step 2: Create and apply the migration**

Run: `npx prisma migrate dev --name add_item_view`
Expected: creates `prisma/migrations/<ts>_add_item_view/migration.sql` (`CREATE TABLE "ItemView"`) and re-runs `prisma generate`. Postgres is up (docker-compose, 5432).

**CRITICAL SAFETY:** If Prisma asks to **reset** the DB or warns of data loss, STOP and report BLOCKED with the full output. Do NOT reset.

- [ ] **Step 3: Typecheck confirms the client updated**

Run: `npx tsc --noEmit 2>&1 | grep -iE "itemView|item-view" || echo "sem erros relacionados"`
Expected: `sem erros relacionados`.

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat: model ItemView (views por item agregadas por dia)"
```

---

## Task 2: Endpoint aceita `serviceId` e grava `ItemView`

**Files:**
- Modify: `app/api/storefront-view/route.ts`
- Modify: `tests/integration/storefront-view.test.ts`
- Modify: `tests/integration/setup.ts`

- [ ] **Step 1: Replace the route handler body**

Replace the entire contents of `app/api/storefront-view/route.ts` with:

```ts
import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isCountableView, toDayBucket } from "@/lib/storefront-views";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: { slug?: unknown; serviceId?: unknown } | null;
  try {
    body = (await request.json()) as {
      slug?: unknown;
      serviceId?: unknown;
    } | null;
  } catch {
    return new NextResponse(null, { status: 400 });
  }

  const slug = body?.slug;
  const serviceId = body?.serviceId;

  if (typeof slug !== "string" || slug.length === 0) {
    return new NextResponse(null, { status: 400 });
  }

  const profile = await prisma.providerProfile.findUnique({
    where: { slug },
    select: { id: true, userId: true, isPublished: true },
  });

  // Vitrine inexistente ou não publicada: silencioso, não conta.
  if (!profile || !profile.isPublished) {
    return new NextResponse(null, { status: 204 });
  }

  const session = await auth();
  const isOwner = session?.user?.id === profile.userId;
  const userAgent = request.headers.get("user-agent");

  if (!isCountableView({ userAgent, isOwner })) {
    return new NextResponse(null, { status: 204 });
  }

  const date = toDayBucket(new Date());

  try {
    if (typeof serviceId === "string" && serviceId.length > 0) {
      // View de item: só conta se o item ativo pertence a ESTA vitrine.
      const service = await prisma.service.findFirst({
        where: { id: serviceId, providerId: profile.id, isActive: true },
        select: { id: true },
      });
      if (service) {
        await prisma.itemView.upsert({
          where: { serviceId_date: { serviceId: service.id, date } },
          create: { serviceId: service.id, date, count: 1 },
          update: { count: { increment: 1 } },
        });
      }
    } else {
      await prisma.storefrontView.upsert({
        where: { providerId_date: { providerId: profile.id, date } },
        create: { providerId: profile.id, date, count: 1 },
        update: { count: { increment: 1 } },
      });
    }
  } catch (error) {
    // A métrica nunca pode quebrar a vitrine; loga e segue.
    console.error("storefront-view upsert failed", error);
  }

  return new NextResponse(null, { status: 204 });
}
```

- [ ] **Step 2: Add `ItemView` to the test DB cleanup**

In `tests/integration/setup.ts`, in `cleanDatabase`, add BEFORE the `service` deletion (child before parent — `ItemView` FKs to `Service`):
```ts
  await testDb.itemView.deleteMany();
```

- [ ] **Step 3: Add integration tests for item views**

In `tests/integration/storefront-view.test.ts`, add `seedService` to the existing import from `./helpers` (it currently imports `seedProfile, seedUser`):
```ts
import { seedProfile, seedService, seedUser } from "./helpers";
```
Then add these tests inside the existing `describe(...)` block:

```ts
  it("conta view de item para um item ativo da vitrine", async () => {
    const service = await seedService(profileId, { name: "Pintura" });

    const { POST } = await import("@/app/api/storefront-view/route");
    await POST(makeRequest({ slug, serviceId: service.id }));
    await POST(makeRequest({ slug, serviceId: service.id }));

    const itemRows = await testDb.itemView.findMany({
      where: { serviceId: service.id },
    });
    expect(itemRows.length).toBe(1);
    expect(itemRows[0].count).toBe(2);

    // Não cria StorefrontView quando há serviceId.
    const storeRows = await testDb.storefrontView.findMany({
      where: { providerId: profileId },
    });
    expect(storeRows.length).toBe(0);
  });

  it("não conta item de outra vitrine", async () => {
    const otherUser = await seedUser();
    const otherProfile = await seedProfile(otherUser.id);
    const otherService = await seedService(otherProfile.id, { name: "Alheio" });

    const { POST } = await import("@/app/api/storefront-view/route");
    // slug da PRIMEIRA vitrine, serviceId da segunda → não conta.
    await POST(makeRequest({ slug, serviceId: otherService.id }));

    const rows = await testDb.itemView.findMany({});
    expect(rows.length).toBe(0);
  });

  it("não conta view de item quando o visitante é o dono", async () => {
    const service = await seedService(profileId, { name: "Reforma" });
    const { auth } = await import("@/auth");
    vi.mocked(auth).mockResolvedValue({ user: { id: ownerId } } as never);

    const { POST } = await import("@/app/api/storefront-view/route");
    await POST(makeRequest({ slug, serviceId: service.id }));

    const rows = await testDb.itemView.findMany({});
    expect(rows.length).toBe(0);
  });
```
Note: confirm `seedService(profileId, { name })` exists and creates an ACTIVE service (`isActive: true`) — read `tests/integration/helpers.ts`. If it does not default to active, pass `{ name, isActive: true }` or adapt.

- [ ] **Step 4: Ensure the test DB has the `ItemView` table**

The integration test DB is synced with `prisma db push` (not migrations). If the test run errors that `ItemView` does not exist, sync it (the test DB is ephemeral). Find the test DB URL used by `vitest.integration.config.ts` (it sets a test `DATABASE_URL`), then run:
`DATABASE_URL="<test-db-url>" npx prisma db push --skip-generate`
(Follow the same approach used previously for `StorefrontView` in fase 1.)

- [ ] **Step 5: Run the integration tests**

Run: `npx vitest --config vitest.integration.config.ts run tests/integration/storefront-view.test.ts`
Expected: all passing (the 7 previous + 3 new = 10). Postgres must be up.

- [ ] **Step 6: Verify types + lint**

Run: `npx tsc --noEmit 2>&1 | grep -vE "^tests/" | grep -c "error TS"` → `0`.
Run: `npx eslint app/api/storefront-view/route.ts` → no errors.

- [ ] **Step 7: Commit**

```bash
git add app/api/storefront-view/route.ts tests/integration/storefront-view.test.ts tests/integration/setup.ts
git commit -m "feat: endpoint registra views por item"
```

---

## Task 3: Beacon com `serviceId` na página de orçamento

**Files:**
- Modify: `components/public/StorefrontViewBeacon.tsx`
- Modify: `app/u/[slug]/orcamento/page.tsx`

- [ ] **Step 1: Generalize the beacon**

Replace the contents of `components/public/StorefrontViewBeacon.tsx` with:

```tsx
"use client";

import { useEffect } from "react";

// Conta uma visita (vitrine) ou uma view de item (quando serviceId é passado),
// no máximo uma vez por sessão de browser por chave (dedupe via sessionStorage —
// sem cookie, sem PII). Erros silenciosos: a métrica nunca quebra a página.
export function StorefrontViewBeacon({
  slug,
  serviceId,
}: {
  slug: string;
  serviceId?: string;
}) {
  useEffect(() => {
    const key = serviceId ? `sv-${slug}-item-${serviceId}` : `sv-${slug}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      // sessionStorage indisponível: segue sem dedupe.
    }

    void fetch("/api/storefront-view", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(serviceId ? { slug, serviceId } : { slug }),
      keepalive: true,
    }).catch(() => {});
  }, [slug, serviceId]);

  return null;
}
```

(This is backward compatible: the storefront page keeps calling `<StorefrontViewBeacon slug={slug} />` with no `serviceId`.)

- [ ] **Step 2: Render the item beacon on the orçamento page**

In `app/u/[slug]/orcamento/page.tsx`:
- `slug` is available via `const { slug } = await params;` and `selectedService` (possibly null) via the existing logic (a service object with `.id`).
- Add the import (with the other imports):
```ts
import { StorefrontViewBeacon } from "@/components/public/StorefrontViewBeacon";
```
- In the returned JSX, near the top of the page's root element, render the beacon only when an item is selected:
```tsx
      {selectedService ? (
        <StorefrontViewBeacon slug={slug} serviceId={selectedService.id} />
      ) : null}
```

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit 2>&1 | grep -vE "^tests/" | grep -c "error TS"` → `0`.
Run: `npx eslint components/public/StorefrontViewBeacon.tsx "app/u/[slug]/orcamento/page.tsx"` → no errors.

- [ ] **Step 4: Commit**

```bash
git add components/public/StorefrontViewBeacon.tsx "app/u/[slug]/orcamento/page.tsx"
git commit -m "feat: beacon de view de item na página de orçamento"
```

---

## Task 4: Flag de plano `storefrontAnalytics`

**Files:**
- Modify: `lib/plan-limits.ts`
- Test: `tests/unit/plan-limits.test.ts`

- [ ] **Step 1: Write the failing test**

In `tests/unit/plan-limits.test.ts`, add (import `canUseStorefrontAnalytics` at the top alongside the existing imports from `@/lib/plan-limits`):

```ts
describe("canUseStorefrontAnalytics", () => {
  it("é PRO-only", () => {
    expect(canUseStorefrontAnalytics("FREE")).toBe(false);
    expect(canUseStorefrontAnalytics("PRO")).toBe(true);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run tests/unit/plan-limits.test.ts`
Expected: FAIL — `canUseStorefrontAnalytics` não existe.

- [ ] **Step 3: Implement**

In `lib/plan-limits.ts`:
- Extend the `PLAN_FEATURES` value type and both entries:
```ts
export const PLAN_FEATURES: Record<
  PlanTier,
  { serviceImages: boolean; themePresets: boolean; storefrontAnalytics: boolean }
> = {
  // Foto por item é FREE (o limite de 3 itens já limita a 3 fotos); o gatilho
  // PRO fica em itens/propostas ilimitados, temas visuais e analytics detalhado.
  FREE: { serviceImages: true, themePresets: false, storefrontAnalytics: false },
  PRO: { serviceImages: true, themePresets: true, storefrontAnalytics: true }
};
```
- Add the helper near `canUseThemePresets`:
```ts
export const canUseStorefrontAnalytics = (plan: PlanTier) =>
  PLAN_FEATURES[plan].storefrontAnalytics;
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/unit/plan-limits.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/plan-limits.ts tests/unit/plan-limits.test.ts
git commit -m "feat: flag de plano storefrontAnalytics (PRO)"
```

---

## Task 5: Ranking + card "Itens mais vistos" na dashboard

**Files:**
- Modify: `lib/dashboard.ts`
- Test: `tests/unit/item-view-ranking.test.ts`
- Create: `components/dashboard/DashboardTopItemsCard.tsx`
- Modify: `app/(dashboard)/dashboard/page.tsx`

- [ ] **Step 1: Write the failing test for the merge helper**

Create `tests/unit/item-view-ranking.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { mergeItemViewRanking } from "@/lib/dashboard";

describe("mergeItemViewRanking", () => {
  it("preserva a ordem do ranking e junta os nomes", () => {
    const groups = [
      { serviceId: "b", _sum: { count: 10 } },
      { serviceId: "a", _sum: { count: 4 } },
    ];
    const names = [
      { id: "a", name: "Item A" },
      { id: "b", name: "Item B" },
    ];
    expect(mergeItemViewRanking(groups, names)).toEqual([
      { serviceId: "b", name: "Item B", count: 10 },
      { serviceId: "a", name: "Item A", count: 4 },
    ]);
  });

  it("descarta grupos sem nome correspondente (item removido)", () => {
    const groups = [
      { serviceId: "a", _sum: { count: 3 } },
      { serviceId: "sumiu", _sum: { count: 99 } },
    ];
    const names = [{ id: "a", name: "Item A" }];
    expect(mergeItemViewRanking(groups, names)).toEqual([
      { serviceId: "a", name: "Item A", count: 3 },
    ]);
  });

  it("trata _sum.count nulo como 0", () => {
    const groups = [{ serviceId: "a", _sum: { count: null } }];
    const names = [{ id: "a", name: "Item A" }];
    expect(mergeItemViewRanking(groups, names)).toEqual([
      { serviceId: "a", name: "Item A", count: 0 },
    ]);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run tests/unit/item-view-ranking.test.ts`
Expected: FAIL — `mergeItemViewRanking` não existe.

- [ ] **Step 3: Implement in `lib/dashboard.ts`**

Add near the other builders:
```ts
export type TopItem = { serviceId: string; name: string; count: number };

// Junta o resultado do groupBy com os nomes, preservando a ordem do ranking
// (o groupBy já vem ordenado por count desc) e descartando itens sem nome
// (removidos entre a agregação e a leitura).
export function mergeItemViewRanking(
  groups: Array<{ serviceId: string; _sum: { count: number | null } }>,
  names: Array<{ id: string; name: string }>
): TopItem[] {
  const nameById = new Map(names.map((n) => [n.id, n.name]));
  return groups.flatMap((group) => {
    const name = nameById.get(group.serviceId);
    if (name === undefined) return [];
    return [{ serviceId: group.serviceId, name, count: group._sum.count ?? 0 }];
  });
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/unit/item-view-ranking.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Create the card**

Create `components/dashboard/DashboardTopItemsCard.tsx`:

```tsx
import Link from "next/link";

import { Card } from "@/components/ui/Card";
import type { TopItem } from "@/lib/dashboard";

type DashboardTopItemsCardProps = {
  isPro: boolean;
  topItems: TopItem[];
};

export function DashboardTopItemsCard({
  isPro,
  topItems,
}: DashboardTopItemsCardProps) {
  return (
    <Card className="mt-8 p-5 sm:p-6">
      <p className="text-xs font-semibold uppercase tracking-widest text-ink-muted">
        Itens mais vistos
      </p>

      {!isPro ? (
        <>
          <p className="mt-2 text-sm text-ink">
            Descubra quais itens da sua vitrine geram mais interesse.
          </p>
          <Link
            className="mt-3 inline-flex min-h-9 items-center justify-center rounded-md bg-leaf px-4 text-xs font-semibold text-white transition hover:bg-leaf-hover"
            href="/dashboard/billing"
          >
            Descobrir no Pro →
          </Link>
        </>
      ) : topItems.length === 0 ? (
        <p className="mt-2 text-sm text-ink-muted">
          Ainda sem visitas em itens. Compartilhe os links dos seus itens.
        </p>
      ) : (
        <ol className="mt-3 grid gap-2">
          {topItems.map((item, index) => (
            <li
              className="flex items-center justify-between gap-3"
              key={item.serviceId}
            >
              <span className="flex min-w-0 items-center gap-2 text-sm text-ink">
                <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-mint text-xs font-semibold text-leaf">
                  {index + 1}
                </span>
                <span className="truncate">{item.name}</span>
              </span>
              <span className="shrink-0 font-fraunces text-base font-bold text-ink">
                {item.count}
              </span>
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}
```

- [ ] **Step 6: Wire aggregation + render in the dashboard page**

In `app/(dashboard)/dashboard/page.tsx`:

Add imports:
```ts
import { DashboardTopItemsCard } from "@/components/dashboard/DashboardTopItemsCard";
import { canUseStorefrontAnalytics } from "@/lib/plan-limits";
```
Add `mergeItemViewRanking` and the `TopItem` type to the EXISTING `@/lib/dashboard` import.

After the fase-1 views block (which defines `viewsCutoff30` and `viewsSummary`), add:
```ts
  const canSeeItemViews = profile
    ? canUseStorefrontAnalytics(profile.plan)
    : false;

  let topItems: TopItem[] = [];
  if (profile && canSeeItemViews) {
    const itemViewGroups = await prisma.itemView.groupBy({
      by: ["serviceId"],
      where: {
        service: { providerId: profile.id },
        date: { gte: viewsCutoff30 },
      },
      _sum: { count: true },
      orderBy: { _sum: { count: "desc" } },
      take: 5,
    });
    const itemNames = await prisma.service.findMany({
      where: { id: { in: itemViewGroups.map((g) => g.serviceId) } },
      select: { id: true, name: true },
    });
    topItems = mergeItemViewRanking(itemViewGroups, itemNames);
  }
```
Note: `viewsCutoff30` is already in scope from the fase-1 block. `canUseStorefrontAnalytics` is imported above.

Render the card in the JSX immediately AFTER `<DashboardViewsCard summary={viewsSummary} />`:
```tsx
      <DashboardTopItemsCard isPro={canSeeItemViews} topItems={topItems} />
```

- [ ] **Step 7: Verify**

Run: `npx vitest run tests/unit/item-view-ranking.test.ts` → PASS.
Run: `npx tsc --noEmit 2>&1 | grep -vE "^tests/" | grep -c "error TS"` → `0`.
Run: `npx eslint lib/dashboard.ts components/dashboard/DashboardTopItemsCard.tsx "app/(dashboard)/dashboard/page.tsx"` → no errors.

- [ ] **Step 8: Commit**

```bash
git add lib/dashboard.ts tests/unit/item-view-ranking.test.ts components/dashboard/DashboardTopItemsCard.tsx "app/(dashboard)/dashboard/page.tsx"
git commit -m "feat: card de itens mais vistos na dashboard (PRO)"
```

---

## Task 6: Documentação

**Files:**
- Modify: `docs/PROJECT_OVERVIEW.md`, `docs/DATABASE.md`, `docs/ROADMAP.md`, `docs/BACKLOG_TECNICO.md`

- [ ] **Step 1: PROJECT_OVERVIEW.md**

Em "Entidades principais":
```markdown
- `ItemView`: contagem de views (interesse) por item, agregada por dia (`(serviceId, date)`).
```
Em "Decisões de produto":
```markdown
- **Itens mais vistos são PRO**: a dashboard mostra o ranking dos itens que mais geram interesse (abertura da página de orçamento do item, últimos 30 dias). FREE vê um card de upsell. Gating via `canUseStorefrontAnalytics`. Origem do tráfego fica para a fase 3 (links marcados — referrer é enganoso em navegadores in-app).
```

- [ ] **Step 2: DATABASE.md**

Documente o model `ItemView`: colunas `serviceId`, `date` (`@db.Date`), `count`; PK composta `(serviceId, date)`; `onDelete: Cascade`; escrita via `upsert increment` pelo endpoint `POST /api/storefront-view` (com `serviceId`); leitura via `groupBy` (top 5, 30 dias) na dashboard para PRO.

- [ ] **Step 3: ROADMAP.md**

Adicione em "Concluído":
```markdown
- Itens mais vistos na dashboard (ranking top 5, PRO) — fase 2 das estatísticas de visitas
```

- [ ] **Step 4: BACKLOG_TECNICO.md**

No item de estatísticas de visitas (1.5, criado na fase 1), marque a **fase 2 (per-item + gating PRO) como entregue** e ajuste o "próximo passo" para a **fase 3: origem do tráfego via links marcados (`?ref=`)** — não usar referrer por ser não confiável em navegadores in-app de Instagram/WhatsApp.

- [ ] **Step 5: Commit**

```bash
git add docs/PROJECT_OVERVIEW.md docs/DATABASE.md docs/ROADMAP.md docs/BACKLOG_TECNICO.md
git commit -m "docs: registra fase 2 (itens mais vistos, PRO)"
```

---

## Verificação final

- [ ] `npx vitest run tests/unit/item-view-ranking.test.ts tests/unit/plan-limits.test.ts` — verde.
- [ ] `npx vitest --config vitest.integration.config.ts run tests/integration/storefront-view.test.ts` — verde (10 testes; Postgres up).
- [ ] `npx tsc --noEmit` — 0 erros fora de `tests/` pré-existentes.
- [ ] `npx eslint .` — sem novos erros nos arquivos tocados.
- [ ] Manual (dev server, conta PRO): abrir um item pela vitrine (`/u/<slug>/orcamento?serviceId=...`) em aba anônima → repetir com outro item → dashboard mostra "Itens mais vistos" com ranking. Conta FREE: card mostra upsell "Descobrir no Pro". Abrir item logado como dono: NÃO conta.

## Notas de teste

- Helpers puros (`mergeItemViewRanking`, `canUseStorefrontAnalytics`) têm unit tests; o endpoint (agora com item) tem integração com DB real (happy path, item de outra vitrine, dono). Beacon/card verificados por `tsc`/`eslint` + checagem manual, coerente com o padrão do repo e da fase 1.
- Origem do tráfego NÃO faz parte desta fase (fase 3, via links marcados).
