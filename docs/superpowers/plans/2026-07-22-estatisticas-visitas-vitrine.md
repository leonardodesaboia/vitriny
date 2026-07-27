# Estatísticas de visitas da vitrine — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Contar as visitas à vitrine pública (agregado por dia) e mostrar ao dono na dashboard ("Sua vitrine foi vista N vezes esta semana"), FREE, sem PII/cookie.

**Architecture:** Um beacon client no `/u/[slug]` faz `POST /api/storefront-view` no mount (dedupe por sessão via `sessionStorage`); o endpoint filtra dono/bot e faz `upsert increment` num model `StorefrontView` agregado por dia. A dashboard soma os últimos 7/30 dias e renderiza um card. Lógica pura (bot/owner, framing) isolada em helpers testáveis.

**Tech Stack:** Next.js (App Router, Route Handlers, Server Components), Prisma/PostgreSQL, React 19 (`useEffect`/`sessionStorage`), Vitest (unit + integração com DB real).

**Spec:** `docs/superpowers/specs/2026-07-22-estatisticas-visitas-vitrine-design.md`

---

## File structure

- Create `lib/storefront-views.ts` — helpers puros: `isCountableView`, `BOT_UA_PATTERN`, `toDayBucket`.
- Create `tests/unit/storefront-views.test.ts` — testes do helper.
- Modify `prisma/schema.prisma` — model `StorefrontView` + relação inversa em `ProviderProfile`.
- Create `app/api/storefront-view/route.ts` — endpoint POST que registra a visita.
- Create `tests/integration/storefront-view.test.ts` — testes do endpoint.
- Modify `tests/integration/setup.ts` — incluir `StorefrontView` na limpeza (se enumerada).
- Create `components/public/StorefrontViewBeacon.tsx` — beacon client.
- Modify `app/u/[slug]/page.tsx` — renderiza o beacon.
- Modify `lib/dashboard.ts` — `buildStorefrontViewsSummary` (view model + framing).
- Create `tests/unit/storefront-views-summary.test.ts` — testes do framing.
- Create `components/dashboard/DashboardViewsCard.tsx` — card.
- Modify `app/(dashboard)/dashboard/page.tsx` — agrega 7/30 dias e renderiza o card.
- Modify docs: `PROJECT_OVERVIEW.md`, `DATABASE.md`, `ROADMAP.md`, `BACKLOG_TECNICO.md`.

---

## Task 1: Helper `lib/storefront-views.ts` (TDD)

**Files:**
- Create: `lib/storefront-views.ts`
- Test: `tests/unit/storefront-views.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/unit/storefront-views.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import {
  BOT_UA_PATTERN,
  isCountableView,
  toDayBucket,
} from "@/lib/storefront-views";

describe("isCountableView", () => {
  it("não conta o dono logado", () => {
    expect(
      isCountableView({ userAgent: "Mozilla/5.0", isOwner: true })
    ).toBe(false);
  });

  it("não conta User-Agents de bot/preview", () => {
    for (const ua of [
      "facebookexternalhit/1.1",
      "WhatsApp/2.23",
      "Googlebot/2.1",
      "Mozilla/5.0 (compatible; bingbot/2.0)",
      "HeadlessChrome/120",
    ]) {
      expect(isCountableView({ userAgent: ua, isOwner: false })).toBe(false);
    }
  });

  it("conta um navegador normal de visitante", () => {
    expect(
      isCountableView({
        userAgent:
          "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) AppleWebKit/605.1.15 Safari/604.1",
        isOwner: false,
      })
    ).toBe(true);
  });

  it("conta quando o User-Agent é ausente (não é sinal de bot)", () => {
    expect(isCountableView({ userAgent: null, isOwner: false })).toBe(true);
  });
});

describe("toDayBucket", () => {
  it("zera a hora (meia-noite UTC do mesmo dia)", () => {
    const bucket = toDayBucket(new Date("2026-07-22T18:45:30.000Z"));
    expect(bucket.toISOString()).toBe("2026-07-22T00:00:00.000Z");
  });

  it("dois horários do mesmo dia geram o mesmo bucket", () => {
    const a = toDayBucket(new Date("2026-07-22T01:00:00.000Z"));
    const b = toDayBucket(new Date("2026-07-22T23:00:00.000Z"));
    expect(a.getTime()).toBe(b.getTime());
  });
});

describe("BOT_UA_PATTERN", () => {
  it("é uma RegExp", () => {
    expect(BOT_UA_PATTERN).toBeInstanceOf(RegExp);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/unit/storefront-views.test.ts`
