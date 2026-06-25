# Service Pricing Type (FIXED / CUSTOM) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir que o prestador classifique cada serviço como preço fixo (FIXED) ou sob orçamento (CUSTOM), adaptando fluxo público e painel de pedidos de acordo.

**Architecture:** Adiciona enum `ServicePricingType` e campo `pricingType` em `Service` (default `CUSTOM`), propagando o tipo por validação, actions, types, componentes e páginas. A adaptação de linguagem no formulário público acontece no servidor via SSR com base no `?serviceId=` da query. Propostas existentes não são tocadas.

**Tech Stack:** Next.js 15 App Router, Prisma ORM, PostgreSQL, Zod, TypeScript, Tailwind CSS, Vitest

---

## Mapa de arquivos

| Arquivo | Ação |
|---------|------|
| `prisma/schema.prisma` | Alterar — enum + campo |
| `lib/validations/service.ts` | Alterar — pricingType + superRefine |
| `lib/validations/quote-request.ts` | Alterar — description opcional |
| `tests/unit/validations/service.test.ts` | Alterar — fixture + novos casos |
| `tests/unit/validations/quote-request.test.ts` | Alterar — caso description vazia ok |
| `types/service.ts` | Alterar — 3 tipos |
| `types/quote-request.ts` | Alterar — include service pricingType+basePrice |
| `lib/actions/services.ts` | Alterar — parse + persist pricingType |
| `components/services/ServiceForm.tsx` | Alterar — toggle FIXED/CUSTOM |
| `components/services/ServiceList.tsx` | Alterar — badge de tipo |
| `app/u/[slug]/page.tsx` | Alterar — selecionar pricingType |
| `components/public/PublicServicesGrid.tsx` | Alterar — preço vs "Sob orçamento", CTA |
| `app/u/[slug]/orcamento/page.tsx` | Alterar — selecionar pricingType, linguagem |
| `components/quote-request/QuoteRequestForm.tsx` | Alterar — linguagem por tipo |
| `app/(dashboard)/dashboard/pedidos/page.tsx` | Alterar — incluir pricingType+basePrice |
| `components/quote-request/QuoteRequestList.tsx` | Alterar — serializar service.basePrice |
| `components/quote-request/QuoteRequestCard.tsx` | Alterar — badge + CTA por tipo |
| `docs/DATABASE.md` | Alterar |
| `docs/AI_HANDOFF.md` | Alterar |

---

## Task 1 — Schema Prisma + migration

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **1.1 — Adicionar enum e campo**

Em `prisma/schema.prisma`, adicionar o enum antes dos outros enums e o campo em `Service`:

```prisma
// Adicionar junto aos outros enums (antes de QuoteRequestStatus)
enum ServicePricingType {
  FIXED
  CUSTOM
}
```

Em `model Service`, adicionar após `isActive`:

```prisma
  pricingType ServicePricingType @default(CUSTOM)
```

O bloco `Service` completo fica:

```prisma
model Service {
  id          String             @id @default(cuid())
  providerId  String
  name        String
  description String?
  basePrice   Decimal?           @db.Decimal(10, 2)
  isActive    Boolean            @default(true)
  pricingType ServicePricingType @default(CUSTOM)
  createdAt   DateTime           @default(now())
  updatedAt   DateTime           @updatedAt

  provider      ProviderProfile @relation(fields: [providerId], references: [id], onDelete: Cascade)
  quoteRequests QuoteRequest[]
}
```

- [ ] **1.2 — Validar schema**

```bash
npx prisma validate
```

Esperado: nenhum erro.

- [ ] **1.3 — Criar migration**

```bash
npm run prisma:migrate -- --name add_service_pricing_type
```

Esperado: migration criada em `prisma/migrations/` sem erros.

- [ ] **1.4 — Gerar client**

```bash
npm run prisma:generate
```

Esperado: Prisma Client regenerado com o novo campo e enum.

- [ ] **1.5 — Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat(schema): adiciona ServicePricingType FIXED/CUSTOM em Service"
```

---

## Task 2 — Validação de serviço + testes

**Files:**
- Modify: `lib/validations/service.ts`
- Modify: `tests/unit/validations/service.test.ts`

- [ ] **2.1 — Escrever novos casos de teste (falharão antes da implementação)**

Em `tests/unit/validations/service.test.ts`, substituir o conteúdo completo por:

```ts
import { describe, it, expect } from "vitest";
import { serviceSchema } from "@/lib/validations/service";

