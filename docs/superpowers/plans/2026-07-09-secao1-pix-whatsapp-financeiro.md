# Seção 1 (parte A): Pix "Já paguei" + Compartilhar item + Resumo financeiro — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar as features 1.1 (botão "Já paguei" na reserva Pix), 1.3 (compartilhar item no WhatsApp) e 1.4 (resumo financeiro do mês na dashboard) dos specs `docs/superpowers/specs/2026-07-09-pix-ja-paguei-design.md` e `2026-07-09-secao1-restante-design.md`.

**Architecture:** Next.js App Router com Server Actions como convenção de mutação (nunca route handlers para forms). O sinal "cliente informou pagamento" é um timestamp novo (`pixReservationClientPaidAt`) no `QuoteRequest`, gravado por uma action pública validada por slug+ownership e rate-limited no proxy. Compartilhamento e resumo financeiro são funções puras em `lib/` + componentes apresentacionais.

**Tech Stack:** Next 16, React 19, Prisma 6 + PostgreSQL, vitest (unit/actions), Tailwind com tokens próprios (`paper`, `ink`, `leaf`, `mint`).

**Nota de escopo:** a feature 1.2 (página de detalhe do pedido) terá plano próprio depois desta entrega — a `PixReservationSection` extraída lá depende do estado novo criado aqui.

## Global Constraints

- Todo texto de UI/e-mail em pt-BR; comentários de código em pt-BR, só onde explicam restrição não óbvia (padrão do repo).
- `Decimal` do Prisma nunca cruza a fronteira server→client: converter com `.toString()` ou formatar no server.
- Formatação de moeda sempre `new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" })`.
- Testes unit/actions rodam com `npx vitest run <arquivo>` (o script `npm test` fica em watch — não usar).
- Commits pequenos, mensagem em português no padrão conventional commits, terminando com:
  `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>` e
  `Claude-Session: https://claude.ai/code/session_01QdLUDHiBxQVG17uu2sKByq`
- Redirects de Server Action lançam exceção — nos testes o padrão é `await expect(action(...)).rejects.toThrow("<path>")`.
- Idempotência: nenhuma action pública pode errar no segundo clique.

---

### Task 1: Campo `pixReservationClientPaidAt` no schema

**Files:**
- Modify: `prisma/schema.prisma:170` (model `QuoteRequest`)

**Interfaces:**
- Produces: coluna nullable `QuoteRequest.pixReservationClientPaidAt DateTime?` disponível no Prisma Client (todas as tasks seguintes dependem dela).

- [ ] **Step 1: Adicionar o campo ao model**

Em `prisma/schema.prisma`, dentro do model `QuoteRequest`, logo após `pixReservationPaidAt`:

```prisma
  fixedServiceAmount        Decimal?           @db.Decimal(10, 2)
  pixReservationRequestedAt DateTime?
  pixReservationPaidAt      DateTime?
  // Sinal do cliente ("Já fiz o pagamento"); a confirmação continua manual
  // pelo negócio via pixReservationPaidAt.
  pixReservationClientPaidAt DateTime?
```

- [ ] **Step 2: Gerar a migração**

Run: `npx prisma migrate dev --name add_pix_reservation_client_paid_at`
Expected: migração criada em `prisma/migrations/*_add_pix_reservation_client_paid_at/migration.sql` contendo `ALTER TABLE "QuoteRequest" ADD COLUMN "pixReservationClientPaidAt" TIMESTAMP(3);` e `prisma generate` executado sem erro.

- [ ] **Step 3: Commit**

```bash
git add prisma/
git commit -m "feat(pix): campo pixReservationClientPaidAt no QuoteRequest"
```

---

### Task 2: Action pública `markPixReservationClientPaid` + e-mail (TDD)

**Files:**
- Modify: `lib/actions/quote-requests.ts` (nova action ao final)
- Modify: `lib/email.ts` (nova função `sendPixReservationClientPaidEmail`)
- Test: `tests/actions/quote-requests.test.ts` (novo `describe`)

**Interfaces:**
- Consumes: `pixReservationClientPaidAt` (Task 1); `isPixPaymentExpired` de `@/lib/utils/date`; `appUrl` (helper já existente no topo de `quote-requests.ts`).
- Produces: `markPixReservationClientPaid(slug: string, formData: FormData): Promise<void>` — chamada via `<form action={markPixReservationClientPaid.bind(null, slug)}>` com hidden `requestId`; `sendPixReservationClientPaidEmail(input: { to: string; businessName: string; customerName: string; serviceName?: string | null; amount: string; dashboardUrl: string }): Promise<void>`.

- [ ] **Step 1: Atualizar o mock de e-mail e escrever os testes que falham**

Em `tests/actions/quote-requests.test.ts`, o `vi.mock("@/lib/email", ...)` do topo ganha a nova função:

```ts
vi.mock("@/lib/email", () => ({
  sendQuoteRequestReceivedEmail: vi.fn(),
  sendQuoteRequestConfirmationToCustomerEmail: vi.fn(),
  sendPixReservationClientPaidEmail: vi.fn()
}));
```

Novo `describe` ao final do arquivo:

```ts
describe("markPixReservationClientPaid", () => {
  function mockReservation(overrides: Record<string, unknown> = {}) {
    db.providerProfile.findUnique.mockResolvedValue({
      id: "profile-1",
      businessName: "Vitriny Serviços",
      email: "perfil@example.com",
      user: { email: "conta@example.com" }
    });
    db.quoteRequest.findFirst.mockResolvedValue({
      id: "request-1",
      customerName: "Maria",
      serviceNameSnapshot: "Pintura",
      fixedServiceAmount: { toString: () => "500" },
      pixReservationRequestedAt: new Date(),
      pixReservationPaidAt: null,
      pixReservationClientPaidAt: null,
      service: { name: "Pintura" },
      ...overrides
    });
    db.quoteRequest.update.mockResolvedValue({});
  }

  it("grava o sinal e envia e-mail quando a reserva está pendente", async () => {
    mockReservation();
    const { sendPixReservationClientPaidEmail } = await import("@/lib/email");
    const { markPixReservationClientPaid } = await import(
      "@/lib/actions/quote-requests"
    );

    await expect(
      markPixReservationClientPaid(
        "vitriny",
        makeFormData({ requestId: "request-1" })
      )
    ).rejects.toThrow("/u/vitriny/reserva/request-1");

    expect(db.quoteRequest.update).toHaveBeenCalledWith({
      data: { pixReservationClientPaidAt: expect.any(Date) },
      where: { id: "request-1" }
    });
    expect(sendPixReservationClientPaidEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "perfil@example.com",
        businessName: "Vitriny Serviços",
        customerName: "Maria",
        serviceName: "Pintura",
        // Moeda pt-BR usa espaço não separável — gerar o esperado com o
        // mesmo formatador em vez de string literal.
        amount: new Intl.NumberFormat("pt-BR", {
          style: "currency",
          currency: "BRL"
        }).format(500),
        dashboardUrl: expect.stringContaining("/dashboard/pedidos")
      })
    );
  });

  it("é idempotente: segundo clique não regrava nem erra", async () => {
    mockReservation({ pixReservationClientPaidAt: new Date() });
    const { markPixReservationClientPaid } = await import(
      "@/lib/actions/quote-requests"
    );

    await expect(
      markPixReservationClientPaid(
        "vitriny",
        makeFormData({ requestId: "request-1" })
      )
    ).rejects.toThrow("/u/vitriny/reserva/request-1");

    expect(db.quoteRequest.update).not.toHaveBeenCalled();
  });

  it("não grava quando o negócio já confirmou o pagamento", async () => {
    mockReservation({ pixReservationPaidAt: new Date() });
    const { markPixReservationClientPaid } = await import(
      "@/lib/actions/quote-requests"
    );

    await expect(
      markPixReservationClientPaid(
        "vitriny",
        makeFormData({ requestId: "request-1" })
      )
    ).rejects.toThrow("/u/vitriny/reserva/request-1");

    expect(db.quoteRequest.update).not.toHaveBeenCalled();
  });

  it("não grava quando a reserva expirou", async () => {
    const threeDaysAgo = new Date(Date.now() - 72 * 60 * 60 * 1000);
    mockReservation({ pixReservationRequestedAt: threeDaysAgo });
    const { markPixReservationClientPaid } = await import(
      "@/lib/actions/quote-requests"
    );

    await expect(
      markPixReservationClientPaid(
        "vitriny",
        makeFormData({ requestId: "request-1" })
      )
    ).rejects.toThrow("/u/vitriny/reserva/request-1");

    expect(db.quoteRequest.update).not.toHaveBeenCalled();
  });

  it("rejeita pedido que não pertence ao perfil do slug", async () => {
    db.providerProfile.findUnique.mockResolvedValue({
      id: "profile-1",
      businessName: "Vitriny Serviços",
      email: "perfil@example.com",
      user: { email: "conta@example.com" }
    });
    db.quoteRequest.findFirst.mockResolvedValue(null);
    const { markPixReservationClientPaid } = await import(
      "@/lib/actions/quote-requests"
    );

    await expect(
      markPixReservationClientPaid(
        "vitriny",
        makeFormData({ requestId: "request-de-outro" })
      )
    ).rejects.toThrow("/u/vitriny");

    expect(db.quoteRequest.update).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run tests/actions/quote-requests.test.ts`
Expected: FAIL — `markPixReservationClientPaid is not a function` (5 testes novos falhando; os antigos passam).

- [ ] **Step 3: Implementar o e-mail em `lib/email.ts`**

Junto aos outros input types:

```ts
type PixReservationClientPaidEmailInput = {
  to: string;
  businessName: string;
  customerName: string;
  serviceName?: string | null;
  amount: string;
  dashboardUrl: string;
};
```

Após `sendQuoteRequestReceivedEmail`:

```ts
export async function sendPixReservationClientPaidEmail({
  to,
  businessName,
  customerName,
  serviceName,
  amount,
  dashboardUrl
}: PixReservationClientPaidEmailInput) {
  await sendAppEmail({
    to,
    subject: "Cliente informou pagamento Pix — Vitriny",
    preview: `${customerName} informou o pagamento de ${amount}.`,
    html: [
      paragraph(`Olá, ${businessName}.`),
      paragraph(
        serviceName
          ? `${customerName} informou o pagamento Pix de ${amount} referente ao item ${serviceName}.`
          : `${customerName} informou o pagamento Pix de ${amount}.`
      ),
      paragraph(
        "Confirme o recebimento no seu banco antes de dar o pedido como pago."
      ),
      emailButton("Confirmar no painel", dashboardUrl)
    ].join("")
  });
}
```