Expected: FAIL — `Cannot find module '@/lib/storefront-views'`.

- [ ] **Step 3: Write the helper**

Create `lib/storefront-views.ts`:

```ts
// Backstop de detecção de bot/crawler/preview de link. A maioria desses agentes
// nem executa o beacon (client JS), então isto pega só os que rodam JS.
export const BOT_UA_PATTERN =
  /bot|crawl|spider|slurp|mediapartners|facebookexternalhit|whatsapp|telegram|bingpreview|preview|headless|phantom|puppeteer|playwright|lighthouse|pingdom|uptime/i;

// Deve esta visita ser contada? Exclui o dono logado e User-Agents de bot.
export function isCountableView(input: {
  userAgent: string | null;
  isOwner: boolean;
}): boolean {
  if (input.isOwner) return false;
  if (input.userAgent && BOT_UA_PATTERN.test(input.userAgent)) return false;
  return true;
}

// Bucket de dia: meia-noite UTC da data informada (para agregação por dia).
export function toDayBucket(now: Date): Date {
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/unit/storefront-views.test.ts`
Expected: PASS. If a test fails, the tests are the source of truth — fix the helper, not the tests.

- [ ] **Step 5: Commit**

```bash
git add lib/storefront-views.ts tests/unit/storefront-views.test.ts
git commit -m "feat: helper de contagem de visitas da vitrine"
```

---

## Task 2: Model `StorefrontView` no schema

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add the model and the inverse relation**

In `prisma/schema.prisma`, inside `model ProviderProfile { ... }`, add this line alongside the other relation fields (near `proposalTemplates ProposalTemplate[]`):

```prisma
  storefrontViews   StorefrontView[]
```

Then add the new model at the end of the file (or near the other `ProviderProfile`-owned models):

```prisma
model StorefrontView {
  providerId String
  // Bucket de dia (só data). Uma linha por (vitrine, dia); count agrega os hits.
  date       DateTime @db.Date
  count      Int      @default(0)

  provider ProviderProfile @relation(fields: [providerId], references: [id], onDelete: Cascade)

  @@id([providerId, date])
}
```

- [ ] **Step 2: Create and apply the migration**

Run: `npx prisma migrate dev --name add_storefront_view`
Expected: cria `prisma/migrations/<timestamp>_add_storefront_view/` com um `CREATE TABLE "StorefrontView"` e roda `prisma generate`. Postgres já roda no docker-compose (porta 5432).

**CRITICAL SAFETY:** Se o Prisma pedir **reset** do banco ou avisar de perda de dados, PARE e reporte BLOCKED com a saída completa. Não aceite reset. O esperado é uma criação de tabela aditiva, sem reset.

- [ ] **Step 3: Typecheck confirms the client updated**

