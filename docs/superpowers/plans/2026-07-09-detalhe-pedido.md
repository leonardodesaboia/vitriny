# Página de detalhe do pedido (1.2) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Criar `/dashboard/pedidos/[id]` reutilizando o corpo expandido do `QuoteRequestCard`, apontar e-mails para o detalhe e fazer as actions respeitarem a página de origem.

**Architecture:** O conteúdo expandido do card vira um componente único `QuoteRequestDetails` (client), renderizado pelo card (accordion mantido, fase 1) e pela nova página server com ownership via `findFirst({ id, providerId })` → `notFound()`. Redirects das actions ganham `returnTo` validado por prefixo (nunca redirect aberto).

**Tech Stack:** Next 16 App Router, React 19, Prisma 6, vitest.

## Global Constraints

- Copy pt-BR; comentários só para restrições não óbvias.
- `Decimal` nunca cruza server→client: usar o serializador compartilhado.
- Testes: `npx vitest run <arquivo>`; commits pequenos com os trailers da sessão.
- Markup/comportamento do card expandido devem permanecer idênticos — a suíte existente é o critério de regressão.
- `returnTo` só é aceito se começar com `/dashboard/pedidos` e não contiver `//` ou esquema — caso contrário cai no default `/dashboard/pedidos`.

---

### Task 1: Extrair helpers e `QuoteRequestDetails` do card

**Files:**
- Create: `components/quote-request/format.ts`
- Create: `components/quote-request/serialize.ts`
- Create: `components/quote-request/QuoteRequestDetails.tsx`
- Modify: `components/quote-request/QuoteRequestCard.tsx`
- Modify: `components/quote-request/QuoteRequestList.tsx`

**Interfaces:**
- Produces:
  - `format.ts`: `formatDate(date: Date): string`, `formatDateShort(date: Date): string`, `getInitials(name: string): string`, `splitServiceFromDescription(description: string, serviceNamesById: Record<string, string>)`, e os records `statusLabels`, `statusBadge`, `proposalStatusLabel`, `proposalStatusBadge`, `actorLabels` — movidos sem alteração de `QuoteRequestCard.tsx:64-134`.
  - `serialize.ts`: `serializeQuoteRequest(quoteRequest: QuoteRequestWithRelations): SerializedQuoteRequest` — corpo idêntico ao bloco inline de `QuoteRequestList.tsx:44-59`; os tipos `SerializedQuoteRequest`/`SerializedProposal`/`SerializedService` (de `QuoteRequestCard.tsx:31-56`) passam a viver aqui.
  - `QuoteRequestDetails.tsx` (client): `QuoteRequestDetails({ quoteRequest, serviceNamesById, pixInfo, detailHref }: { quoteRequest: SerializedQuoteRequest; serviceNamesById: Record<string, string>; pixInfo?: { pixKey: string; pixHolderName: string } | null; detailHref?: string })`.

- [ ] **Step 1: Criar `format.ts` e `serialize.ts`** movendo os blocos citados (código idêntico, apenas `export` adicionado). `QuoteRequestCard` re-exporta `type SerializedQuoteRequest` de `serialize.ts` para não quebrar o import da lista.

- [ ] **Step 2: Criar `QuoteRequestDetails.tsx`** movendo TODO o JSX do bloco `{expanded ? (<div className="border-t ...">...</div>) : null}` do card (`QuoteRequestCard.tsx:249-748` na versão atual), incluindo:
  - o estado `editingNoteId`, `noteToDelete`, `deletePending` + `ConfirmModal` (movem junto);
  - as derivações `legacyService`, `serviceLabel`, `cleanDescription`, `customerPhoneDisplay/Href`, `customerWhatsAppUrl` (movem junto — o header colapsado do card só usa `serviceLabel`, que pode ser recalculado lá ou duplicado da forma mais simples);
  - imports correspondentes (actions, WhatsAppButton, format.ts).
  - No topo do conteúdo, quando `detailHref` presente, o link:

```tsx
      {detailHref ? (
        <div className="mb-4 flex justify-end">
          <Link
            className="text-xs font-semibold text-leaf underline-offset-4 hover:underline"
            href={detailHref}
          >
            Abrir página do pedido ↗
          </Link>
        </div>
      ) : null}
```

- [ ] **Step 3: Recompor o card**: `QuoteRequestCard` mantém header/accordion/badges e renderiza `{expanded ? <QuoteRequestDetails quoteRequest={quoteRequest} serviceNamesById={serviceNamesById} pixInfo={pixInfo} detailHref={`/dashboard/pedidos/${quoteRequest.id}`} /> : null}`. `QuoteRequestList` usa `serializeQuoteRequest`.

- [ ] **Step 4: Regressão**

Run: `npx vitest run`
Expected: PASS (nenhum teste alterado).

Run: `npm run lint`
Expected: sem erros novos.

- [ ] **Step 5: Commit**

```bash
git add components/quote-request/
git commit -m "refactor(pedidos): extrai QuoteRequestDetails do card"
```

---

### Task 2: Página `/dashboard/pedidos/[id]`

