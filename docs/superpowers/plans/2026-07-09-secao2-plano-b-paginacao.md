# Seção 2 (plano B): paginação do painel de pedidos — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Painel de pedidos paginado por página (`?page=N`, 20/página) com filtros no banco, contadores via `groupBy`, e card-resumo que navega para o detalhe (accordion removido).

**Architecture:** Cada view do dashboard ganha um espelho Prisma `where` (`dashboardRequestViewWhere`) derivado da função pura já testada `matchesDashboardRequestView`. A lista busca só o resumo (sem `statusHistory`/`internalNotes`); a ordenação "informados primeiro" da view Pix vira `orderBy` no banco e a função JS `sortRequestsForDashboardView` é removida. O `QuoteRequestCard` vira `<Link>` para `/dashboard/pedidos/[id]`.

**Tech Stack:** Next 16, Prisma 6 (`groupBy`, sort `nulls`), vitest.

## Global Constraints

- Decisões do usuário: paginação `?page=N` (não cursor); accordion removido.
- `Decimal` nunca cruza server→client; testes `npx vitest run <arquivo>`; commits pequenos com trailers da sessão.
- Página fora do intervalo (0, negativa, NaN, além do fim) cai na página 1.

---

### Task 1: `dashboardRequestViewWhere` (TDD)

**Files:**
- Modify: `lib/dashboard.ts`
- Test: `tests/unit/dashboard.test.ts`

**Interfaces:**
- Produces: `dashboardRequestViewWhere(view: DashboardRequestView, monthRange: { start: Date; end: Date }, now?: Date): Prisma.QuoteRequestWhereInput` (import `Prisma` type de `@prisma/client`; usa `pixPaymentExpiryCutoff(now)` de `@/lib/utils/date`).

- [ ] **Step 1: Testes que falham** — shapes por view:

```ts
import { dashboardRequestViewWhere } from "@/lib/dashboard";

describe("dashboardRequestViewWhere", () => {
  const monthRange = {
    start: new Date("2026-07-01T00:00:00Z"),
    end: new Date("2026-08-01T00:00:00Z")
  };
  const now = new Date("2026-07-09T12:00:00Z");

  it("MONTH filtra por createdAt no mês", () => {
    expect(dashboardRequestViewWhere("MONTH", monthRange, now)).toEqual({
      createdAt: { gte: monthRange.start, lt: monthRange.end }
    });
  });

  it("OPEN exclui fechados", () => {
    expect(dashboardRequestViewWhere("OPEN", monthRange, now)).toEqual({
      status: { not: "CLOSED" }
    });
  });

  it("PIX_RESERVATION espelha a regra de expiração + informado", () => {
    const cutoff = new Date(now.getTime() - 48 * 60 * 60 * 1000);
    expect(
      dashboardRequestViewWhere("PIX_RESERVATION", monthRange, now)
    ).toEqual({
      pixReservationRequestedAt: { not: null },
      pixReservationPaidAt: null,
      OR: [
        { pixReservationRequestedAt: { gte: cutoff } },
        { pixReservationClientPaidAt: { not: null } }
      ]
    });
  });

  it("DEPOSIT espelha entrada aprovada não recebida", () => {
    expect(dashboardRequestViewWhere("DEPOSIT", monthRange, now)).toEqual({
      proposal: {
        is: {
          status: "APPROVED",
          depositAmount: { gt: 0 },
          depositPaidAt: null
        }
      }
    });
  });

  it("APPROVED_MONTH espelha aprovadas pelo respondedAt", () => {
    expect(
      dashboardRequestViewWhere("APPROVED_MONTH", monthRange, now)
    ).toEqual({
      proposal: {
        is: {
          status: "APPROVED",
          respondedAt: { gte: monthRange.start, lt: monthRange.end }
        }
      }
    });
  });
});
```

Run: `npx vitest run tests/unit/dashboard.test.ts` → FAIL.

- [ ] **Step 2: Implementar** em `lib/dashboard.ts` (import `type { Prisma }` de `@prisma/client` e `pixPaymentExpiryCutoff` de `@/lib/utils/date`):