describe("serviceSchema", () => {
  // fixture base agora inclui pricingType
  const valid = {
    name: "Pintura residencial",
    description: "",
    basePrice: "",
    pricingType: "CUSTOM",
    isActive: true
  };

  it("aceita dados válidos sem preço e sem descrição (CUSTOM)", () => {
    const result = serviceSchema.safeParse(valid);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.basePrice).toBeNull();
      expect(result.data.description).toBeNull();
    }
  });

  it("aceita dados válidos com preço e descrição (CUSTOM)", () => {
    const result = serviceSchema.safeParse({
      ...valid,
      description: "Pintura interna e externa",
      basePrice: "350.00"
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.basePrice).toBe("350.00");
      expect(result.data.description).toBe("Pintura interna e externa");
    }
  });

  it("rejeita nome com menos de 2 caracteres", () => {
    expect(serviceSchema.safeParse({ ...valid, name: "A" }).success).toBe(false);
  });

  it("rejeita nome com mais de 120 caracteres", () => {
    expect(serviceSchema.safeParse({ ...valid, name: "A".repeat(121) }).success).toBe(false);
  });

  it("rejeita descrição com mais de 600 caracteres", () => {
    expect(
      serviceSchema.safeParse({ ...valid, description: "A".repeat(601) }).success
    ).toBe(false);
  });

  it("rejeita preço em formato inválido", () => {
    expect(serviceSchema.safeParse({ ...valid, basePrice: "abc" }).success).toBe(false);
    expect(serviceSchema.safeParse({ ...valid, basePrice: "-10" }).success).toBe(false);
  });

  it("aceita preço com vírgula como separador decimal", () => {
    const result = serviceSchema.safeParse({ ...valid, basePrice: "350,50" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.basePrice).toBe("350.50");
  });

  it("aceita preço inteiro sem decimais", () => {
    const result = serviceSchema.safeParse({ ...valid, basePrice: "100" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.basePrice).toBe("100");
  });

  it("rejeita preço com mais de 2 casas decimais", () => {
    expect(serviceSchema.safeParse({ ...valid, basePrice: "100.123" }).success).toBe(false);
  });

  // Novos casos — pricingType FIXED
  it("FIXED aceita basePrice > 0", () => {
    const result = serviceSchema.safeParse({
      ...valid,
      pricingType: "FIXED",
      basePrice: "200.00"
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.pricingType).toBe("FIXED");
      expect(result.data.basePrice).toBe("200.00");
    }
  });

  it("FIXED rejeita quando basePrice está vazio", () => {
    const result = serviceSchema.safeParse({
      ...valid,
      pricingType: "FIXED",
      basePrice: ""
    });
    expect(result.success).toBe(false);
  });

  it("FIXED rejeita quando basePrice é nulo", () => {
    const result = serviceSchema.safeParse({
      ...valid,
      pricingType: "FIXED",
      basePrice: null
    });
    expect(result.success).toBe(false);
  });

  it("CUSTOM aceita basePrice vazio", () => {
    const result = serviceSchema.safeParse({
      ...valid,
      pricingType: "CUSTOM",
      basePrice: ""
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.basePrice).toBeNull();
  });

  it("rejeita pricingType inválido", () => {
    expect(
      serviceSchema.safeParse({ ...valid, pricingType: "HORA" }).success
    ).toBe(false);
  });
});
```

- [ ] **2.2 — Rodar testes para confirmar falha**

```bash
npm test -- tests/unit/validations/service.test.ts
```

Esperado: falhas nos novos casos (campo `pricingType` não existe no schema atual).

- [ ] **2.3 — Implementar schema atualizado**

Substituir `lib/validations/service.ts` por:

```ts
import { z } from "zod";

const optionalText = z
  .string()
  .trim()
  .transform((value) => (value === "" ? null : value));

const optionalPrice = z
  .string()
  .trim()
  .transform((value) => {
    if (!value) return null;
    return value.includes(",")
      ? value.replace(/\./g, "").replace(",", ".")
      : value;
  })
  .pipe(
    z
      .string()
      .regex(/^\d+(\.\d{1,2})?$/, "Informe um valor válido.")
      .nullable()
  );

export const serviceSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Informe o nome do serviço.")
      .max(120, "Use no máximo 120 caracteres."),
    description: optionalText.pipe(
      z.string().max(600, "Use no máximo 600 caracteres.").nullable()
    ),
    pricingType: z.enum(["FIXED", "CUSTOM"]),
    basePrice: optionalPrice,
    isActive: z.boolean()
  })
  .superRefine((data, ctx) => {
    if (data.pricingType === "FIXED" && !data.basePrice) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Informe o preço para serviço com preço fixo.",
        path: ["basePrice"]
      });
    }
  });

export type ServiceInput = z.infer<typeof serviceSchema>;
```

- [ ] **2.4 — Rodar testes e confirmar que todos passam**

```bash
npm test -- tests/unit/validations/service.test.ts
```

Esperado: todos os casos passando.

- [ ] **2.5 — Commit**

```bash
git add lib/validations/service.ts tests/unit/validations/service.test.ts
git commit -m "feat(validation): adiciona pricingType FIXED/CUSTOM com validação condicional de preço"
```

---

## Task 3 — Validação de quote-request (description opcional)

**Files:**
- Modify: `lib/validations/quote-request.ts`
- Modify: `tests/unit/validations/quote-request.test.ts`

- [ ] **3.1 — Verificar caso existente de description vazia**

```bash
npm test -- tests/unit/validations/quote-request.test.ts
```

Anote quais testes existem para `description`. O objetivo é garantir que, após a mudança, `description` aceite null (para pedidos FIXED) mas ainda exija conteúdo mínimo quando preenchida.

- [ ] **3.2 — Adicionar caso de teste para description vazia em pedidos FIXED**

Em `tests/unit/validations/quote-request.test.ts`, adicionar ao final do arquivo:

```ts
it("aceita description nula (pedido de serviço com preço fixo)", () => {
  const result = quoteRequestSchema.safeParse({
    customerName: "Maria Silva",
    customerEmail: "",
    customerPhone: "",
    serviceId: "",
    description: ""
  });
  expect(result.success).toBe(true);
  if (result.success) {
    expect(result.data.description).toBeNull();
  }
});