- [ ] **Step 4: Implementar a action em `lib/actions/quote-requests.ts`**

Adicionar `sendPixReservationClientPaidEmail` ao import de `@/lib/email` e `isPixPaymentExpired` de `@/lib/utils/date`. Ao final do arquivo:

```ts
export async function markPixReservationClientPaid(
  slug: string,
  formData: FormData
): Promise<void> {
  const requestId = String(formData.get("requestId") ?? "");
  if (!requestId) redirect(`/u/${slug}`);

  // Action pública (o cliente não tem login): a segurança vem do vínculo
  // slug→perfil→pedido e das checagens de estado abaixo.
  const profile = await prisma.providerProfile.findUnique({
    where: { slug },
    select: {
      id: true,
      businessName: true,
      email: true,
      user: { select: { email: true } }
    }
  });
  if (!profile) redirect("/");

  const reservaPath = `/u/${slug}/reserva/${requestId}`;

  const quoteRequest = await prisma.quoteRequest.findFirst({
    where: { id: requestId, providerId: profile.id },
    select: {
      id: true,
      customerName: true,
      serviceNameSnapshot: true,
      fixedServiceAmount: true,
      pixReservationRequestedAt: true,
      pixReservationPaidAt: true,
      pixReservationClientPaidAt: true,
      service: { select: { name: true } }
    }
  });

  if (!quoteRequest?.pixReservationRequestedAt) redirect(`/u/${slug}`);

  // Estados terminais: nada a gravar; a página renderiza o estado real.
  if (
    quoteRequest.pixReservationPaidAt ||
    quoteRequest.pixReservationClientPaidAt ||
    isPixPaymentExpired(quoteRequest.pixReservationRequestedAt)
  ) {
    redirect(reservaPath);
  }

  await prisma.quoteRequest.update({
    where: { id: quoteRequest.id },
    data: { pixReservationClientPaidAt: new Date() }
  });

  const providerEmail = profile.email ?? profile.user.email;
  const amount = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(Number(quoteRequest.fixedServiceAmount ?? 0));

  after(async () => {
    if (!providerEmail) return;
    try {
      await sendPixReservationClientPaidEmail({
        to: providerEmail,
        businessName: profile.businessName,
        customerName: quoteRequest.customerName,
        serviceName:
          quoteRequest.serviceNameSnapshot ?? quoteRequest.service?.name,
        amount,
        dashboardUrl: appUrl("/dashboard/pedidos")
      });
    } catch (error) {
      console.error("Falha ao enviar e-mail de pagamento informado.", {
        error,
        quoteRequestId: quoteRequest.id
      });
    }
  });

  revalidatePath(reservaPath);
  revalidatePath("/dashboard/pedidos");
  redirect(reservaPath);
}
```

- [ ] **Step 5: Rodar e ver passar**

Run: `npx vitest run tests/actions/quote-requests.test.ts`
Expected: PASS (todos, antigos e novos).

- [ ] **Step 6: Commit**

```bash
git add lib/actions/quote-requests.ts lib/email.ts tests/actions/quote-requests.test.ts
git commit -m "feat(pix): action publica de pagamento informado pelo cliente"
```

---

### Task 3: Botão e estado "informado" na página de reserva

**Files:**
- Create: `app/u/[slug]/reserva/[requestId]/MarkPaidButton.tsx`
- Modify: `app/u/[slug]/reserva/[requestId]/page.tsx`

**Interfaces:**
- Consumes: `markPixReservationClientPaid` (Task 2).
- Produces: nenhum export consumido por outras tasks.

- [ ] **Step 1: Criar o client component do botão**

`app/u/[slug]/reserva/[requestId]/MarkPaidButton.tsx`:

```tsx
"use client";

import { useFormStatus } from "react-dom";

export function MarkPaidButton() {
  const { pending } = useFormStatus();

  return (
    <button
      className="inline-flex min-h-9 items-center justify-center rounded-md border border-leaf bg-white px-4 text-xs font-semibold text-leaf transition hover:bg-mint disabled:cursor-not-allowed disabled:opacity-60"
      disabled={pending}
      type="submit"
    >
      {pending ? "Enviando..." : "Já fiz o pagamento"}
    </button>
  );
}
```

- [ ] **Step 2: Estados na página**

Em `app/u/[slug]/reserva/[requestId]/page.tsx`:

1. Imports novos:

```tsx
import { MarkPaidButton } from "./MarkPaidButton";
import { markPixReservationClientPaid } from "@/lib/actions/quote-requests";
```

2. Adicionar `pixReservationClientPaidAt: true` ao `select` do `quoteRequest`.

3. Trocar a derivação de estados (precedência pago > informado > expirado > pendente):

```tsx
  const amount = quoteRequest.fixedServiceAmount.toString();
  const alreadyPaid = !!quoteRequest.pixReservationPaidAt;
  const clientInformed = !alreadyPaid && !!quoteRequest.pixReservationClientPaidAt;
  const expired =
    !alreadyPaid &&
    !clientInformed &&
    isPixPaymentExpired(quoteRequest.pixReservationRequestedAt);
  const pendingPayment = !alreadyPaid && !clientInformed && !expired;
```