```ts
// Espelho Prisma de matchesDashboardRequestView (fonte de verdade testada):
// permite filtrar no banco para paginar sem carregar tudo.
export function dashboardRequestViewWhere(
  view: DashboardRequestView,
  monthRange: MonthRange,
  now = new Date()
): Prisma.QuoteRequestWhereInput {
  switch (view) {
    case "MONTH":
      return { createdAt: { gte: monthRange.start, lt: monthRange.end } };
    case "OPEN":
      return { status: { not: "CLOSED" } };
    case "PIX_RESERVATION":
      return {
        pixReservationRequestedAt: { not: null },
        pixReservationPaidAt: null,
        OR: [
          { pixReservationRequestedAt: { gte: pixPaymentExpiryCutoff(now) } },
          { pixReservationClientPaidAt: { not: null } }
        ]
      };
    case "DEPOSIT":
      return {
        proposal: {
          is: { status: "APPROVED", depositAmount: { gt: 0 }, depositPaidAt: null }
        }
      };
    case "APPROVED_MONTH":
      return {
        proposal: {
          is: {
            status: "APPROVED",
            respondedAt: { gte: monthRange.start, lt: monthRange.end }
          }
        }
      };
  }
}
```

Run: PASS. Commit: `feat(pedidos): filtros das views do painel expressos em where Prisma`

---

### Task 2: Card-resumo navegável (sem accordion)

**Files:**
- Modify: `components/quote-request/serialize.ts` (serializador genérico), `components/quote-request/QuoteRequestCard.tsx` (Link, sem estado), `components/quote-request/QuoteRequestList.tsx` (sem `pixInfo`), `components/quote-request/QuoteRequestDetails.tsx` (remover prop `detailHref`, sem uso), `app/(dashboard)/dashboard/pedidos/[id]/page.tsx` (se afetado pelos tipos)

**Interfaces:**
- Produces: `serializeQuoteRequest<T extends SerializableQuoteRequest>(qr: T)` genérico — aceita tanto a linha resumida da lista quanto a completa do detalhe; `QuoteRequestCard({ quoteRequest, serviceNamesById })` onde `quoteRequest` é o resumo serializado (sem `statusHistory`/`internalNotes`).

- [ ] **Step 1: Serializador genérico** em `serialize.ts`:

```ts
type SerializableQuoteRequest = {
  fixedServiceAmount: { toString(): string } | null;
  service:
    | (Omit<SerializedService, "basePrice"> & {
        basePrice: { toString(): string } | null;
      })
    | null;
  proposal:
    | (Omit<SerializedProposal, "depositAmount"> & {
        depositAmount: { toString(): string } | null;
      })
    | null;
};

export function serializeQuoteRequest<T extends SerializableQuoteRequest>(
  quoteRequest: T
): Omit<T, keyof SerializableQuoteRequest> & {
  fixedServiceAmount: string | null;
  service: SerializedService | null;
  proposal: SerializedProposal | null;
} {
  return {
    ...quoteRequest,
    fixedServiceAmount: quoteRequest.fixedServiceAmount?.toString() ?? null,
    service: quoteRequest.service
      ? { ...quoteRequest.service, basePrice: quoteRequest.service.basePrice?.toString() ?? null }
      : null,
    proposal: quoteRequest.proposal
      ? { ...quoteRequest.proposal, depositAmount: quoteRequest.proposal.depositAmount?.toString() ?? null }
      : null
  };
}
```

`SerializedQuoteRequest` (tipo completo) permanece para o detalhe.

- [ ] **Step 2: Card vira Link** — `QuoteRequestCard` perde `useState`/`QuoteRequestDetails`/`pixInfo`; o `<button>` do header vira `<Link href={`/dashboard/pedidos/${quoteRequest.id}`}>` com o mesmo conteúdo (avatar, badges, nome, item) e chevron "→" no lugar do "v". Tipo das props: resumo (campos usados: `id`, `status`, `createdAt`, `customerName`, `description`, `serviceNameSnapshot`, `pixReservation*`, `service`). `QuoteRequestList` perde `pixInfo` e usa o serializador genérico. `QuoteRequestDetails` perde a prop `detailHref` (a lista não abre mais detalhes inline).

- [ ] **Step 3: Regressão** — `npx vitest run` → PASS; `npm run lint` → limpo. Commit: `feat(pedidos): card da lista navega para a pagina de detalhe`