Run: `npx tsc --noEmit 2>&1 | grep -iE "storefrontView|storefront-view" || echo "sem erros relacionados"`
Expected: `sem erros relacionados` (o model existe no client).

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat: model StorefrontView (visitas agregadas por dia)"
```

---

## Task 3: Endpoint `POST /api/storefront-view`

**Files:**
- Create: `app/api/storefront-view/route.ts`
- Test: `tests/integration/storefront-view.test.ts`
- Modify (se necessário): `tests/integration/setup.ts`

- [ ] **Step 1: Write the route handler**

Create `app/api/storefront-view/route.ts`:

```ts
import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isCountableView, toDayBucket } from "@/lib/storefront-views";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let slug: unknown;
  try {
    const body = await request.json();
    slug = (body as { slug?: unknown } | null)?.slug;
  } catch {
    return new NextResponse(null, { status: 400 });
  }

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
    await prisma.storefrontView.upsert({
      where: { providerId_date: { providerId: profile.id, date } },
      create: { providerId: profile.id, date, count: 1 },
      update: { count: { increment: 1 } },
    });
  } catch (error) {
    // A métrica nunca pode quebrar a vitrine; loga e segue.
    console.error("storefront-view upsert failed", error);
  }

  return new NextResponse(null, { status: 204 });
}
```

- [ ] **Step 2: Ensure the test DB cleanup covers the new table**

Open `tests/integration/setup.ts`. If `cleanDatabase` deletes tables by an explicit list (e.g. `testDb.<model>.deleteMany`), add `StorefrontView` BEFORE `ProviderProfile` (child first). If it truncates/deletes generically or relies on cascade, no change is needed. Example line to add if there is an explicit list:

```ts
  await testDb.storefrontView.deleteMany();
```

- [ ] **Step 3: Write the integration test**

Create `tests/integration/storefront-view.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

import { cleanDatabase, testDb } from "./setup";
import { seedProfile, seedUser } from "./helpers";

vi.mock("@/auth", () => ({ auth: vi.fn() }));

let ownerId: string;
let profileId: string;
let slug: string;

beforeEach(async () => {
  vi.resetModules();
  await cleanDatabase();

  const user = await seedUser();
  ownerId = user.id;
  const profile = await seedProfile(ownerId);
  profileId = profile.id;
  slug = profile.slug;
  // O endpoint só conta vitrine publicada.
  await testDb.providerProfile.update({
    where: { id: profileId },
    data: { isPublished: true },
  });

  const { auth } = await import("@/auth");
  // Visitante anônimo por padrão (sem sessão).
  vi.mocked(auth).mockResolvedValue(null as never);
});

function makeRequest(body: unknown, userAgent = "Mozilla/5.0") {
  return new Request("http://localhost/api/storefront-view", {
    method: "POST",
    headers: { "content-type": "application/json", "user-agent": userAgent },
    body: JSON.stringify(body),
  });
}

describe("POST /api/storefront-view (integração)", () => {
  it("incrementa a mesma linha em dois POSTs no mesmo dia", async () => {
    const { POST } = await import("@/app/api/storefront-view/route");
    await POST(makeRequest({ slug }));
    await POST(makeRequest({ slug }));

    const rows = await testDb.storefrontView.findMany({
      where: { providerId: profileId },
    });
    expect(rows.length).toBe(1);
    expect(rows[0].count).toBe(2);
  });

  it("não conta o dono logado", async () => {
    const { auth } = await import("@/auth");
    vi.mocked(auth).mockResolvedValue({ user: { id: ownerId } } as never);

    const { POST } = await import("@/app/api/storefront-view/route");
    await POST(makeRequest({ slug }));

    const rows = await testDb.storefrontView.findMany({
      where: { providerId: profileId },
    });
    expect(rows.length).toBe(0);
  });

  it("não conta User-Agent de bot", async () => {
    const { POST } = await import("@/app/api/storefront-view/route");
    await POST(makeRequest({ slug }, "facebookexternalhit/1.1"));

    const rows = await testDb.storefrontView.findMany({
      where: { providerId: profileId },
    });
    expect(rows.length).toBe(0);
  });

  it("responde 204 e não cria linha para slug inexistente", async () => {
    const { POST } = await import("@/app/api/storefront-view/route");
    const res = await POST(makeRequest({ slug: "nao-existe" }));

    expect(res.status).toBe(204);
    const rows = await testDb.storefrontView.findMany({});
    expect(rows.length).toBe(0);
  });
});
```

Note: confirm `seedProfile(userId)` returns an object with `id` and `slug` (read `tests/integration/helpers.ts`). If its signature differs, adapt the seeding but keep the assertions.

- [ ] **Step 4: Run the integration test**

Run: `npx vitest --config vitest.integration.config.ts run tests/integration/storefront-view.test.ts`
Expected: PASS (4 tests). Requires the Postgres from docker-compose to be up.

- [ ] **Step 5: Typecheck + lint**

Run: `npx tsc --noEmit 2>&1 | grep -vE "^tests/" | grep -c "error TS"` → expected `0`.
Run: `npx eslint app/api/storefront-view/route.ts` → expected no errors.

- [ ] **Step 6: Commit**

```bash
git add app/api/storefront-view/route.ts tests/integration/storefront-view.test.ts tests/integration/setup.ts
git commit -m "feat: endpoint que registra visitas da vitrine"
```

---

## Task 4: Beacon client na vitrine pública

**Files:**
- Create: `components/public/StorefrontViewBeacon.tsx`
- Modify: `app/u/[slug]/page.tsx`

- [ ] **Step 1: Create the beacon component**

Create `components/public/StorefrontViewBeacon.tsx`:

```tsx
"use client";