**Files:**
- Create: `app/(dashboard)/dashboard/pedidos/[id]/page.tsx`

**Interfaces:**
- Consumes: `QuoteRequestDetails`, `serializeQuoteRequest` (Task 1); `getInitials`, `statusLabels`, `statusBadge` de `format.ts`.

- [ ] **Step 1: Implementar a página**

```tsx
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { auth } from "@/auth";
import { QuoteRequestDetails } from "@/components/quote-request/QuoteRequestDetails";
import { serializeQuoteRequest } from "@/components/quote-request/serialize";
import { statusBadge, statusLabels } from "@/components/quote-request/format";
import { prisma } from "@/lib/prisma";

type RequestDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function RequestDetailPage({ params }: RequestDetailPageProps) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { id } = await params;

  const profile = await prisma.providerProfile.findUnique({
    where: { userId: session.user.id },
    select: {
      id: true,
      pixKey: true,
      pixHolderName: true,
      services: { select: { id: true, name: true } }
    }
  });
  if (!profile) redirect("/dashboard/pedidos?error=profile");

  // Ownership: pedido de outro negócio é 404, não erro.
  const quoteRequest = await prisma.quoteRequest.findFirst({
    where: { id, providerId: profile.id },
    include: {
      service: {
        select: {
          id: true,
          name: true,
          itemType: true,
          pricingType: true,
          fixedServiceCheckoutMode: true,
          basePrice: true
        }
      },
      proposal: {
        select: {
          depositAmount: true,
          depositPaidAt: true,
          id: true,
          publicToken: true,
          respondedAt: true,
          status: true
        }
      },
      statusHistory: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          fromStatus: true,
          toStatus: true,
          actor: true,
          note: true,
          createdAt: true
        }
      },
      internalNotes: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          content: true,
          createdAt: true,
          author: { select: { name: true, email: true } }
        }
      }
    }
  });
  if (!quoteRequest) notFound();

  const serviceNamesById = Object.fromEntries(
    profile.services.map((service) => [service.id, service.name])
  );

  return (
    <div className="min-w-0 p-4 sm:p-6 md:p-8">
      <Link
        className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-widest text-ink-muted transition hover:text-leaf"
        href="/dashboard/pedidos"
      >
        ← Pedidos
      </Link>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <h1 className="font-fraunces text-3xl font-bold text-ink sm:text-4xl">
          {quoteRequest.customerName}
        </h1>
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusBadge[quoteRequest.status] ?? "bg-paper-soft text-ink-muted"}`}
        >
          {statusLabels[quoteRequest.status]}
        </span>
      </div>

      <div className="mt-6 rounded-xl border border-paper-soft bg-white shadow-card">
        <QuoteRequestDetails
          pixInfo={
            profile.pixKey && profile.pixHolderName
              ? { pixKey: profile.pixKey, pixHolderName: profile.pixHolderName }
              : null
          }
          quoteRequest={serializeQuoteRequest(quoteRequest)}
          returnTo={`/dashboard/pedidos/${quoteRequest.id}`}
          serviceNamesById={serviceNamesById}
        />
      </div>
    </div>
  );
}
```

(`returnTo` só compila após a Task 3 — implementar as duas na ordem, ou omitir a prop aqui e adicioná-la na Task 3.)

- [ ] **Step 2: Lint + build rápido**

Run: `npm run lint`
Expected: sem erros novos.

- [ ] **Step 3: Commit**

```bash
git add "app/(dashboard)/dashboard/pedidos/[id]/"
git commit -m "feat(pedidos): pagina de detalhe do pedido"
```

---

### Task 3: `returnTo` validado nas actions + revalidação do detalhe (TDD)

**Files:**
- Create: `lib/actions/return-path.ts`
- Modify: `lib/actions/quote-request-status.ts`, `lib/actions/quote-requests.ts` (`markPixReservationPaid`), `lib/actions/quote-request-notes.ts`
- Modify: `components/quote-request/QuoteRequestDetails.tsx` (prop `returnTo?: string`, hidden input nos forms de status/Pix/notas)
- Test: Create `tests/unit/return-path.test.ts`; Modify `tests/actions/quote-requests.test.ts`

**Interfaces:**
- Produces: `resolveQuoteRequestReturnPath(value: unknown): string` — retorna o próprio valor quando é string iniciando com `/dashboard/pedidos` sem `//` nem `:`; senão `/dashboard/pedidos`.

- [ ] **Step 1: Teste unit que falha** (`tests/unit/return-path.test.ts`)

```ts
import { describe, expect, it } from "vitest";

import { resolveQuoteRequestReturnPath } from "@/lib/actions/return-path";

describe("resolveQuoteRequestReturnPath", () => {
  it("aceita a lista e o detalhe de pedidos", () => {
    expect(resolveQuoteRequestReturnPath("/dashboard/pedidos")).toBe(
      "/dashboard/pedidos"
    );
    expect(resolveQuoteRequestReturnPath("/dashboard/pedidos/abc")).toBe(
      "/dashboard/pedidos/abc"
    );
  });

  it("rejeita destinos fora de pedidos e redirects abertos", () => {
    expect(resolveQuoteRequestReturnPath("/dashboard/billing")).toBe(
      "/dashboard/pedidos"
    );
    expect(resolveQuoteRequestReturnPath("//evil.com")).toBe(
      "/dashboard/pedidos"
    );
    expect(resolveQuoteRequestReturnPath("https://evil.com")).toBe(
      "/dashboard/pedidos"
    );
    expect(resolveQuoteRequestReturnPath(null)).toBe("/dashboard/pedidos");
  });
});
```