it("rejeita description com menos de 10 caracteres quando preenchida", () => {
  const result = quoteRequestSchema.safeParse({
    customerName: "Maria Silva",
    customerEmail: "",
    customerPhone: "",
    serviceId: "",
    description: "Curta"
  });
  expect(result.success).toBe(false);
});
```

- [ ] **3.3 — Rodar para confirmar falha (description vazia ainda rejeita)**

```bash
npm test -- tests/unit/validations/quote-request.test.ts
```

Esperado: o caso "aceita description nula" falha.

- [ ] **3.4 — Atualizar schema de quote-request**

Em `lib/validations/quote-request.ts`, substituir o campo `description` por:

```ts
  description: z
    .string()
    .trim()
    .transform((v) => (v === "" ? null : v))
    .pipe(
      z.union([
        z.null(),
        z
          .string()
          .min(10, "Descreva o que você precisa com pelo menos 10 caracteres.")
          .max(1200, "Use no máximo 1200 caracteres.")
      ])
    )
```

O arquivo completo fica:

```ts
import { z } from "zod";

import { formatPhoneBR, isValidPhoneBR } from "@/lib/utils/phone";

const optionalText = z
  .preprocess((value) => (value == null ? "" : value), z.string())
  .transform((value) => value.trim())
  .transform((value) => (value === "" ? null : value));

const optionalPhone = optionalText.pipe(
  z
    .string()
    .max(30, "Use no máximo 30 caracteres.")
    .nullable()
    .refine(isValidPhoneBR, "Informe um telefone válido com DDD.")
    .transform((value) => (value ? formatPhoneBR(value) : null))
);

export const quoteRequestSchema = z.object({
  customerName: z
    .string()
    .trim()
    .min(2, "Informe seu nome.")
    .max(120, "Use no máximo 120 caracteres."),
  customerEmail: optionalText.pipe(
    z
      .string()
      .email("Informe um e-mail válido.")
      .max(120, "Use no máximo 120 caracteres.")
      .nullable()
  ),
  customerPhone: optionalPhone,
  serviceId: optionalText.pipe(z.string().cuid().nullable()),
  description: z
    .string()
    .trim()
    .transform((v) => (v === "" ? null : v))
    .pipe(
      z.union([
        z.null(),
        z
          .string()
          .min(10, "Descreva o que você precisa com pelo menos 10 caracteres.")
          .max(1200, "Use no máximo 1200 caracteres.")
      ])
    )
});

export type QuoteRequestInput = z.infer<typeof quoteRequestSchema>;
```

- [ ] **3.5 — Rodar testes e confirmar que todos passam**

```bash
npm test -- tests/unit/validations/quote-request.test.ts
```

Esperado: todos passando, incluindo os dois novos.

- [ ] **3.6 — Commit**

```bash
git add lib/validations/quote-request.ts tests/unit/validations/quote-request.test.ts
git commit -m "feat(validation): torna description de pedido opcional para serviços com preço fixo"
```

---

## Task 4 — Types

**Files:**
- Modify: `types/service.ts`
- Modify: `types/quote-request.ts`

- [ ] **4.1 — Atualizar types/service.ts**

Substituir `types/service.ts` por:

```ts
export type ServiceSummary = {
  id: string;
  name: string;
  pricingType: "FIXED" | "CUSTOM";
  basePrice: string | null;
};

export type PublicService = {
  id: string;
  name: string;
  description: string | null;
  basePrice: string | null;
  pricingType: "FIXED" | "CUSTOM";
};

export type ServiceForClient = {
  id: string;
  name: string;
  description: string | null;
  basePrice: string | null;
  isActive: boolean;
  pricingType: "FIXED" | "CUSTOM";
};
```

- [ ] **4.2 — Atualizar types/quote-request.ts**

Substituir `types/quote-request.ts` por:

```ts
import type { Prisma } from "@prisma/client";

export type QuoteRequestWithRelations = Prisma.QuoteRequestGetPayload<{
  include: {
    service: {
      select: {
        id: true;
        name: true;
        pricingType: true;
        basePrice: true;
      };
    };
    proposal: {
      select: {
        id: true;
        publicToken: true;
        status: true;
        depositAmount: true;
        depositPaidAt: true;
      };
    };
    statusHistory: {
      select: {
        id: true;
        fromStatus: true;
        toStatus: true;
        actor: true;
        note: true;
        createdAt: true;
      };
    };
    internalNotes: {
      select: {
        id: true;
        content: true;
        createdAt: true;
        author: { select: { name: true; email: true } };
      };
    };
  };
}>;
```

- [ ] **4.3 — Verificar que o build não quebra com os tipos novos**

```bash
npm run build 2>&1 | grep -E "error|Error" | head -20
```

Haverá erros TypeScript porque os arquivos que consomem esses tipos ainda não foram atualizados — isso é esperado agora e será resolvido nas próximas tasks.

- [ ] **4.4 — Commit parcial**

```bash
git add types/service.ts types/quote-request.ts
git commit -m "feat(types): adiciona pricingType e basePrice em ServiceSummary, PublicService, ServiceForClient e QuoteRequestWithRelations"
```

---

## Task 5 — Action de serviços

**Files:**
- Modify: `lib/actions/services.ts`

- [ ] **5.1 — Adicionar pricingType no parseServiceForm e persistência**

Substituir a função `parseServiceForm` e os locais de `prisma.service.create`/`update` em `lib/actions/services.ts`.

A função de parse atualizada:

```ts
function parseServiceForm(formData: FormData) {
  return serviceSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
    pricingType: formData.get("pricingType"),
    basePrice: formData.get("basePrice"),
    isActive: formData.get("isActive") === "on"
  });
}
```

No `prisma.service.create`, adicionar `pricingType`:

```ts
  await prisma.service.create({
    data: {
      providerId: profile.id,
      name: parsed.data.name,
      description: parsed.data.description,
      pricingType: parsed.data.pricingType,
      basePrice: toDecimal(parsed.data.basePrice),
      isActive: parsed.data.isActive
    }
  });