import { useEffect } from "react";

// Dispara uma contagem de visita, no máximo uma vez por sessão de browser por
// vitrine (dedupe via sessionStorage — sem cookie, sem PII). Erros são
// silenciosos: a métrica nunca pode quebrar a vitrine.
export function StorefrontViewBeacon({ slug }: { slug: string }) {
  useEffect(() => {
    const key = `sv-${slug}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      // sessionStorage indisponível: segue sem dedupe.
    }

    void fetch("/api/storefront-view", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ slug }),
      keepalive: true,
    }).catch(() => {});
  }, [slug]);

  return null;
}
```

- [ ] **Step 2: Render it on the public page**

In `app/u/[slug]/page.tsx`:

Add the import (with the other component imports):
```ts
import { StorefrontViewBeacon } from "@/components/public/StorefrontViewBeacon";
```

Inside the returned `<main ...>` (near the top, e.g. right after the opening `<main>` tag / hero), render the beacon using the profile's slug:
```tsx
      <StorefrontViewBeacon slug={profile.slug} />
```
(`profile.slug` is already selected/available on this page. If only the route `slug` param is in scope, use that instead — either is fine.)

- [ ] **Step 3: Typecheck + lint**

Run: `npx tsc --noEmit 2>&1 | grep -vE "^tests/" | grep -c "error TS"` → expected `0`.
Run: `npx eslint components/public/StorefrontViewBeacon.tsx "app/u/[slug]/page.tsx"` → expected no errors.

- [ ] **Step 4: Commit**

```bash
git add components/public/StorefrontViewBeacon.tsx "app/u/[slug]/page.tsx"
git commit -m "feat: beacon de visita na vitrine pública"
```

---

## Task 5: Card de visitas na dashboard

**Files:**
- Modify: `lib/dashboard.ts`
- Test: `tests/unit/storefront-views-summary.test.ts`
- Create: `components/dashboard/DashboardViewsCard.tsx`
- Modify: `app/(dashboard)/dashboard/page.tsx`

- [ ] **Step 1: Write the failing test for the summary/framing helper**

Create `tests/unit/storefront-views-summary.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { buildStorefrontViewsSummary } from "@/lib/dashboard";

describe("buildStorefrontViewsSummary", () => {
  it("sem nenhuma view: incentivo a divulgar", () => {
    const s = buildStorefrontViewsSummary({
      views7: 0,
      views30: 0,
      hasRecentOrders: false,
    });
    expect(s.views7).toBe(0);
    expect(s.message).toBe("Comece a divulgar o link da sua vitrine.");
  });

  it("views mas nenhum pedido recente: dica acionável", () => {
    const s = buildStorefrontViewsSummary({
      views7: 12,
      views30: 40,
      hasRecentOrders: false,
    });
    expect(s.views7).toBe(12);
    expect(s.message).toBe(
      "Muita gente viu — que tal revisar preço, foto ou o texto dos itens?"
    );
  });

  it("views e pedidos: mostra total de 30 dias", () => {
    const s = buildStorefrontViewsSummary({
      views7: 12,
      views30: 40,
      hasRecentOrders: true,
    });
    expect(s.message).toBe("40 nos últimos 30 dias");
  });

  it("sem view na semana mas com histórico no mês: mostra 30 dias", () => {
    const s = buildStorefrontViewsSummary({
      views7: 0,
      views30: 8,
      hasRecentOrders: false,
    });
    expect(s.message).toBe("8 nos últimos 30 dias");
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run tests/unit/storefront-views-summary.test.ts`
Expected: FAIL — `buildStorefrontViewsSummary` não existe.

- [ ] **Step 3: Implement the helper in `lib/dashboard.ts`**

Add to `lib/dashboard.ts` (near `buildMonthlyRevenueSummary`):

```ts
export type StorefrontViewsSummary = {
  views7: number;
  message: string;
};

// View model do card de visitas. O framing evita desânimo: nunca acusa
// "views sem pedido", vira dica acionável.
export function buildStorefrontViewsSummary(input: {
  views7: number;
  views30: number;
  hasRecentOrders: boolean;
}): StorefrontViewsSummary {
  const { views7, views30, hasRecentOrders } = input;

  if (views30 === 0) {
    return { views7, message: "Comece a divulgar o link da sua vitrine." };
  }

  if (views7 > 0 && !hasRecentOrders) {
    return {
      views7,
      message:
        "Muita gente viu — que tal revisar preço, foto ou o texto dos itens?",
    };
  }

  return { views7, message: `${views30} nos últimos 30 dias` };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/unit/storefront-views-summary.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Create the card component**

Create `components/dashboard/DashboardViewsCard.tsx`:

```tsx
import { Card } from "@/components/ui/Card";
import type { StorefrontViewsSummary } from "@/lib/dashboard";

export function DashboardViewsCard({
  summary,
}: {
  summary: StorefrontViewsSummary;
}) {
  return (
    <Card className="mt-8 p-5 sm:p-6">
      <p className="text-xs font-semibold uppercase tracking-widest text-ink-muted">
        Visitas à vitrine
      </p>
      <p className="mt-2 font-fraunces text-4xl font-bold text-ink">
        {summary.views7}{" "}
        <span className="font-jakarta text-base font-semibold text-ink-muted">
          esta semana
        </span>
      </p>
      <p className="mt-2 text-xs text-ink-muted">{summary.message}</p>
    </Card>
  );
}
```

- [ ] **Step 6: Wire aggregation + render in the dashboard page**

In `app/(dashboard)/dashboard/page.tsx`:

Add imports (with the others):
```ts
import { DashboardViewsCard } from "@/components/dashboard/DashboardViewsCard";
import { toDayBucket } from "@/lib/storefront-views";
```
And extend the existing `@/lib/dashboard` import to include `buildStorefrontViewsSummary` (it already imports `buildMonthlyRevenueSummary` and `buildOnboardingOutcomeStep` from there).

After `revenueSummary` is built (search for `const revenueSummary = buildMonthlyRevenueSummary(`), add the aggregation. `profile.id` and `monthlyQuoteRequests` are already in scope:
```ts
  const today = toDayBucket(new Date());
  const viewsCutoff7 = new Date(today);
  viewsCutoff7.setUTCDate(viewsCutoff7.getUTCDate() - 6); // janela de 7 dias incl. hoje
  const viewsCutoff30 = new Date(today);
  viewsCutoff30.setUTCDate(viewsCutoff30.getUTCDate() - 29);

  const [views7Agg, views30Agg] = await Promise.all([
    prisma.storefrontView.aggregate({
      _sum: { count: true },
      where: { providerId: profile.id, date: { gte: viewsCutoff7 } },
    }),
    prisma.storefrontView.aggregate({
      _sum: { count: true },
      where: { providerId: profile.id, date: { gte: viewsCutoff30 } },
    }),
  ]);

  const viewsSummary = buildStorefrontViewsSummary({
    views7: views7Agg._sum.count ?? 0,
    views30: views30Agg._sum.count ?? 0,
    hasRecentOrders: monthlyQuoteRequests > 0,
  });
```
Note: if `monthlyQuoteRequests` is not the exact variable name for "this month's quote request count", use whichever existing variable holds that count; the goal is `hasRecentOrders = (this month's orders) > 0`.

Then render the card in the JSX immediately BEFORE `<DashboardRevenueCard summary={revenueSummary} />` (funil topo→fundo):
```tsx
      <DashboardViewsCard summary={viewsSummary} />
```

- [ ] **Step 7: Verify**

Run: `npx vitest run tests/unit/storefront-views-summary.test.ts` → PASS.
Run: `npx tsc --noEmit 2>&1 | grep -vE "^tests/" | grep -c "error TS"` → `0`.
Run: `npx eslint components/dashboard/DashboardViewsCard.tsx lib/dashboard.ts "app/(dashboard)/dashboard/page.tsx"` → no errors.

- [ ] **Step 8: Commit**

```bash
git add lib/dashboard.ts tests/unit/storefront-views-summary.test.ts components/dashboard/DashboardViewsCard.tsx "app/(dashboard)/dashboard/page.tsx"
git commit -m "feat: card de visitas da vitrine na dashboard"
```

---

## Task 6: Documentação

**Files:**
- Modify: `docs/PROJECT_OVERVIEW.md`, `docs/DATABASE.md`, `docs/ROADMAP.md`, `docs/BACKLOG_TECNICO.md`

- [ ] **Step 1: PROJECT_OVERVIEW.md**

Na seção "Entidades principais", adicione:
```markdown
- `StorefrontView`: contagem de visitas da vitrine agregada por dia (`(providerId, date)`).
```
E em "Decisões de produto":
```markdown
- **Estatísticas de visitas são FREE**: a dashboard mostra quantas vezes a vitrine foi vista (últimos 7/30 dias). Contagem via beacon client, agregada por dia, sem PII/cookie (dedupe por sessão em `sessionStorage`); exclui o dono logado e bots. Detalhe por item/origem fica para a fase 2 (PRO).
```

- [ ] **Step 2: DATABASE.md**

Na área dos models de `ProviderProfile`, documente `StorefrontView`: colunas `providerId`, `date` (`@db.Date`), `count`; PK composta `(providerId, date)`; `onDelete: Cascade`; escrita via `upsert increment` no endpoint `/api/storefront-view`.

- [ ] **Step 3: ROADMAP.md**

Adicione em "Concluído":
```markdown
- Estatísticas de visitas da vitrine na dashboard (últimos 7/30 dias, FREE, sem PII)
```

- [ ] **Step 4: BACKLOG_TECNICO.md**

Junto do item de churn/retenção (o resumo financeiro 1.4 e a nota da linha ~283), registre que o contador de visitas foi entregue como companheiro de topo de funil, e aponte a **fase 2** como próximo passo: views por item, origem do tráfego e gating PRO do detalhe.

- [ ] **Step 5: Commit**

```bash
git add docs/PROJECT_OVERVIEW.md docs/DATABASE.md docs/ROADMAP.md docs/BACKLOG_TECNICO.md
git commit -m "docs: registra estatísticas de visitas da vitrine"
```

---

## Verificação final

- [ ] `npx vitest run tests/unit/storefront-views.test.ts tests/unit/storefront-views-summary.test.ts` — verde.
- [ ] `npx vitest --config vitest.integration.config.ts run tests/integration/storefront-view.test.ts` — verde (Postgres up).
- [ ] `npx tsc --noEmit` — 0 erros fora de `tests/` pré-existentes.
- [ ] `npx eslint .` — sem novos erros nos arquivos tocados.
- [ ] Manual (dev server): abrir `/u/<slug>` publicada em aba anônima → recarregar (não deve somar 2×) → fechar e reabrir (soma) → abrir a dashboard e ver o card "Visitas à vitrine"; abrir a própria vitrine logado como dono e confirmar que NÃO conta.

## Notas de teste

- Helpers puros (`storefront-views`, framing) têm unit tests; o endpoint tem teste de integração com DB real (increment idempotente, exclusão de dono/bot, slug inexistente). Beacon e card são verificados por `tsc`/`eslint` + checagem manual, coerente com o padrão do repo.
- Sem gating por plano: o card é FREE. Per-item/origem/PRO = fase 2 (fora deste plano).