---

### Task 3: Página de pedidos paginada

**Files:**
- Modify: `app/(dashboard)/dashboard/pedidos/page.tsx`
- Modify: `lib/dashboard.ts` (remover `sortRequestsForDashboardView`) e `tests/unit/dashboard.test.ts` (remover seus testes)

**Interfaces:**
- Consumes: `dashboardRequestViewWhere` (Task 1), card/list novos (Task 2).

- [ ] **Step 1: Reescrever a busca** — na page:

```ts
const PAGE_SIZE = 20;
const rawPage = Number(params.page);
const requestedPage = Number.isInteger(rawPage) && rawPage > 0 ? rawPage : 1;

const baseWhere: Prisma.QuoteRequestWhereInput = { providerId: profile.id };
const where: Prisma.QuoteRequestWhereInput = activeView
  ? { ...baseWhere, ...dashboardRequestViewWhere(activeView, monthRange) }
  : activeStatus === "ALL"
    ? baseWhere
    : { ...baseWhere, status: activeStatus };

const [statusCounts, totalRequests, newRequests, filteredCount] =
  await prisma.$transaction([
    prisma.quoteRequest.groupBy({
      by: ["status"],
      _count: true,
      where: baseWhere
    }),
    prisma.quoteRequest.count({ where: baseWhere }),
    prisma.quoteRequest.count({ where: { ...baseWhere, status: "NEW" } }),
    prisma.quoteRequest.count({ where })
  ]);

const totalPages = Math.max(1, Math.ceil(filteredCount / PAGE_SIZE));
const page = Math.min(requestedPage, totalPages);

const quoteRequests = await prisma.quoteRequest.findMany({
  where,
  orderBy:
    activeView === "PIX_RESERVATION"
      ? [
          { pixReservationClientPaidAt: { sort: "desc", nulls: "last" } },
          { createdAt: "desc" }
        ]
      : { createdAt: "desc" },
  take: PAGE_SIZE,
  skip: (page - 1) * PAGE_SIZE,
  include: {
    service: { select: { id: true, name: true, itemType: true, pricingType: true, fixedServiceCheckoutMode: true, basePrice: true } },
    proposal: { select: { depositAmount: true, depositPaidAt: true, id: true, publicToken: true, respondedAt: true, status: true } }
  }
});
```

O perfil deixa de trazer `quoteRequests` (buscar `findUnique` só com `services` para o formulário/nomes + campos usados). `requestCounts` dos filtros deriva de `statusCounts` + `totalRequests`. Remover `matchesDashboardRequestView`/`sortRequestsForDashboardView` da page.

- [ ] **Step 2: UI de paginação** — abaixo da `QuoteRequestList`, quando `totalPages > 1`:

```tsx
<nav aria-label="Paginação" className="mt-6 flex items-center justify-between">
  {page > 1 ? (
    <Link className="text-xs font-semibold text-leaf underline-offset-4 hover:underline" href={buildPageHref(page - 1)}>← Anterior</Link>
  ) : <span />}
  <span className="text-xs text-ink-muted">Página {page} de {totalPages}</span>
  {page < totalPages ? (
    <Link className="text-xs font-semibold text-leaf underline-offset-4 hover:underline" href={buildPageHref(page + 1)}>Próxima →</Link>
  ) : <span />}
</nav>
```

com `buildPageHref` preservando `status`/`view` via `URLSearchParams`. Filtros/vistas linkam sem `page` (voltam à 1).

- [ ] **Step 3: Remover `sortRequestsForDashboardView`** de `lib/dashboard.ts` e seus testes (a ordenação vive no `orderBy`).

- [ ] **Step 4: Regressão + commit** — `npx vitest run` → PASS; `npm run lint`; commit: `feat(pedidos): painel paginado com filtros no banco`

---

### Task 4: Verificação final

- [ ] `npx vitest run` → PASS; `npm run lint` → limpo; `npm run build` (exit 0).
- [ ] Manual (dev): lista pagina com >20 pedidos; filtros e views mantêm contadores; card abre o detalhe; view Pix ordena informados primeiro; `?page=99` cai na última página válida.