```

No `prisma.service.update`, adicionar `pricingType`:

```ts
  await prisma.service.update({
    where: { id: service.id },
    data: {
      name: parsed.data.name,
      description: parsed.data.description,
      pricingType: parsed.data.pricingType,
      basePrice: toDecimal(parsed.data.basePrice),
      isActive: parsed.data.isActive
    }
  });
```

- [ ] **5.2 — Commit**

```bash
git add lib/actions/services.ts
git commit -m "feat(actions): persiste pricingType ao criar e atualizar serviço"
```

---

## Task 6 — ServiceForm (dashboard)

**Files:**
- Modify: `components/services/ServiceForm.tsx`

- [ ] **6.1 — Reescrever ServiceForm com toggle FIXED/CUSTOM**

Substituir o conteúdo de `components/services/ServiceForm.tsx` por:

```tsx
"use client";

import { useActionState, useState } from "react";

import { createService, updateService } from "@/lib/actions/services";
import { CurrencyInput } from "@/components/ui/CurrencyInput";
import type { ActionResult } from "@/types";
import type { ServiceForClient } from "@/types/service";

type ServiceFormProps = {
  service?: ServiceForClient;
};

export function ServiceForm({ service }: ServiceFormProps) {
  const action = service ? updateService : createService;
  const [state, formAction, isPending] = useActionState<ActionResult, FormData>(
    action,
    undefined
  );
  const [pricingType, setPricingType] = useState<"FIXED" | "CUSTOM">(
    service?.pricingType ?? "CUSTOM"
  );

  return (
    <form
      action={formAction}
      className="grid gap-4 rounded-lg border border-stone-200 bg-white p-5"
    >
      {service ? <input name="serviceId" type="hidden" value={service.id} /> : null}
      <input name="pricingType" type="hidden" value={pricingType} />

      {state?.error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {state.error}
        </p>
      ) : null}

      {/* Tipo de precificação */}
      <div>
        <p className="text-sm font-semibold text-ink">Tipo de precificação</p>
        <div className="mt-2 flex rounded-xl border border-paper-soft bg-paper p-1">
          <button
            type="button"
            onClick={() => setPricingType("CUSTOM")}
            className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold transition ${
              pricingType === "CUSTOM"
                ? "bg-white shadow-sm text-ink"
                : "text-ink-muted hover:text-ink"
            }`}
          >
            Sob orçamento
          </button>
          <button
            type="button"
            onClick={() => setPricingType("FIXED")}
            className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold transition ${
              pricingType === "FIXED"
                ? "bg-white shadow-sm text-ink"
                : "text-ink-muted hover:text-ink"
            }`}
          >
            Preço fixo
          </button>
        </div>
        <p className="mt-1.5 text-xs text-ink-muted">
          {pricingType === "FIXED"
            ? "O preço é exibido publicamente e o cliente solicita diretamente."
            : "O cliente envia um pedido e você cria uma proposta com o valor."}
        </p>
      </div>

      <div className="grid gap-2">
        <label
          className="text-sm font-semibold text-ink"
          htmlFor={`name-${service?.id ?? "new"}`}
        >
          Nome do serviço
        </label>
        <input
          className="min-h-11 rounded-md border border-paper-soft bg-white px-3 text-sm outline-none focus:border-leaf"
          defaultValue={service?.name ?? ""}
          id={`name-${service?.id ?? "new"}`}
          name="name"
          required
          type="text"
        />
      </div>

      <div className="grid gap-2">
        <label
          className="text-sm font-semibold text-ink"
          htmlFor={`description-${service?.id ?? "new"}`}
        >
          Descrição <span className="font-normal text-ink-muted">(opcional)</span>
        </label>
        <textarea
          className="min-h-24 rounded-md border border-paper-soft bg-white px-3 py-3 text-sm outline-none focus:border-leaf"
          defaultValue={service?.description ?? ""}
          id={`description-${service?.id ?? "new"}`}
          name="description"
        />
      </div>

      <div className="grid gap-5 md:grid-cols-[1fr_auto] md:items-end">
        <div className="grid gap-2">
          <label
            className="text-sm font-semibold text-ink"
            htmlFor={`basePrice-${service?.id ?? "new"}`}
          >
            Preço
            {pricingType === "FIXED" ? (
              <span className="ml-1 text-red-500">*</span>
            ) : (
              <span className="ml-1 font-normal text-ink-muted">(opcional)</span>
            )}
          </label>
          <CurrencyInput
            className="min-h-11 rounded-md border border-paper-soft bg-white px-3 text-sm outline-none focus:border-leaf"
            defaultValue={service?.basePrice ?? ""}
            id={`basePrice-${service?.id ?? "new"}`}
            name="basePrice"
          />
          {pricingType === "FIXED" ? (
            <p className="text-xs text-ink-muted">
              Valor exibido publicamente na página do prestador.
            </p>
          ) : null}
        </div>

        <label className="flex min-h-11 items-center gap-3 text-sm font-semibold text-ink">
          <input
            className="h-4 w-4 accent-leaf"
            defaultChecked={service?.isActive ?? true}
            name="isActive"
            type="checkbox"
          />
          Ativo
        </label>
      </div>

      <button
        className="inline-flex min-h-11 w-full items-center justify-center rounded-md bg-leaf px-5 text-sm font-semibold text-white transition hover:bg-leaf-hover disabled:opacity-50 md:w-fit"
        disabled={isPending}
        type="submit"
      >
        {isPending ? "Salvando..." : service ? "Salvar serviço" : "Cadastrar serviço"}
      </button>
    </form>
  );
}
```

- [ ] **6.2 — Verificar build do componente**

```bash
npm run build 2>&1 | grep "services/ServiceForm" | head -5
```

Esperado: nenhum erro neste componente.

- [ ] **6.3 — Commit**

```bash
git add components/services/ServiceForm.tsx
git commit -m "feat(services): toggle FIXED/CUSTOM no formulário de serviço"
```

---

## Task 7 — ServiceList (dashboard)

**Files:**
- Modify: `components/services/ServiceList.tsx`

- [ ] **7.1 — Adicionar badge de tipo no card de serviço**

Substituir `components/services/ServiceList.tsx` por:

```tsx
import { toggleServiceStatus } from "@/lib/actions/services";
import { ServiceForm } from "@/components/services/ServiceForm";
import type { ServiceForClient } from "@/types/service";

