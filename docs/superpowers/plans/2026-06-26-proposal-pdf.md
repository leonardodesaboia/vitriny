# Proposal PDF Generation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow providers to download a PDF of any approved or rejected proposal directly from the dashboard.

**Architecture:** A server-side route handler `GET /api/proposals/[id]/pdf` authenticates the request, validates ownership, generates the PDF with `@react-pdf/renderer`, and returns a binary response. A download link is added to the `QuoteRequestCard` component when the proposal status is `APPROVED` or `REJECTED`.

**Tech Stack:** `@react-pdf/renderer` (server-side PDF generation), Next.js App Router route handler, Prisma, Auth.js v5.

---

## File Map

| Action | Path                                            | Responsibility                                            |
| ------ | ----------------------------------------------- | --------------------------------------------------------- |
| Create | `components/proposals/ProposalPdf.tsx`          | PDF component with type definitions, styles, and layout   |
| Create | `app/api/proposals/[id]/pdf/route.ts`           | Authenticated route handler — auth, ownership, PDF stream |
| Modify | `components/quote-request/QuoteRequestCard.tsx` | Add "Baixar PDF" download link in proposal section        |

---

## Task 1: Install `@react-pdf/renderer`

**Files:** `package.json`, `package-lock.json`

- [ ] **Install the package**

```bash
npm install @react-pdf/renderer
```

- [ ] **Verify types are included (no separate @types needed)**

```bash
ls node_modules/@react-pdf/renderer/src/index.ts 2>/dev/null || echo "types via index.d.ts:" && ls node_modules/@react-pdf/renderer/*.d.ts 2>/dev/null | head -3
```

- [ ] **Verify the build still passes**

```bash
npm run build
```

Expected: build completes without errors.

- [ ] **Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add @react-pdf/renderer for proposal PDF generation"
```

---

## Task 2: Create `ProposalPdf` component

**Files:**

- Create: `components/proposals/ProposalPdf.tsx`

This component is **server-only** — no `"use client"` directive. It uses `@react-pdf/renderer` primitives. Fonts used are Helvetica and Helvetica-Bold (built-in to PDF format — no registration needed).

- [ ] **Create the file with the full component**

```tsx
// components/proposals/ProposalPdf.tsx
import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer";

// ─── Types ───────────────────────────────────────────────────────────────────

export type ProposalPdfData = {
  title: string | null;
  description: string | null;
  publicToken: string;
  status: string;
  totalAmount: { toString(): string };
  depositAmount: { toString(): string } | null;
  depositPaidAt: Date | null;
  validUntil: Date | null;
  respondedAt: Date | null;
  provider: {
    businessName: string;
    email: string | null;
    phone: string | null;
    city: string | null;
    state: string | null;
  };
  quoteRequest: {
    customerName: string;
    customerEmail: string | null;
    customerPhone: string | null;
    desiredDate: string | null;
    desiredTime: string | null;
    location: string | null;
    service: { name: string } | null;
  };
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: { toString(): string };
    totalPrice: { toString(): string };
  }>;
  statusHistory: Array<{
    fromStatus: string | null;
    toStatus: string;
    actor: string;
    createdAt: Date;
  }>;
};

// ─── Constants ───────────────────────────────────────────────────────────────

const C = {
  leaf: "#1B5E3B",
  paper: "#F5F0E8",
  paperSoft: "#EDE8DE",
  ink: "#1C1917",
  inkMuted: "#78716C",
  amber: "#C97D3F",
  mint: "#D4EBD9",
  white: "#FFFFFF",
  red50: "#FEF2F2",
  redText: "#B91C1C",
  amberBg: "#FFFBEB",
  amberBorder: "#FDE68A",
  amberText: "#92400E",
  amberDark: "#78350F",
};

const statusLabels: Record<string, string> = {
  DRAFT: "Rascunho",
  SENT: "Enviada",
  APPROVED: "Aprovada",
  REJECTED: "Recusada",
  EXPIRED: "Expirada",
};