4. Novo ramo `clientInformed` na cadeia de renderização, entre `alreadyPaid` e `expired` (QR e copia-e-cola saem de cena):

```tsx
        ) : clientInformed ? (
          <div className="mt-8 rounded-xl border border-amber/30 bg-amber/10 p-6">
            <p className="font-fraunces text-xl font-bold text-ink">
              Pagamento informado
            </p>
            <p className="mt-2 text-sm leading-6 text-ink-muted">
              Avisamos o negócio de que você fez o pagamento. Seu pedido será
              confirmado assim que o recebimento for verificado.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              {whatsappNumber ? (
                <a
                  className="inline-flex min-h-9 items-center justify-center rounded-md bg-leaf px-4 text-xs font-semibold text-white transition hover:bg-leaf-hover"
                  href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(`Olá! Realizei o pagamento Pix de ${formatMoney(amount)} referente ao item ${itemName}. Vou enviar o comprovante por aqui.`)}`}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  Enviar comprovante no WhatsApp
                </a>
              ) : null}
              <Link
                className="inline-flex min-h-9 items-center justify-center rounded-md border border-paper-soft px-4 text-xs font-semibold text-ink transition hover:border-leaf hover:text-leaf"
                href={`/u/${slug}`}
              >
                Voltar à vitrine
              </Link>
            </div>
          </div>
        ) : expired ? (
```

5. No bloco "Próximos passos" (estado pendente), após o botão de WhatsApp existente, o form do novo botão:

```tsx
              <form
                action={markPixReservationClientPaid.bind(null, slug)}
                className="mt-3"
              >
                <input name="requestId" type="hidden" value={quoteRequest.id} />
                <MarkPaidButton />
              </form>
              <p className="mt-2 text-xs text-ink-muted">
                Ao marcar, o negócio é avisado; a confirmação do recebimento
                continua manual.
              </p>
```

- [ ] **Step 3: Verificar lint e build**

Run: `npm run lint`
Expected: sem erros novos.

- [ ] **Step 4: Commit**

```bash
git add "app/u/[slug]/reserva/[requestId]/"
git commit -m "feat(pix): botao 'Ja fiz o pagamento' e estado informado na reserva"
```

---

### Task 4: Badge e bloco expandido no QuoteRequestCard

**Files:**
- Modify: `components/quote-request/QuoteRequestCard.tsx:208-224` (badge) e `:578-609` (bloco Pix expandido)

**Interfaces:**
- Consumes: `pixReservationClientPaidAt` já presente em `QuoteRequestWithRelations` após `prisma generate` (Task 1).
- Produces: nenhum export novo.

- [ ] **Step 1: Badge colapsado**

Substituir o span do badge Pix (linhas 208–224) por precedência pago > informado > expirado > pendente:

```tsx
            {quoteRequest.pixReservationRequestedAt ? (
              <span
                className={`inline-flex shrink-0 rounded-full border px-2 py-0.5 text-xs font-semibold ${
                  quoteRequest.pixReservationPaidAt
                    ? "border-mint bg-mint text-leaf"
                    : quoteRequest.pixReservationClientPaidAt
                      ? "border-amber-300 bg-amber-100 text-amber-800"
                      : isPixPaymentExpired(quoteRequest.pixReservationRequestedAt)
                        ? "border-red-200 bg-red-50 text-red-700"
                        : "border-amber-200 bg-amber-50 text-amber-700"
                }`}
              >
                {quoteRequest.pixReservationPaidAt
                  ? "Pagamento Pix confirmado"
                  : quoteRequest.pixReservationClientPaidAt
                    ? "Cliente informou pagamento"
                    : isPixPaymentExpired(quoteRequest.pixReservationRequestedAt)
                      ? "Pix expirado"
                      : "Pagamento Pix pendente"}
              </span>
            ) : null}
```

- [ ] **Step 2: Bloco Pix expandido**

Na seção "Pagamento Pix do pedido" (linhas 578–609), inserir o ramo informado antes do expirado — com o mesmo form de confirmação do estado pendente, pois é aqui que o negócio confirma:

```tsx
                  {quoteRequest.pixReservationPaidAt ? (
                    <div className="mt-3 flex items-center gap-2 rounded-lg border border-mint bg-mint/40 px-3 py-2">
                      <span className="text-xs font-semibold text-leaf">
                        ✓ Pix confirmado em{" "}
                        {formatDateShort(quoteRequest.pixReservationPaidAt)}
                      </span>
                    </div>
                  ) : quoteRequest.pixReservationClientPaidAt ? (
                    <div className="mt-3 flex flex-col items-start gap-3 rounded-lg border border-amber-300 bg-amber-100 px-3 py-2 sm:flex-row sm:items-center">
                      <span className="text-xs font-semibold text-amber-800">
                        Cliente informou pagamento em{" "}
                        {formatDateShort(quoteRequest.pixReservationClientPaidAt)}{" "}
                        — confira o recebimento no seu banco.
                      </span>
                      <form action={markPixReservationPaid}>
                        <input type="hidden" name="requestId" value={quoteRequest.id} />
                        <button
                          type="submit"
                          className="inline-flex min-h-8 w-full items-center justify-center rounded-md bg-leaf px-3 text-xs font-semibold text-white transition hover:bg-leaf-hover sm:w-auto"
                        >
                          Confirmar recebimento
                        </button>
                      </form>
                    </div>
                  ) : isPixPaymentExpired(quoteRequest.pixReservationRequestedAt) ? (
```

(os ramos expirado e pendente permanecem como estão)

- [ ] **Step 3: Lint e commit**

Run: `npm run lint`
Expected: sem erros novos.

```bash
git add components/quote-request/QuoteRequestCard.tsx
git commit -m "feat(pix): badge e bloco de pagamento informado no card de pedido"
```

---

### Task 5: View PIX_RESERVATION e ordenação (TDD)

**Files:**
- Modify: `lib/dashboard.ts` (tipo `DashboardRequest`, `matchesDashboardRequestView`, nova `sortRequestsForDashboardView`)
- Modify: `app/(dashboard)/dashboard/pedidos/page.tsx:143-150` (aplicar ordenação)
- Test: `tests/unit/dashboard.test.ts`

**Interfaces:**
- Produces: `sortRequestsForDashboardView<T extends { pixReservationClientPaidAt: Date | null; pixReservationPaidAt: Date | null }>(requests: T[], view: DashboardRequestView | null): T[]`; `DashboardRequest` ganha `pixReservationClientPaidAt: Date | null`.

- [ ] **Step 1: Testes que falham**

Em `tests/unit/dashboard.test.ts`, seguindo o padrão dos testes existentes de `matchesDashboardRequestView` (usar o factory local de request do arquivo; se os requests de teste forem literais, incluir `pixReservationClientPaidAt: null` nos existentes):

```ts
import { sortRequestsForDashboardView } from "@/lib/dashboard";

describe("PIX_RESERVATION com pagamento informado pelo cliente", () => {
  const monthRange = {
    start: new Date("2026-07-01T00:00:00Z"),
    end: new Date("2026-08-01T00:00:00Z")
  };
  const base = {
    createdAt: new Date(),
    status: "NEW" as const,
    proposal: null,
    pixReservationPaidAt: null,
    pixReservationClientPaidAt: null
  };
  const threeDaysAgo = new Date(Date.now() - 72 * 60 * 60 * 1000);

  it("inclui reserva expirada quando o cliente informou pagamento", () => {
    const request = {
      ...base,
      pixReservationRequestedAt: threeDaysAgo,
      pixReservationClientPaidAt: new Date()
    };
    expect(
      matchesDashboardRequestView(request, "PIX_RESERVATION", monthRange)
    ).toBe(true);
  });

  it("continua excluindo reserva expirada sem sinal do cliente", () => {
    const request = { ...base, pixReservationRequestedAt: threeDaysAgo };
    expect(
      matchesDashboardRequestView(request, "PIX_RESERVATION", monthRange)
    ).toBe(false);
  });
});

describe("sortRequestsForDashboardView", () => {
  const informed = {
    pixReservationPaidAt: null,
    pixReservationClientPaidAt: new Date(),
    id: "informed"
  };
  const pending = {
    pixReservationPaidAt: null,
    pixReservationClientPaidAt: null,
    id: "pending"
  };

  it("coloca informados primeiro na view PIX_RESERVATION", () => {
    expect(
      sortRequestsForDashboardView([pending, informed], "PIX_RESERVATION").map(
        (r) => r.id
      )
    ).toEqual(["informed", "pending"]);
  });

  it("mantém a ordem nas demais views", () => {
    expect(
      sortRequestsForDashboardView([pending, informed], "OPEN").map((r) => r.id)
    ).toEqual(["pending", "informed"]);
    expect(
      sortRequestsForDashboardView([pending, informed], null).map((r) => r.id)
    ).toEqual(["pending", "informed"]);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run tests/unit/dashboard.test.ts`
Expected: FAIL — `sortRequestsForDashboardView` não existe; caso "inclui reserva expirada" falha.

- [ ] **Step 3: Implementar em `lib/dashboard.ts`**

No tipo `DashboardRequest` (linha ~102), adicionar:

```ts
  pixReservationClientPaidAt: Date | null;
```

No `matchesDashboardRequestView`, case `PIX_RESERVATION`:

```ts
    case "PIX_RESERVATION":
      // Reservas expiradas não são acionáveis — exceto quando o cliente
      // informou o pagamento: aí a bola está com o negócio.
      return (
        request.pixReservationRequestedAt !== null &&
        request.pixReservationPaidAt === null &&
        (!isPixPaymentExpired(request.pixReservationRequestedAt) ||
          request.pixReservationClientPaidAt !== null)
      );
```

Nova função exportada:

```ts
// Na visão de reservas Pix, pagamentos informados pelo cliente são os mais
// acionáveis e vêm primeiro; a ordem relativa dos demais não muda.
export function sortRequestsForDashboardView<
  T extends {
    pixReservationClientPaidAt: Date | null;
    pixReservationPaidAt: Date | null;
  }
>(requests: T[], view: DashboardRequestView | null): T[] {
  if (view !== "PIX_RESERVATION") return requests;

  const isInformed = (request: T) =>
    request.pixReservationClientPaidAt !== null &&
    request.pixReservationPaidAt === null;

  return [
    ...requests.filter(isInformed),
    ...requests.filter((request) => !isInformed(request))
  ];
}
```

- [ ] **Step 4: Aplicar na página de pedidos**

Em `app/(dashboard)/dashboard/pedidos/page.tsx`, importar `sortRequestsForDashboardView` de `@/lib/dashboard` e envolver o resultado do filtro (linhas 143–150):

```ts
  const filteredRequests = sortRequestsForDashboardView(
    activeView
      ? (profile?.quoteRequests.filter((request) =>
          matchesDashboardRequestView(request, activeView, monthRange)
        ) ?? [])
      : activeStatus === "ALL"
        ? (profile?.quoteRequests ?? [])
        : (profile?.quoteRequests.filter(
            (request) => request.status === activeStatus
          ) ?? []),
    activeView
  );
```

- [ ] **Step 5: Rodar e ver passar**

Run: `npx vitest run tests/unit/dashboard.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add lib/dashboard.ts "app/(dashboard)/dashboard/pedidos/page.tsx" tests/unit/dashboard.test.ts
git commit -m "feat(pix): view de reservas prioriza pagamentos informados pelo cliente"
```

---

### Task 6: Contagens da dashboard (pendência + sub-contagem)

**Files:**
- Modify: `app/(dashboard)/dashboard/page.tsx:58-123` (transaction) e `:232-237` (pendingActions)

**Interfaces:**
- Consumes: `pixReservationClientPaidAt` (Task 1).
- Produces: nenhum export.

- [ ] **Step 1: Ajustar a transaction**

No destructuring (linha 58), adicionar `clientInformedPixReservations` após `pendingPixReservations`; na lista de queries, trocar o count de reservas pendentes e acrescentar o novo (consistentes com a view da Task 5):

```ts
        prisma.quoteRequest.count({
          where: {
            pixReservationPaidAt: null,
            providerId: profile.id,
            OR: [
              { pixReservationRequestedAt: { gte: pixExpiryCutoff } },
              { pixReservationClientPaidAt: { not: null } }
            ]
          }
        }),
        prisma.quoteRequest.count({
          where: {
            pixReservationPaidAt: null,
            pixReservationClientPaidAt: { not: null },
            providerId: profile.id
          }
        }),
```

Atualizar o fallback de `: [0, 0, 0, 0, 0, 0, 0, 0, 0]` para `: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]` (um zero a mais).

- [ ] **Step 2: Sub-contagem no card de pendência**

No item "Pagamentos Pix para confirmar" de `pendingActions`:

```ts
    {
      count: pendingPixReservations,
      description:
        clientInformedPixReservations > 0
          ? `${clientInformedPixReservations} pagamento${clientInformedPixReservations > 1 ? "s" : ""} informado${clientInformedPixReservations > 1 ? "s" : ""} pelo cliente aguardando sua confirmação.`
          : "Confirme os recebimentos informados pelos clientes.",
      href: "/dashboard/pedidos?view=PIX_RESERVATION",
      label: "Pagamentos Pix para confirmar"
    },
```

- [ ] **Step 3: Lint e commit**

Run: `npm run lint`
Expected: sem erros novos.

```bash
git add "app/(dashboard)/dashboard/page.tsx"
git commit -m "feat(pix): pendencia da dashboard conta pagamentos informados"
```

---

### Task 7: Rate limit do POST da reserva

**Files:**
- Modify: `proxy.ts:16-31` (regras), `:56-69` (match) e `:97-108` (matcher)

**Interfaces:**
- Produces: nenhum export.

- [ ] **Step 1: Nova regra + match + matcher**

Em `RATE_LIMIT_RULES`:

```ts
  // Formulário público de pedido (Server Action em /u/*/orcamento)
  "/u/orcamento": { limit: 20, windowMs: 60_000 },
  // Botão público "Já fiz o pagamento" (Server Action em /u/*/reserva/*)
  "/u/reserva": { limit: 10, windowMs: 60_000 },
```

Em `matchRateLimitRule`, junto ao caso especial existente:

```ts
    if (pattern === "/u/reserva") {
      // Matches /u/[slug]/reserva/[requestId]
      if (/^\/u\/[^/]+\/reserva\//.test(pathname)) return rule;
      continue;
    }
```

No `config.matcher`, adicionar:

```ts
    "/u/:slug/reserva/:requestId",
```

- [ ] **Step 2: Lint e commit**

Run: `npm run lint`
Expected: sem erros novos.

```bash
git add proxy.ts
git commit -m "feat(pix): rate limit no POST publico da reserva"
```

---

### Task 8: `itemShareMessage` (TDD) — feature 1.3

**Files:**
- Modify: `lib/whatsapp-messages.ts`
- Test: Create `tests/unit/whatsapp-messages.test.ts`

**Interfaces:**
- Produces: `itemShareMessage(name: string, price: string | null, url: string): string` (price já formatado em BRL ou null).

- [ ] **Step 1: Teste que falha**

`tests/unit/whatsapp-messages.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { itemShareMessage } from "@/lib/whatsapp-messages";

describe("itemShareMessage", () => {
  const url = "https://vitriny.app/u/doceria/orcamento?serviceId=abc";

  it("inclui nome, preço e link quando há preço fixo", () => {
    expect(itemShareMessage("Bolo de pote", "R$ 25,00", url)).toBe(
      `Olá! Veja Bolo de pote na minha vitrine — R$ 25,00:\n${url}`
    );
  });

  it("omite o preço quando o item é sob consulta", () => {
    expect(itemShareMessage("Bolo de pote", null, url)).toBe(
      `Olá! Veja Bolo de pote na minha vitrine:\n${url}`
    );
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run tests/unit/whatsapp-messages.test.ts`
Expected: FAIL — `itemShareMessage` não exportada.

- [ ] **Step 3: Implementar**

Em `lib/whatsapp-messages.ts`, após `profileLinkMessage`:

```ts
export function itemShareMessage(
  name: string,
  price: string | null,
  url: string
): string {
  const pricePart = price ? ` — ${price}` : "";
  return `Olá! Veja ${name} na minha vitrine${pricePart}:\n${url}`;
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run tests/unit/whatsapp-messages.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/whatsapp-messages.ts tests/unit/whatsapp-messages.test.ts
git commit -m "feat(itens): mensagem de compartilhamento de item no WhatsApp"
```

---

### Task 9: Bloco "Divulgar" no ServiceItem

**Files:**
- Modify: `components/services/ServiceItem.tsx`
- Modify: `components/services/ServiceList.tsx`
- Modify: `app/(dashboard)/dashboard/servicos/page.tsx`

**Interfaces:**
- Consumes: `itemShareMessage` (Task 8), `CopyButton` de `@/components/ui/CopyButton`.
- Produces: prop nova `slug?: string | null` em `ServiceList` e `ServiceItem`.

- [ ] **Step 1: Passar o slug da página até o item**

Em `app/(dashboard)/dashboard/servicos/page.tsx`, adicionar `slug: true` ao `select` do perfil e a prop no `ServiceList`:

```tsx
            <ServiceList
              allowItemTypeSelection={itemTypePolicy.canChooseItemType}
              isPro={profile.plan === "PRO"}
              slug={profile.slug}
              services={...}
```

Em `components/services/ServiceList.tsx`:

```tsx
type ServiceListProps = {
  services: ServiceForClient[];
  isPro?: boolean;
  allowItemTypeSelection?: boolean;
  slug?: string | null;
};

export function ServiceList({
  services,
  isPro = false,
  allowItemTypeSelection = false,
  slug = null
}: ServiceListProps) {
```

e repassar `slug={slug}` no `<ServiceItem ...>`.

- [ ] **Step 2: Bloco Divulgar no painel expandido**

Em `components/services/ServiceItem.tsx`:

1. Imports novos:

```tsx
import { CopyButton } from "@/components/ui/CopyButton";
import { itemShareMessage } from "@/lib/whatsapp-messages";
```

2. Prop nova:

```tsx
type ServiceItemProps = {
  service: ServiceForClient;
  isPro?: boolean;
  allowItemTypeSelection?: boolean;
  slug?: string | null;
};
```

(e `slug = null` no destructuring da função)

3. No corpo, junto às demais derivações:

```tsx
  const shareUrl = slug
    ? `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/u/${slug}/orcamento?serviceId=${service.id}`
    : null;
```

4. No painel expandido, antes do `<ServiceForm ...>` (item oculto não existe na vitrine — sem bloco):

```tsx
          {shareUrl && service.isActive ? (
            <div className="mb-5 rounded-lg border border-paper-soft bg-paper px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-ink-muted">
                Divulgar
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <a
                  className="inline-flex min-h-8 items-center justify-center rounded-md bg-leaf px-3 text-xs font-semibold text-white transition hover:bg-leaf-hover"
                  href={`https://wa.me/?text=${encodeURIComponent(itemShareMessage(service.name, formattedPrice, shareUrl))}`}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  Compartilhar no WhatsApp
                </a>
                <CopyButton label="Copiar link" text={shareUrl} />
              </div>
            </div>
          ) : null}
```

- [ ] **Step 3: Lint e commit**

Run: `npm run lint`
Expected: sem erros novos.

```bash
git add components/services/ "app/(dashboard)/dashboard/servicos/page.tsx"
git commit -m "feat(itens): compartilhar item por WhatsApp e copiar link"
```

---

### Task 10: `buildMonthlyRevenueSummary` (TDD) — feature 1.4

**Files:**
- Modify: `lib/dashboard.ts`
- Test: `tests/unit/dashboard.test.ts`

**Interfaces:**
- Produces: `buildMonthlyRevenueSummary(approvedSum: string | null, pixConfirmedSum: string | null): MonthlyRevenueSummary` com `MonthlyRevenueSummary = { approved: string; pixConfirmed: string; total: string }` (strings BRL formatadas — Decimal nunca cruza a fronteira).

- [ ] **Step 1: Testes que falham**

Em `tests/unit/dashboard.test.ts` (a moeda pt-BR usa espaço não separável — comparar com o mesmo formatador):

```ts
import { buildMonthlyRevenueSummary } from "@/lib/dashboard";

describe("buildMonthlyRevenueSummary", () => {
  const brl = (value: number) =>
    new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL"
    }).format(value);

  it("soma propostas aprovadas e pedidos Pix confirmados", () => {
    expect(buildMonthlyRevenueSummary("1500.5", "249.5")).toEqual({
      approved: brl(1500.5),
      pixConfirmed: brl(249.5),
      total: brl(1750)
    });
  });

  it("trata somas nulas como zero", () => {
    expect(buildMonthlyRevenueSummary(null, null)).toEqual({
      approved: brl(0),
      pixConfirmed: brl(0),
      total: brl(0)
    });
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run tests/unit/dashboard.test.ts`
Expected: FAIL — `buildMonthlyRevenueSummary` não exportada.

- [ ] **Step 3: Implementar em `lib/dashboard.ts`**

```ts
const formatBRL = (value: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(value);

export type MonthlyRevenueSummary = {
  approved: string;
  pixConfirmed: string;
  total: string;
};

// Somas Decimal chegam como string (fronteira server→client) e saem
// formatadas em BRL, prontas para renderizar.
export function buildMonthlyRevenueSummary(
  approvedSum: string | null,
  pixConfirmedSum: string | null
): MonthlyRevenueSummary {
  const approved = Number(approvedSum ?? 0);
  const pixConfirmed = Number(pixConfirmedSum ?? 0);

  return {
    approved: formatBRL(approved),
    pixConfirmed: formatBRL(pixConfirmed),
    total: formatBRL(approved + pixConfirmed)
  };
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run tests/unit/dashboard.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/dashboard.ts tests/unit/dashboard.test.ts
git commit -m "feat(dashboard): resumo do valor movimentado no mes"
```

---

### Task 11: Card "Movimentado no mês" na dashboard

**Files:**
- Create: `components/dashboard/DashboardRevenueCard.tsx`
- Modify: `app/(dashboard)/dashboard/page.tsx` (transaction + render)

**Interfaces:**
- Consumes: `buildMonthlyRevenueSummary` / `MonthlyRevenueSummary` (Task 10); `Card` de `@/components/ui/Card`.
- Produces: `DashboardRevenueCard({ summary }: { summary: MonthlyRevenueSummary })`.

- [ ] **Step 1: Componente**

`components/dashboard/DashboardRevenueCard.tsx`:

```tsx
import { Card } from "@/components/ui/Card";
import type { MonthlyRevenueSummary } from "@/lib/dashboard";

type DashboardRevenueCardProps = {
  summary: MonthlyRevenueSummary;
};

export function DashboardRevenueCard({ summary }: DashboardRevenueCardProps) {
  return (
    <Card className="mt-8 p-5 sm:p-6">
      <p className="text-xs font-semibold uppercase tracking-widest text-ink-muted">
        Movimentado no mês
      </p>
      <p className="mt-2 font-fraunces text-4xl font-bold text-ink">
        {summary.total}
      </p>
      <p className="mt-2 text-xs text-ink-muted">
        {summary.approved} em propostas aprovadas · {summary.pixConfirmed} em
        pedidos Pix confirmados
      </p>
    </Card>
  );
}
```

- [ ] **Step 2: Agregados na transaction**

Em `app/(dashboard)/dashboard/page.tsx`:

1. Imports: `DashboardRevenueCard` e `buildMonthlyRevenueSummary` (junto ao import existente de `buildOnboardingOutcomeStep` de `@/lib/dashboard`).

2. No destructuring da transaction, adicionar ao final: `approvedRevenue, pixRevenue`. Nas queries, ao final:

```ts
        prisma.proposal.aggregate({
          _sum: { totalAmount: true },
          where: {
            providerId: profile.id,
            respondedAt: { gte: monthRange.start, lt: monthRange.end },
            status: "APPROVED"
          }
        }),
        prisma.quoteRequest.aggregate({
          _sum: { fixedServiceAmount: true },
          where: {
            providerId: profile.id,
            pixReservationPaidAt: { gte: monthRange.start, lt: monthRange.end }
          }
        })
```

3. Fallback do ternário ganha dois `null` ao final (depois dos zeros da Task 6):
`: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, null, null]`

4. Montar o resumo (Decimal → string na fronteira):

```ts
  const revenueSummary = buildMonthlyRevenueSummary(
    approvedRevenue?._sum.totalAmount?.toString() ?? null,
    pixRevenue?._sum.fixedServiceAmount?.toString() ?? null
  );
```

5. Renderizar imediatamente antes de `<DashboardMetricGrid metrics={metrics} />`:

```tsx
      <DashboardRevenueCard summary={revenueSummary} />

      <DashboardMetricGrid metrics={metrics} />
```

- [ ] **Step 3: Lint e commit**

Run: `npm run lint`
Expected: sem erros novos.

```bash
git add components/dashboard/DashboardRevenueCard.tsx "app/(dashboard)/dashboard/page.tsx"
git commit -m "feat(dashboard): card de valor movimentado no mes"
```

---

### Task 12: Verificação final

**Files:** nenhum (verificação).

- [ ] **Step 1: Suite completa de unit/actions**

Run: `npx vitest run`
Expected: PASS em todos os arquivos.

- [ ] **Step 2: Lint e build**

Run: `npm run lint`
Expected: sem erros.

Run: `npm run build`
Expected: build conclui sem erro de tipo (valida os pontos sem teste automatizado: páginas de reserva/dashboard/serviços e proxy).

- [ ] **Step 3: Verificação manual do fluxo (dev)**

Com `npm run dev`: criar pedido de item com Pix obrigatório, abrir `/u/{slug}/reserva/{id}`, clicar "Já fiz o pagamento", conferir estado "Pagamento informado", badge "Cliente informou pagamento" no painel, pendência na dashboard, e o card "Movimentado no mês" após confirmar o recebimento. Conferir o bloco "Divulgar" em um item ativo.