type ServiceListProps = {
  services: ServiceForClient[];
};

const pricingTypeBadge: Record<"FIXED" | "CUSTOM", string> = {
  FIXED: "bg-mint text-leaf border border-mint",
  CUSTOM: "bg-paper-soft text-ink-muted border border-paper-soft"
};

const pricingTypeLabel: Record<"FIXED" | "CUSTOM", string> = {
  FIXED: "Preço fixo",
  CUSTOM: "Sob orçamento"
};

export function ServiceList({ services }: ServiceListProps) {
  if (services.length === 0) {
    return (
      <div className="rounded-lg border border-stone-200 bg-paper p-5">
        <p className="text-sm leading-6 text-stone-700">
          Nenhum serviço cadastrado ainda.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-5">
      {services.map((service) => (
        <article className="rounded-lg border border-stone-200 bg-paper p-5" key={service.id}>
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-lg font-bold text-ink">{service.name}</h3>
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${pricingTypeBadge[service.pricingType]}`}
              >
                {pricingTypeLabel[service.pricingType]}
              </span>
              <span className="text-xs text-ink-muted">
                {service.isActive ? "· Ativo" : "· Inativo"}
              </span>
            </div>
            <form action={toggleServiceStatus}>
              <input name="serviceId" type="hidden" value={service.id} />
              <input
                name="nextStatus"
                type="hidden"
                value={String(!service.isActive)}
              />
              <button
                className="inline-flex min-h-10 items-center justify-center rounded-md border border-stone-300 bg-white px-4 text-sm font-semibold text-ink transition hover:border-leaf hover:text-leaf"
                type="submit"
              >
                {service.isActive ? "Desativar" : "Ativar"}
              </button>
            </form>
          </div>

          <div className="mt-5">
            <ServiceForm service={service} />
          </div>
        </article>
      ))}
    </div>
  );
}
```

- [ ] **7.2 — Atualizar mapeamento em app/(dashboard)/dashboard/servicos/page.tsx**

Localizar o `profile.services.map` e adicionar `pricingType`:

```ts
services={profile.services.map((s) => ({
  id: s.id,
  name: s.name,
  description: s.description,
  basePrice: s.basePrice?.toString() ?? null,
  isActive: s.isActive,
  pricingType: s.pricingType
}))}
```

- [ ] **7.3 — Commit**

```bash
git add components/services/ServiceList.tsx app/(dashboard)/dashboard/servicos/page.tsx
git commit -m "feat(services): badge de tipo de precificação na lista de serviços"
```

---

## Task 8 — Página pública + PublicServicesGrid

**Files:**
- Modify: `app/u/[slug]/page.tsx`
- Modify: `components/public/PublicServicesGrid.tsx`

- [ ] **8.1 — Atualizar query em app/u/[slug]/page.tsx**

Na query `prisma.providerProfile.findUnique`, dentro de `services.select`, adicionar `pricingType`:

```ts
      services: {
        where: { isActive: true },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          description: true,
          basePrice: true,
          pricingType: true
        }
      }
```

O `profile.services.map` que passa para `PublicServicesGrid` já usa spread + basePrice serializado — verificar que continua correto. O map atual é:

```ts
services={profile.services.map((s) => ({
  ...s,
  basePrice: s.basePrice?.toString() ?? null
}))}
```

Com `pricingType` no select, o spread o inclui automaticamente. Não precisa alterar o map.

- [ ] **8.2 — Atualizar PublicServicesGrid**

Substituir `components/public/PublicServicesGrid.tsx` por:

```tsx
"use client";

import Link from "next/link";
import { motion } from "framer-motion";

import type { PublicService } from "@/types";

function formatMoney(value: string) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(Number(value));
}

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09 } }
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring" as const, stiffness: 280, damping: 28 }
  }
};

export function PublicServicesGrid({
  services,
  slug
}: {
  services: PublicService[];
  slug: string;
}) {
  if (services.length === 0) {
    return (
      <div className="mt-6 rounded-xl border border-paper-soft bg-white p-8 text-center shadow-card">
        <p className="text-sm text-ink-muted">
          Este prestador ainda não possui serviços publicados.
        </p>
      </div>
    );
  }

  return (
    <motion.div
      className="mt-6 grid gap-4 sm:grid-cols-2"
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.1 }}
      variants={container}
    >
      {services.map((service) => (
        <motion.article
          key={service.id}
          variants={item}
          className="group flex flex-col rounded-xl border border-paper-soft bg-white p-6 shadow-card transition-shadow hover:shadow-card-hover"
        >
          <h3 className="font-jakarta text-base font-bold text-ink">
            {service.name}
          </h3>
          {service.description ? (
            <p className="mt-2 flex-1 text-sm leading-6 text-ink-muted">
              {service.description}
            </p>
          ) : (
            <div className="flex-1" />
          )}
          {service.pricingType === "FIXED" && service.basePrice ? (
            <p className="mt-3 font-fraunces text-lg font-bold text-ink">
              {formatMoney(service.basePrice)}
            </p>
          ) : (
            <p className="mt-3 text-xs font-semibold uppercase tracking-widest text-ink-muted">
              Sob orçamento
            </p>
          )}
          <Link
            href={`/u/${slug}/orcamento?serviceId=${service.id}`}
            className="mt-4 inline-flex min-h-9 w-fit items-center justify-center rounded-md border border-paper-soft bg-paper px-4 text-xs font-semibold text-ink transition-colors group-hover:border-leaf group-hover:text-leaf"
          >
            {service.pricingType === "FIXED" ? "Solicitar serviço →" : "Pedir orçamento →"}
          </Link>
        </motion.article>
      ))}
    </motion.div>
  );
}
```

- [ ] **8.3 — Commit**

```bash
git add app/u/\[slug\]/page.tsx components/public/PublicServicesGrid.tsx
git commit -m "feat(public): exibe preço fixo vs 'Sob orçamento' e CTA correto por tipo de serviço"
```

---

## Task 9 — Formulário público de orçamento/solicitação

**Files:**
- Modify: `app/u/[slug]/orcamento/page.tsx`
- Modify: `components/quote-request/QuoteRequestForm.tsx`

- [ ] **9.1 — Atualizar query em app/u/[slug]/orcamento/page.tsx**

Adicionar `pricingType` e `basePrice` na query de serviços:

```ts
      services: {
        where: { isActive: true },
        orderBy: { name: "asc" },
        select: { id: true, name: true, pricingType: true, basePrice: true }
      }
```

Adicionar derivação do serviço selecionado e serializar `basePrice`:

```ts
  const selectedServiceId = profile.services.some(
    (service) => service.id === query.serviceId
  )
    ? query.serviceId
    : null;

  const selectedService = selectedServiceId
    ? profile.services.find((s) => s.id === selectedServiceId) ?? null
    : null;
```

Atualizar o `<QuoteRequestForm>` para receber `selectedService` (serializado):

```tsx
            <QuoteRequestForm
              selectedServiceId={selectedServiceId}
              selectedService={
                selectedService
                  ? {
                      id: selectedService.id,
                      name: selectedService.name,
                      pricingType: selectedService.pricingType,
                      basePrice: selectedService.basePrice?.toString() ?? null
                    }
                  : null
              }
              services={profile.services.map((s) => ({
                id: s.id,
                name: s.name,
                pricingType: s.pricingType,
                basePrice: s.basePrice?.toString() ?? null
              }))}
              slug={slug}
            />
```

- [ ] **9.2 — Atualizar QuoteRequestForm**

Substituir `components/quote-request/QuoteRequestForm.tsx` por:

```tsx
import { createQuoteRequest } from "@/lib/actions/quote-requests";
import { PhoneInput } from "@/components/ui/PhoneInput";
import type { ServiceSummary } from "@/types";

type SelectedService = {
  id: string;
  name: string;
  pricingType: "FIXED" | "CUSTOM";
  basePrice: string | null;
};

type QuoteRequestFormProps = {
  slug: string;
  services: ServiceSummary[];
  selectedServiceId?: string | null;
  selectedService?: SelectedService | null;
};

const inputClass =
  "min-h-11 w-full rounded-lg border border-paper-soft bg-white px-3 text-sm text-ink outline-none ring-offset-paper transition focus:border-leaf focus:ring-2 focus:ring-leaf/20";

const labelClass = "text-xs font-semibold uppercase tracking-widest text-ink-muted";

function formatMoney(value: string) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(Number(value));
}

export function QuoteRequestForm({
  slug,
  services,
  selectedServiceId,
  selectedService
}: QuoteRequestFormProps) {
  const action = createQuoteRequest.bind(null, slug);
  const isFixed = selectedService?.pricingType === "FIXED";

  return (
    <form action={action} className="mt-8 grid gap-5">
      {/* Resumo do serviço selecionado */}
      {selectedService ? (
        <div className="rounded-xl border border-paper-soft bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-ink-muted">
            Serviço selecionado
          </p>
          <p className="mt-1 font-fraunces text-lg font-bold text-ink">
            {selectedService.name}
          </p>
          {isFixed && selectedService.basePrice ? (
            <p className="mt-1 text-sm font-semibold text-leaf">
              {formatMoney(selectedService.basePrice)}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="grid gap-2">
        <label className={labelClass} htmlFor="customerName">
          Nome *
        </label>
        <input
          className={inputClass}
          id="customerName"
          name="customerName"
          placeholder="Seu nome completo"
          required
          type="text"
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="grid gap-2">
          <label className={labelClass} htmlFor="customerEmail">
            E-mail
          </label>
          <input
            className={inputClass}
            id="customerEmail"
            name="customerEmail"
            placeholder="seu@email.com"
            type="email"
          />
        </div>

        <div className="grid gap-2">
          <label className={labelClass} htmlFor="customerPhone">
            Telefone
          </label>
          <PhoneInput
            className={inputClass}
            id="customerPhone"
            name="customerPhone"
          />
        </div>
      </div>

      {services.length > 0 ? (
        <div className="grid gap-2">
          <label className={labelClass} htmlFor="serviceId">
            Serviço
          </label>
          <select
            className={inputClass}
            defaultValue={selectedServiceId ?? ""}
            id="serviceId"
            name="serviceId"
          >
            <option value="">Não sei informar / Outro</option>
            {services.map((service) => (
              <option key={service.id} value={service.id}>
                {service.name}
                {service.pricingType === "FIXED" && service.basePrice
                  ? ` — ${formatMoney(service.basePrice)}`
                  : ""}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      <div className="grid gap-2">
        <label className={labelClass} htmlFor="description">
          {isFixed
            ? "Observações adicionais"
            : "Descreva o que você precisa *"}
        </label>
        <textarea
          className="min-h-32 w-full rounded-lg border border-paper-soft bg-white px-3 py-3 text-sm text-ink outline-none ring-offset-paper transition focus:border-leaf focus:ring-2 focus:ring-leaf/20"
          id="description"
          name="description"
          placeholder={
            isFixed
              ? "Alguma observação sobre data, local ou preferências? (opcional)"
              : "Conte um pouco mais sobre o que você precisa, prazo, tamanho do projeto..."
          }
          required={!isFixed}
        />
      </div>

      <button
        className="inline-flex min-h-11 items-center justify-center rounded-md bg-leaf px-6 text-sm font-semibold text-white transition hover:bg-leaf-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber focus-visible:ring-offset-2"
        type="submit"
      >
        {isFixed ? "Solicitar serviço" : "Enviar pedido"}
      </button>
    </form>
  );
}
```

- [ ] **9.3 — Atualizar o header da página de orçamento para refletir o tipo**

Em `app/u/[slug]/orcamento/page.tsx`, atualizar o cabeçalho para usar linguagem contextual:

```tsx
        <div className="mt-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-leaf">
            {selectedService?.pricingType === "FIXED"
              ? "Solicitação de serviço"
              : "Pedido de orçamento"}
          </p>
          <h1 className="mt-2 font-fraunces text-4xl font-bold text-ink">
            {profile.businessName}
          </h1>
          <p className="mt-3 text-sm leading-6 text-ink-muted">
            {selectedService?.pricingType === "FIXED"
              ? "Preencha seus dados para confirmar a solicitação do serviço."
              : "Envie as informações iniciais para que o prestador avalie seu pedido."}
          </p>
        </div>
```

- [ ] **9.4 — Commit**

```bash
git add "app/u/[slug]/orcamento/page.tsx" components/quote-request/QuoteRequestForm.tsx
git commit -m "feat(public): adapta formulário de pedido para serviços FIXED vs CUSTOM"
```

---

## Task 10 — Painel de pedidos

**Files:**
- Modify: `app/(dashboard)/dashboard/pedidos/page.tsx`
- Modify: `components/quote-request/QuoteRequestList.tsx`
- Modify: `components/quote-request/QuoteRequestCard.tsx`

- [ ] **10.1 — Atualizar query em pedidos/page.tsx**

Na query `prisma.providerProfile.findUnique`, dentro de `quoteRequests.include.service.select`, adicionar `pricingType` e `basePrice`:

```ts
          service: {
            select: {
              id: true,
              name: true,
              pricingType: true,
              basePrice: true
            }
          },
```

- [ ] **10.2 — Atualizar serialização em QuoteRequestList.tsx**

Em `components/quote-request/QuoteRequestList.tsx`, atualizar a serialização para incluir `service.basePrice`:

```tsx
        const serialized: SerializedQuoteRequest = {
          ...quoteRequest,
          service: quoteRequest.service
            ? {
                ...quoteRequest.service,
                basePrice: quoteRequest.service.basePrice?.toString() ?? null
              }
            : null,
          proposal: quoteRequest.proposal
            ? {
                ...quoteRequest.proposal,
                depositAmount: quoteRequest.proposal.depositAmount?.toString() ?? null
              }
            : null
        };
```

- [ ] **10.3 — Atualizar tipos em QuoteRequestCard.tsx**

No topo de `components/quote-request/QuoteRequestCard.tsx`, atualizar o tipo do service serializado:

```ts
type SerializedService = {
  id: string;
  name: string;
  pricingType: "FIXED" | "CUSTOM";
  basePrice: string | null;
};

export type SerializedQuoteRequest = Omit<QuoteRequestWithRelations, "proposal" | "service"> & {
  service: SerializedService | null;
  proposal: SerializedProposal | null;
};
```

- [ ] **10.4 — Adicionar badge e adaptar CTA em QuoteRequestCard**

Localizar a seção que exibe serviceLabel no card colapsado e adicionar o badge de tipo logo após:

```tsx
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-fraunces text-base font-bold text-ink">
                {quoteRequest.customerName}
              </span>
              {serviceLabel ? (
                <span className="text-xs text-ink-muted">· {serviceLabel}</span>
              ) : null}
              {quoteRequest.service?.pricingType === "FIXED" ? (
                <span className="rounded-full bg-mint px-2.5 py-0.5 text-xs font-semibold text-leaf border border-mint">
                  Preço fixo
                  {quoteRequest.service.basePrice
                    ? ` · ${new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(quoteRequest.service.basePrice))}`
                    : ""}
                </span>
              ) : null}
            </div>
            <p className="mt-0.5 text-xs text-ink-muted">
              {formatDateShort(quoteRequest.createdAt)}
              {customerPhoneDisplay ? ` · ${customerPhoneDisplay}` : ""}
            </p>
          </div>
```

Localizar o bloco que exibe o CTA "Criar proposta" (quando não há proposta) e diferenciar por tipo:

```tsx
          ) : (
            <div className="mt-5 flex flex-wrap items-center gap-3">
              {quoteRequest.service?.pricingType !== "FIXED" ? (
                <Link
                  className="inline-flex min-h-10 items-center justify-center rounded-md bg-leaf px-5 text-sm font-semibold text-white transition hover:bg-leaf-hover"
                  href={`/dashboard/propostas/nova?requestId=${quoteRequest.id}`}
                >
                  Criar proposta
                </Link>
              ) : (
                <>
                  <p className="text-sm text-ink-muted">
                    Solicitação de serviço com preço fixo.
                  </p>
                  <Link
                    className="inline-flex min-h-10 items-center justify-center rounded-md border border-paper-soft bg-white px-5 text-sm font-semibold text-ink transition hover:border-leaf hover:text-leaf"
                    href={`/dashboard/propostas/nova?requestId=${quoteRequest.id}`}
                  >
                    Criar proposta mesmo assim
                  </Link>
                </>
              )}
            </div>
          )}
```

- [ ] **10.5 — Commit**

```bash
git add "app/(dashboard)/dashboard/pedidos/page.tsx" components/quote-request/QuoteRequestList.tsx components/quote-request/QuoteRequestCard.tsx
git commit -m "feat(pedidos): badge preço fixo e CTA diferenciado para pedidos FIXED vs CUSTOM"
```

---

## Task 11 — Atualização de docs

**Files:**
- Modify: `docs/DATABASE.md`
- Modify: `docs/AI_HANDOFF.md`

- [ ] **11.1 — Atualizar docs/DATABASE.md**

Na seção `### Service`, adicionar após a descrição de `isActive`:

```markdown
- `pricingType`: tipo de precificação (`FIXED` ou `CUSTOM`). Default `CUSTOM`. Controla se o serviço tem preço fixo exibido publicamente ou se está sob orçamento.
```

Na seção `## Enums`, adicionar:

```markdown
### ServicePricingType

- `FIXED`: serviço com preço fixo. `basePrice` é obrigatório e exibido publicamente.
- `CUSTOM`: serviço sob orçamento. `basePrice` é opcional.
```

Na seção `## Regras de negócio no banco`, adicionar:

```markdown
- Serviço com `pricingType = FIXED` deve ter `basePrice > 0` (validado em Zod, não constraint no banco).
- Serviços antigos sem `pricingType` explícito ficam como `CUSTOM` pelo default.
```

- [ ] **11.2 — Atualizar docs/AI_HANDOFF.md**

Na seção `## Restrições importantes`, adicionar:

```markdown
- Serviço com `pricingType = FIXED` exige `basePrice` válido e maior que zero.
- Não remover enum `ServicePricingType` nem campo `pricingType` de `Service`.
- Compatibilidade: serviços sem `pricingType` são tratados como `CUSTOM`.
```

Na seção `## Cuidados para não quebrar`, adicionar:

```markdown
- Tipo de serviço: `pricingType = FIXED` exige `basePrice`; validar no Zod, não no banco.
- Formulário público: linguagem de "solicitação" vs "orçamento" é definida no servidor via SSR com base no `?serviceId=`.
- Painel de pedidos: CTA "Criar proposta" é secundário para pedidos FIXED.
```

- [ ] **11.3 — Commit**

```bash
git add docs/DATABASE.md docs/AI_HANDOFF.md
git commit -m "docs: documenta ServicePricingType FIXED/CUSTOM no DATABASE.md e AI_HANDOFF.md"
```

---

## Task 12 — Validação final

- [ ] **12.1 — Lint**

```bash
npm run lint
```

Esperado: sem erros.

- [ ] **12.2 — Build**

```bash
npm run build
```

Esperado: build completo sem erros de tipo ou compilação.

- [ ] **12.3 — Prisma validate**

```bash
npx prisma validate
```

Esperado: schema válido.

- [ ] **12.4 — Testes**

```bash
npm test
```

Esperado: todos os testes passando (unit + actions).

- [ ] **12.5 — Replicar migration no banco de teste**

```bash
DATABASE_URL="postgresql://orcafacil:orcafacil@localhost:5432/orcafacil_test" npx prisma db push
```

Esperado: banco de teste atualizado.

- [ ] **12.6 — Testes de integração**

```bash
npm run test:integration
```

Esperado: todos os testes de integração passando.

---

## Critérios de aceite

- [ ] Prestador cria serviço FIXED com preço → pricingType salvo como FIXED
- [ ] Prestador tenta criar serviço FIXED sem preço → erro de validação no servidor
- [ ] Prestador cria serviço CUSTOM sem preço → pricingType salvo como CUSTOM
- [ ] Serviços existentes (sem pricingType) continuam como CUSTOM
- [ ] `/u/[slug]` mostra preço em BRL para FIXED, "Sob orçamento" para CUSTOM
- [ ] CTA no card é "Solicitar serviço" para FIXED, "Pedir orçamento" para CUSTOM
- [ ] Formulário público com `?serviceId=` de FIXED mostra linguagem de solicitação e description opcional
- [ ] Formulário público com `?serviceId=` de CUSTOM mantém linguagem de orçamento e description obrigatória
- [ ] Painel mostra badge "Preço fixo" + valor para pedidos com serviço FIXED
- [ ] Painel exibe "Criar proposta" como ação secundária para pedidos FIXED
- [ ] Painel mantém "Criar proposta" como ação primária para pedidos CUSTOM
- [ ] Propostas existentes não são afetadas
- [ ] `npm run lint` passa sem erros
- [ ] `npm run build` passa sem erros
- [ ] `npx prisma validate` passa
- [ ] `npm test` passa