const actorLabels: Record<string, string> = {
  CUSTOMER: "Cliente",
  PROVIDER: "Prestador",
  SYSTEM: "Sistema",
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatMoney(value: { toString(): string }) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(value.toString()));
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(date);
}

function formatSchedulingDate(dateStr: string) {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(
    new Date(dateStr + "T12:00:00Z"),
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    backgroundColor: C.white,
    fontSize: 10,
    color: C.ink,
  },
  // Header
  header: {
    backgroundColor: C.leaf,
    paddingHorizontal: 32,
    paddingVertical: 28,
  },
  headerLabel: {
    fontSize: 7,
    color: "rgba(255,255,255,0.6)",
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  headerTitle: {
    fontFamily: "Helvetica-Bold",
    fontSize: 22,
    color: C.white,
  },
  headerService: {
    fontSize: 10,
    color: "rgba(255,255,255,0.7)",
    marginTop: 4,
  },
  headerBadgeRow: {
    marginTop: 10,
    flexDirection: "row",
  },
  badgeApproved: {
    backgroundColor: C.mint,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  badgeApprovedText: {
    fontFamily: "Helvetica-Bold",
    fontSize: 8,
    color: C.leaf,
  },
  badgeRejected: {
    backgroundColor: C.red50,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  badgeRejectedText: {
    fontFamily: "Helvetica-Bold",
    fontSize: 8,
    color: C.redText,
  },
  // Body
  body: {
    paddingHorizontal: 32,
    paddingTop: 24,
    paddingBottom: 32,
  },
  // Parties
  partiesRow: {
    flexDirection: "row",
  },
  partyCard: {
    flex: 1,
    backgroundColor: C.paper,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.paperSoft,
    borderStyle: "solid",
    padding: 14,
  },
  partyCardLeft: {
    marginRight: 10,
  },
  sectionLabel: {
    fontFamily: "Helvetica-Bold",
    fontSize: 7,
    color: C.inkMuted,
    letterSpacing: 1.2,
    marginBottom: 6,
  },
  sectionLabelLeaf: {
    fontFamily: "Helvetica-Bold",
    fontSize: 7,
    color: C.leaf,
    letterSpacing: 1.2,
    marginBottom: 6,
  },
  partyName: {
    fontFamily: "Helvetica-Bold",
    fontSize: 13,
    color: C.ink,
    marginBottom: 8,
  },
  infoRow: {
    flexDirection: "row",
    marginBottom: 3,
  },
  infoLabel: {
    fontSize: 9,
    color: C.inkMuted,
    width: 52,
  },
  infoValue: {
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
    color: C.ink,
    flex: 1,
  },
  // Scheduling
  schedulingRow: {
    flexDirection: "row",
    backgroundColor: C.paper,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.paperSoft,
    borderStyle: "solid",
    padding: 14,
    marginTop: 12,
  },
  schedulingCol: {
    flex: 1,
  },
  schedulingColMid: {
    flex: 1,
    paddingHorizontal: 12,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: C.paperSoft,
    borderStyle: "solid",
  },
  schedulingValue: {
    fontFamily: "Helvetica-Bold",
    fontSize: 10,
    color: C.ink,
    marginTop: 3,
  },
  // Section title
  sectionTitle: {
    fontFamily: "Helvetica-Bold",
    fontSize: 7,
    color: C.inkMuted,
    letterSpacing: 1.2,
    marginTop: 20,
    marginBottom: 8,
  },
  // Items table
  tableHeader: {
    backgroundColor: C.paperSoft,
    flexDirection: "row",
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  tableRow: {
    flexDirection: "row",
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  tableRowEven: { backgroundColor: C.white },
  tableRowOdd: { backgroundColor: C.paper },
  tableLastRow: {
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
  },
  tableWrapper: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.paperSoft,
    borderStyle: "solid",
    overflow: "hidden",
  },
  colDesc: { flex: 1 },
  colQty: { width: 36, textAlign: "right" },
  colUnit: { width: 80, textAlign: "right" },
  colTotal: { width: 80, textAlign: "right" },
  thText: {
    fontFamily: "Helvetica-Bold",
    fontSize: 7,
    color: C.inkMuted,
    letterSpacing: 0.8,
  },
  tdText: {
    fontSize: 9,
    color: C.ink,
  },
  tdTextBold: {
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
    color: C.ink,
  },
  tdTextMuted: {
    fontSize: 9,
    color: C.inkMuted,
  },
  // Totals bar
  totalsBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    backgroundColor: C.paper,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.paperSoft,
    borderStyle: "solid",
    padding: 16,
    marginTop: 8,
  },
  totalLabel: {
    fontFamily: "Helvetica-Bold",
    fontSize: 7,
    color: C.inkMuted,
    letterSpacing: 1,
    textAlign: "right",
    marginBottom: 2,
  },
  totalValue: {
    fontFamily: "Helvetica-Bold",
    fontSize: 26,
    color: C.leaf,
    textAlign: "right",
  },
  validText: {
    fontSize: 9,
    color: C.inkMuted,
  },
  validValue: {
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
    color: C.ink,
  },
  // Deposit
  depositBox: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.amberBorder,
    borderStyle: "solid",
    marginTop: 10,
    overflow: "hidden",
  },
  depositHeader: {
    backgroundColor: C.amberBg,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  depositLabel: {
    fontFamily: "Helvetica-Bold",
    fontSize: 7,
    color: C.amberText,
    letterSpacing: 1,
    marginBottom: 3,
  },
  depositValue: {
    fontFamily: "Helvetica-Bold",
    fontSize: 18,
    color: C.amberDark,
  },
  depositBadge: {
    backgroundColor: C.amberBorder,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  depositBadgeText: {
    fontFamily: "Helvetica-Bold",
    fontSize: 8,
    color: C.amberText,
  },
  depositPaidBadge: {
    backgroundColor: C.mint,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  depositPaidBadgeText: {
    fontFamily: "Helvetica-Bold",
    fontSize: 8,
    color: C.leaf,
  },
  // History
  historyItem: {
    paddingLeft: 10,
    borderLeftWidth: 2,
    borderLeftColor: C.paperSoft,
    borderStyle: "solid",
    marginBottom: 8,
  },
  historyStatus: {
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
    color: C.ink,
    marginBottom: 1,
  },
  historyMeta: {
    fontSize: 8,
    color: C.inkMuted,
  },
  // Footer
  footer: {
    borderTopWidth: 1,
    borderTopColor: C.paperSoft,
    borderStyle: "solid",
    paddingTop: 12,
    marginTop: 16,
  },
  footerText: {
    fontSize: 8,
    color: C.inkMuted,
    textAlign: "center",
  },
});

// ─── Component ───────────────────────────────────────────────────────────────

export function ProposalPdf({ proposal }: { proposal: ProposalPdfData }) {
  const hasDeposit =
    proposal.depositAmount !== null &&
    Number(proposal.depositAmount.toString()) > 0;

  const hasScheduling =
    proposal.quoteRequest.desiredDate ||
    proposal.quoteRequest.desiredTime ||
    proposal.quoteRequest.location;

  const providerLocation = [proposal.provider.city, proposal.provider.state]
    .filter(Boolean)
    .join(", ");

  return (
    <Document>
      <Page size="A4" style={s.page}>
        {/* ── Header ── */}
        <View style={s.header}>
          <Text style={s.headerLabel}>ORÇAFÁCIL · PROPOSTA COMERCIAL</Text>
          <Text style={s.headerTitle}>
            {proposal.title ?? proposal.provider.businessName}
          </Text>
          {proposal.quoteRequest.service?.name ? (
            <Text style={s.headerService}>
              Serviço: {proposal.quoteRequest.service.name}
            </Text>
          ) : null}
          <View style={s.headerBadgeRow}>
            {proposal.status === "APPROVED" ? (
              <View style={s.badgeApproved}>
                <Text style={s.badgeApprovedText}>Aprovada</Text>
              </View>
            ) : (
              <View style={s.badgeRejected}>
                <Text style={s.badgeRejectedText}>Recusada</Text>
              </View>
            )}
          </View>
        </View>

        <View style={s.body}>
          {/* ── Prestador / Cliente ── */}
          <View style={s.partiesRow}>
            <View style={[s.partyCard, s.partyCardLeft]}>
              <Text style={s.sectionLabelLeaf}>PRESTADOR</Text>
              <Text style={s.partyName}>{proposal.provider.businessName}</Text>
              {proposal.provider.email ? (
                <View style={s.infoRow}>
                  <Text style={s.infoLabel}>E-mail</Text>
                  <Text style={s.infoValue}>{proposal.provider.email}</Text>
                </View>
              ) : null}
              {proposal.provider.phone ? (
                <View style={s.infoRow}>
                  <Text style={s.infoLabel}>Telefone</Text>
                  <Text style={s.infoValue}>{proposal.provider.phone}</Text>
                </View>
              ) : null}
              {providerLocation ? (
                <View style={s.infoRow}>
                  <Text style={s.infoLabel}>Local</Text>
                  <Text style={s.infoValue}>{providerLocation}</Text>
                </View>
              ) : null}
            </View>

            <View style={s.partyCard}>
              <Text style={s.sectionLabel}>CLIENTE</Text>
              <Text style={s.partyName}>
                {proposal.quoteRequest.customerName}
              </Text>
              {proposal.quoteRequest.customerEmail ? (
                <View style={s.infoRow}>
                  <Text style={s.infoLabel}>E-mail</Text>
                  <Text style={s.infoValue}>
                    {proposal.quoteRequest.customerEmail}
                  </Text>
                </View>
              ) : null}
              {proposal.quoteRequest.customerPhone ? (
                <View style={s.infoRow}>
                  <Text style={s.infoLabel}>Telefone</Text>
                  <Text style={s.infoValue}>
                    {proposal.quoteRequest.customerPhone}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>

          {/* ── Agendamento ── */}
          {hasScheduling ? (
            <View style={s.schedulingRow}>
              <View style={s.schedulingCol}>
                <Text style={s.sectionLabel}>DATA DESEJADA</Text>
                <Text style={s.schedulingValue}>
                  {proposal.quoteRequest.desiredDate
                    ? formatSchedulingDate(proposal.quoteRequest.desiredDate)
                    : "—"}
                </Text>
              </View>
              <View style={s.schedulingColMid}>
                <Text style={s.sectionLabel}>HORÁRIO / PERÍODO</Text>
                <Text style={s.schedulingValue}>
                  {proposal.quoteRequest.desiredTime ?? "—"}
                </Text>
              </View>
              <View style={s.schedulingCol}>
                <Text style={[s.sectionLabel, { paddingLeft: 12 }]}>LOCAL</Text>
                <Text style={[s.schedulingValue, { paddingLeft: 12 }]}>
                  {proposal.quoteRequest.location ?? "—"}
                </Text>
              </View>
            </View>
          ) : null}

          {/* ── Descrição ── */}
          {proposal.description ? (
            <>
              <Text style={s.sectionTitle}>DESCRIÇÃO</Text>
              <Text style={{ fontSize: 9, color: C.inkMuted, lineHeight: 1.6 }}>
                {proposal.description}
              </Text>
            </>
          ) : null}

          {/* ── Itens da proposta ── */}
          {proposal.items.length > 0 ? (
            <>
              <Text style={s.sectionTitle}>ITENS DA PROPOSTA</Text>
              <View style={s.tableWrapper}>
                <View style={s.tableHeader}>
                  <Text style={[s.thText, s.colDesc]}>Descrição</Text>
                  <Text style={[s.thText, s.colQty]}>Qtd</Text>
                  <Text style={[s.thText, s.colUnit]}>Unit.</Text>
                  <Text style={[s.thText, s.colTotal]}>Total</Text>
                </View>
                {proposal.items.map((item, i) => (
                  <View
                    key={i}
                    style={[
                      s.tableRow,
                      i % 2 === 0 ? s.tableRowEven : s.tableRowOdd,
                      i === proposal.items.length - 1 ? s.tableLastRow : {},
                    ]}
                  >
                    <Text style={[s.tdText, s.colDesc]}>
                      {item.description}
                    </Text>
                    <Text style={[s.tdTextMuted, s.colQty]}>
                      {item.quantity}
                    </Text>
                    <Text style={[s.tdTextMuted, s.colUnit]}>
                      {formatMoney(item.unitPrice)}
                    </Text>
                    <Text style={[s.tdTextBold, s.colTotal]}>
                      {formatMoney(item.totalPrice)}
                    </Text>
                  </View>
                ))}
              </View>
            </>
          ) : null}

          {/* ── Total + Validade ── */}
          <View style={s.totalsBar}>
            <View>
              {proposal.validUntil ? (
                <>
                  <Text style={s.validText}>Válido até</Text>
                  <Text style={s.validValue}>
                    {formatDate(proposal.validUntil)}
                  </Text>
                </>
              ) : null}
              {proposal.respondedAt ? (
                <>
                  <Text style={[s.validText, { marginTop: 4 }]}>
                    Respondida em
                  </Text>
                  <Text style={s.validValue}>
                    {formatDate(proposal.respondedAt)}
                  </Text>
                </>
              ) : null}
            </View>
            <View>
              <Text style={s.totalLabel}>TOTAL</Text>
              <Text style={s.totalValue}>
                {formatMoney(proposal.totalAmount)}
              </Text>
            </View>
          </View>

          {/* ── Entrada (sinal) ── */}
          {hasDeposit ? (
            <View style={s.depositBox}>
              <View style={s.depositHeader}>
                <View>
                  <Text style={s.depositLabel}>ENTRADA (SINAL)</Text>
                  <Text style={s.depositValue}>
                    {formatMoney(proposal.depositAmount!)}
                  </Text>
                </View>
                {proposal.depositPaidAt ? (
                  <View style={s.depositPaidBadge}>
                    <Text style={s.depositPaidBadgeText}>Recebido</Text>
                  </View>
                ) : (
                  <View style={s.depositBadge}>
                    <Text style={s.depositBadgeText}>Aguardando</Text>
                  </View>
                )}
              </View>
            </View>
          ) : null}

          {/* ── Histórico de status ── */}
          {proposal.statusHistory.length > 0 ? (
            <>
              <Text style={s.sectionTitle}>HISTÓRICO</Text>
              {proposal.statusHistory.map((h, i) => (
                <View key={i} style={s.historyItem}>
                  <Text style={s.historyStatus}>
                    {h.fromStatus
                      ? `${statusLabels[h.fromStatus] ?? h.fromStatus} → ${statusLabels[h.toStatus] ?? h.toStatus}`
                      : (statusLabels[h.toStatus] ?? h.toStatus)}
                  </Text>
                  <Text style={s.historyMeta}>
                    {actorLabels[h.actor] ?? h.actor} ·{" "}
                    {formatDate(h.createdAt)}
                  </Text>
                </View>
              ))}
            </>
          ) : null}

          {/* ── Rodapé ── */}
          <View style={s.footer}>
            <Text style={s.footerText}>
              Gerado via Vitriny em{" "}
              {new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(
                new Date(),
              )}
            </Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}
```

- [ ] **Confirm the file was created**

```bash
ls components/proposals/ProposalPdf.tsx
```

- [ ] **Commit**

```bash
git add components/proposals/ProposalPdf.tsx
git commit -m "feat(pdf): add ProposalPdf component with design tokens"
```

---

## Task 3: Create API route `GET /api/proposals/[id]/pdf`

**Files:**

- Create: `app/api/proposals/[id]/pdf/route.ts`

Auth pattern follows `app/api/services/[id]/image/route.ts`: call `auth()` → get profile by `userId` → find resource by `id` with `providerId` check.

Note: `renderToBuffer` from `@react-pdf/renderer` returns a `Buffer` (Node.js). It is compatible with the `Response` constructor in Next.js App Router directly.

- [ ] **Create the route handler**

```ts
// app/api/proposals/[id]/pdf/route.ts
import { createElement } from "react";

import { type NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  ProposalPdf,
  type ProposalPdfData,
} from "@/components/proposals/ProposalPdf";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: RouteContext) {
  const { id } = await params;

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const profile = await prisma.providerProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });

  if (!profile) {
    return NextResponse.json(
      { error: "Perfil não encontrado." },
      { status: 404 },
    );
  }

  const proposal = await prisma.proposal.findFirst({
    where: { id, providerId: profile.id },
    include: {
      provider: {
        select: {
          businessName: true,
          email: true,
          phone: true,
          city: true,
          state: true,
        },
      },
      quoteRequest: {
        include: {
          service: { select: { name: true } },
        },
      },
      items: { orderBy: { createdAt: "asc" } },
      statusHistory: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!proposal) {
    return NextResponse.json(
      { error: "Proposta não encontrada." },
      { status: 404 },
    );
  }

  if (proposal.status !== "APPROVED" && proposal.status !== "REJECTED") {
    return NextResponse.json(
      { error: "PDF disponível apenas para propostas aprovadas ou recusadas." },
      { status: 400 },
    );
  }

  const data: ProposalPdfData = {
    title: proposal.title,
    description: proposal.description,
    publicToken: proposal.publicToken,
    status: proposal.status,
    totalAmount: proposal.totalAmount,
    depositAmount: proposal.depositAmount,
    depositPaidAt: proposal.depositPaidAt,
    validUntil: proposal.validUntil,
    respondedAt: proposal.respondedAt,
    provider: proposal.provider,
    quoteRequest: {
      customerName: proposal.quoteRequest.customerName,
      customerEmail: proposal.quoteRequest.customerEmail,
      customerPhone: proposal.quoteRequest.customerPhone,
      desiredDate: proposal.quoteRequest.desiredDate,
      desiredTime: proposal.quoteRequest.desiredTime,
      location: proposal.quoteRequest.location,
      service: proposal.quoteRequest.service,
    },
    items: proposal.items.map((item) => ({
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      totalPrice: item.totalPrice,
    })),
    statusHistory: proposal.statusHistory.map((h) => ({
      fromStatus: h.fromStatus ?? null,
      toStatus: h.toStatus,
      actor: h.actor,
      createdAt: h.createdAt,
    })),
  };

  const buffer = await renderToBuffer(
    createElement(ProposalPdf, { proposal: data }),
  );

  const filename = `proposta-${proposal.publicToken}.pdf`;

  return new Response(buffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
```

- [ ] **Verify the file compiles (quick type check)**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors related to the new file.

- [ ] **Commit**

```bash
git add app/api/proposals/[id]/pdf/route.ts
git commit -m "feat(pdf): add authenticated route GET /api/proposals/[id]/pdf"
```

---

## Task 4: Add "Baixar PDF" button to `QuoteRequestCard`

**Files:**

- Modify: `components/quote-request/QuoteRequestCard.tsx`

Find the proposal section (search for `Ver proposta ↗`). The button goes next to that link. The condition is `proposal.status === "APPROVED" || proposal.status === "REJECTED"`.

The current proposal header block looks like:

```tsx
<div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
  <div className="min-w-0">
    <p className="text-xs font-semibold uppercase tracking-widest text-leaf">
      Proposta
    </p>
    <Link
      className="mt-1 block break-all text-sm font-semibold text-ink transition hover:text-leaf"
      href={`/proposta/${quoteRequest.proposal.publicToken}`}
      target="_blank"
      rel="noopener noreferrer"
    >
      Ver proposta ↗
    </Link>
  </div>
  <span className={`rounded-full px-3 py-1 text-xs font-semibold ...`}>
    {proposalStatusLabel[quoteRequest.proposal.status]}
  </span>
</div>
```

- [ ] **Replace that block with the version that includes the download link**

Find and replace the `<div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">` block inside the proposal section. Replace with:

```tsx
<div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
  <div className="min-w-0">
    <p className="text-xs font-semibold uppercase tracking-widest text-leaf">
      Proposta
    </p>
    <div className="mt-1 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
      <Link
        className="block break-all text-sm font-semibold text-ink transition hover:text-leaf"
        href={`/proposta/${quoteRequest.proposal.publicToken}`}
        target="_blank"
        rel="noopener noreferrer"
      >
        Ver proposta ↗
      </Link>
      {quoteRequest.proposal.status === "APPROVED" ||
      quoteRequest.proposal.status === "REJECTED" ? (
        <a
          href={`/api/proposals/${quoteRequest.proposal.id}/pdf`}
          download
          className="inline-flex min-h-8 items-center justify-center rounded-md border border-paper-soft bg-white px-3 text-xs font-semibold text-ink transition hover:border-stone-300"
        >
          ↓ Baixar PDF
        </a>
      ) : null}
    </div>
  </div>
  <span
    className={`rounded-full px-3 py-1 text-xs font-semibold ${proposalStatusBadge[quoteRequest.proposal.status] ?? "bg-paper-soft text-ink-muted"}`}
  >
    {proposalStatusLabel[quoteRequest.proposal.status]}
  </span>
</div>
```

- [ ] **Commit**

```bash
git add components/quote-request/QuoteRequestCard.tsx
git commit -m "feat(pdf): add download PDF button in QuoteRequestCard for approved/rejected proposals"
```

---

## Task 5: Validate build and tests

- [ ] **Run lint**

```bash
npm run lint
```

Expected: no errors.

- [ ] **Run type check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Run build**

```bash
npm run build
```

Expected: build completes. If `@react-pdf/renderer` causes a "cannot be used in a Client Component" error, add the following to `next.config.ts` (or `next.config.js`) under `serverExternalPackages`:

```ts
// next.config.ts
const nextConfig = {
  serverExternalPackages: ["@react-pdf/renderer"],
  // ... existing config
};
```

- [ ] **Run unit + action tests**

```bash
npm test
```

Expected: all tests pass (no changes to existing tests).

- [ ] **Manual smoke test**

1. Start the dev server: `npm run dev`
2. Log in as a provider and navigate to `/dashboard/pedidos`
3. Find a pedido with proposal status `APPROVED` or `REJECTED` — the "Baixar PDF" button must appear
4. Click "Baixar PDF" — browser must prompt to download a `.pdf` file
5. Open the PDF and verify:
   - Header: green background, proposal title, service name, status badge
   - Prestador card and Cliente card side by side
   - Agendamento section (if desiredDate/desiredTime/location filled)
   - Items table with alternating row colors
   - Total in large type at bottom right
   - Deposit section (if depositAmount > 0)
   - Status history timeline
   - Footer with generation date
6. Test a pedido with proposal status `SENT` — "Baixar PDF" button must NOT appear

- [ ] **Test unauthenticated access to route**

```bash
curl -I http://localhost:3000/api/proposals/some-id/pdf
```

Expected: `HTTP/1.1 401`