- [ ] **Step 2: Implementar `lib/actions/return-path.ts`**

```ts
const DEFAULT_RETURN_PATH = "/dashboard/pedidos";

// Nunca redirect aberto: só caminhos internos da área de pedidos.
export function resolveQuoteRequestReturnPath(value: unknown): string {
  if (
    typeof value === "string" &&
    value.startsWith(DEFAULT_RETURN_PATH) &&
    !value.includes("//") &&
    !value.includes(":")
  ) {
    return value;
  }
  return DEFAULT_RETURN_PATH;
}
```

Run: `npx vitest run tests/unit/return-path.test.ts` → PASS.

- [ ] **Step 3: Aplicar nas actions**

Em cada action que hoje redireciona para `/dashboard/pedidos` (`updateQuoteRequestStatus`, `markPixReservationPaid`, `createQuoteRequestNote`, `updateQuoteRequestNote`, `deleteQuoteRequestNote`):

```ts
const returnTo = resolveQuoteRequestReturnPath(formData.get("returnTo"));
```

- redirects de erro e de sucesso usam `returnTo` (erros com `?error=` concatenado: `` `${returnTo}?error=invalid` ``);
- após mutação: `revalidatePath("/dashboard/pedidos")` **e** `revalidatePath("/dashboard/pedidos/[id]", "page")` (revalida todos os detalhes — barato e simples).

Em `QuoteRequestDetails`, nova prop `returnTo?: string`; quando presente, cada `<form>` de action (status, confirmar Pix, entrada, notas) ganha `<input type="hidden" name="returnTo" value={returnTo} />`. O card não passa `returnTo` (comportamento atual preservado).

- [ ] **Step 4: Teste de action com returnTo inválido** (em `tests/actions/quote-requests.test.ts`, describe `markPixReservationPaid`)

```ts
  it("ignora returnTo fora da área de pedidos", async () => {
    const { requireProviderProfile } = await import("@/lib/actions/auth-guard");
    vi.mocked(requireProviderProfile).mockResolvedValue({
      profile: { id: "profile-1", plan: "FREE", businessType: "SERVICES" },
      userId: "user-1"
    });
    db.quoteRequest.findFirst.mockResolvedValue({
      id: "request-1",
      pixReservationRequestedAt: new Date(),
      pixReservationPaidAt: null
    });
    db.quoteRequest.update.mockResolvedValue({});

    const { markPixReservationPaid } = await import(
      "@/lib/actions/quote-requests"
    );

    await expect(
      markPixReservationPaid(
        makeFormData({ requestId: "request-1", returnTo: "https://evil.com" })
      )
    ).rejects.toThrow("/dashboard/pedidos");
  });
```

- [ ] **Step 5: Suite + commit**

Run: `npx vitest run` → PASS. `npm run lint` → limpo.

```bash
git add lib/actions/ components/quote-request/ tests/
git commit -m "feat(pedidos): actions respeitam a pagina de origem (returnTo validado)"
```

---

### Task 4: E-mails apontam para o detalhe do pedido

**Files:**
- Modify: `lib/actions/quote-requests.ts` (`createQuoteRequest` e `markPixReservationClientPaid`)
- Test: `tests/actions/quote-requests.test.ts`

- [ ] **Step 1: Ajustar as asserções primeiro**

No teste "envia e-mail ao prestador...": `dashboardUrl: expect.stringContaining("/dashboard/pedidos/request-1")`.
No teste "grava o sinal e envia e-mail...": idem.

Run: `npx vitest run tests/actions/quote-requests.test.ts` → FAIL (2 testes).

- [ ] **Step 2: Implementar**

`createQuoteRequest`: `dashboardUrl: appUrl(`/dashboard/pedidos/${created.id}`)`.
`markPixReservationClientPaid`: `dashboardUrl: appUrl(`/dashboard/pedidos/${quoteRequest.id}`)`.

Run: `npx vitest run tests/actions/quote-requests.test.ts` → PASS.

- [ ] **Step 3: Commit**

```bash
git add lib/actions/quote-requests.ts tests/actions/quote-requests.test.ts
git commit -m "feat(pedidos): e-mails apontam para a pagina de detalhe"
```

---

### Task 5: Verificação final

- [ ] `npx vitest run` → PASS; `npm run lint` → limpo; `npm run build` → sem erro de tipo.
- [ ] Manual (dev): abrir um pedido pela lista → "Abrir página do pedido ↗" → conferir todas as seções, mudar status/nota/confirmar Pix a partir do detalhe e verificar que permanece no detalhe; e-mail de novo pedido aponta para `/dashboard/pedidos/{id}`; pedido de outro negócio → 404.
