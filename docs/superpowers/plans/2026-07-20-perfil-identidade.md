# Presença e Horários no Perfil — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar ao perfil do negócio endereço, redes sociais (Instagram/Facebook/TikTok) e horário de funcionamento por dia da semana, exibindo na vitrine pública badge "Aberto agora", card de horários, link "Ver no mapa" e ícones sociais — tudo opcional e FREE.

**Architecture:** Cinco campos novos em `ProviderProfile` (sem model novo; horários em coluna `Json` validada por Zod). Dois helpers puros no padrão de `lib/service-sale-mode.ts`: `lib/business-hours.ts` e `lib/social-links.ts`. Badge "Aberto agora" calculado no navegador (client component) para usar o fuso do visitante; o restante server-rendered.

**Tech Stack:** Next.js App Router, Prisma/PostgreSQL, Zod, Vitest, Tailwind.

**Spec:** `docs/superpowers/specs/2026-07-20-perfil-identidade-design.md`

**Branch:** `feat/perfil-identidade` (já criado a partir de `refactor/services-to-items`).

---

## Estrutura de arquivos

| Arquivo | Papel |
|---|---|
| `lib/business-hours.ts` (criar) | Tipos + parse defensivo + `isOpenAt` + labels de exibição |
| `lib/social-links.ts` (criar) | Normalização de @handle/URL por rede |
| `tests/unit/business-hours.test.ts` (criar) | Unit do helper de horários |
| `tests/unit/social-links.test.ts` (criar) | Unit da normalização de redes |
| `tests/unit/validations/provider-profile-identity.test.ts` (criar) | Zod dos campos novos |
| `prisma/schema.prisma` (modificar) | 5 campos novos em `ProviderProfile` |
| `lib/validations/provider-profile.ts` (modificar) | Schema Zod dos campos novos |
| `lib/actions/provider-profile.ts` (modificar) | Ler/persistir campos novos |
| `components/provider-profile/BusinessHoursEditor.tsx` (criar) | Editor de horários (client) |
| `components/provider-profile/ProfileForm.tsx` (modificar) | Seção "Presença e horários" |
| `components/public/OpenNowBadge.tsx` (criar) | Badge 🟢/🔴 client-side |
| `app/u/[slug]/page.tsx` (modificar) | Badge, card horários, Maps, redes |
| `docs/DATABASE.md`, `docs/PROJECT_OVERVIEW.md`, `docs/AI_HANDOFF.md`, `docs/MVP_FLOW.md` (modificar) | Documentação |

Convenções do repo que valem para todas as tarefas: dinheiro/decimais não são tocados aqui; commits pequenos; validação final `npm run lint && npm run build && npx prisma validate && npm test`.

---

### Task 1: Helper `lib/business-hours.ts` (TDD)

**Files:**
- Test: `tests/unit/business-hours.test.ts`
- Create: `lib/business-hours.ts`

Semântica: array fixo de 7 posições, índice 0 = domingo (compatível com `Date.getDay()`); `null` = dia fechado; `close < open` = fecha após a meia-noite (ex.: bar 18:00–02:00). Datas de referência nos testes: 2026-01-04 é domingo, 2026-01-05 é segunda, 2026-01-10 é sábado.

- [ ] **Step 1: Escrever os testes que falham**

```ts
// tests/unit/business-hours.test.ts
import { describe, expect, it } from "vitest";

import {
  DAY_LABELS,
  formatWeek,
  getTodayLabel,
  isOpenAt,
  parseBusinessHours,
  type BusinessHours,
  type DayHours,
} from "@/lib/business-hours";

const CLOSED_WEEK: DayHours[] = [null, null, null, null, null, null, null];

function week(overrides: Record<number, DayHours>): BusinessHours {
  const days = [...CLOSED_WEEK];
  for (const [index, value] of Object.entries(overrides)) {
    days[Number(index)] = value;
  }
  return days as BusinessHours;
}

// Segunda com horário comercial (1 = segunda-feira)
const commercialMonday = week({ 1: { open: "08:00", close: "18:00" } });
// Sábado virando a madrugada (6 = sábado)
const lateSaturday = week({ 6: { open: "18:00", close: "02:00" } });

describe("parseBusinessHours", () => {
  it("aceita semana válida", () => {
    expect(parseBusinessHours(commercialMonday)).toEqual(commercialMonday);
  });

  it("rejeita array com menos de 7 posições", () => {
    expect(parseBusinessHours([null, null, null])).toBeNull();
  });

  it("rejeita horário malformado", () => {
    expect(
      parseBusinessHours(week({ 1: { open: "25:00", close: "18:00" } }))
    ).toBeNull();
  });

  it("rejeita open igual a close (janela vazia)", () => {
    expect(
      parseBusinessHours(week({ 1: { open: "08:00", close: "08:00" } }))
    ).toBeNull();
  });

  it("retorna null para semana toda fechada", () => {
    expect(parseBusinessHours(CLOSED_WEEK)).toBeNull();
  });

  it("retorna null para valores não-array", () => {
    expect(parseBusinessHours(null)).toBeNull();
    expect(parseBusinessHours("seg a sex")).toBeNull();
    expect(parseBusinessHours({ monday: "08:00" })).toBeNull();
  });
});

describe("isOpenAt", () => {
  it("aberto dentro do horário do dia", () => {
    expect(isOpenAt(commercialMonday, new Date("2026-01-05T10:00:00"))).toBe(true);
  });

  it("fechado antes de abrir", () => {
    expect(isOpenAt(commercialMonday, new Date("2026-01-05T07:59:00"))).toBe(false);
  });

  it("fechado depois de fechar", () => {
    expect(isOpenAt(commercialMonday, new Date("2026-01-05T18:00:00"))).toBe(false);
  });

  it("fechado em dia sem horário", () => {
    expect(isOpenAt(commercialMonday, new Date("2026-01-04T10:00:00"))).toBe(false);
  });

  it("virada de meia-noite: aberto no fim do sábado", () => {
    expect(isOpenAt(lateSaturday, new Date("2026-01-10T23:30:00"))).toBe(true);
  });

  it("virada de meia-noite: ainda aberto na madrugada de domingo", () => {
    expect(isOpenAt(lateSaturday, new Date("2026-01-11T01:30:00"))).toBe(true);
  });

  it("virada de meia-noite: fechado após o close da madrugada", () => {
    expect(isOpenAt(lateSaturday, new Date("2026-01-11T02:30:00"))).toBe(false);
  });
});

describe("getTodayLabel", () => {
  it("aberto → informa o horário de fechar", () => {
    expect(getTodayLabel(commercialMonday, new Date("2026-01-05T10:00:00"))).toBe(
      "fecha às 18:00"
    );
  });

  it("antes de abrir → informa o horário de abrir", () => {
    expect(getTodayLabel(commercialMonday, new Date("2026-01-05T07:00:00"))).toBe(
      "abre às 08:00"
    );
  });

  it("dia fechado → fechado hoje", () => {
    expect(getTodayLabel(commercialMonday, new Date("2026-01-04T10:00:00"))).toBe(
      "fechado hoje"
    );
  });

  it("madrugada da virada → fecha às do dia anterior", () => {
    expect(getTodayLabel(lateSaturday, new Date("2026-01-11T01:00:00"))).toBe(
      "fecha às 02:00"
    );
  });
});

describe("formatWeek", () => {
  it("lista de segunda a domingo com labels", () => {
    const result = formatWeek(commercialMonday);
    expect(result).toHaveLength(7);
    expect(result[0]).toEqual({ day: "Seg", label: "08:00–18:00" });
    expect(result[6]).toEqual({ day: "Dom", label: "Fechado" });
  });
});

describe("DAY_LABELS", () => {
  it("índice 0 é domingo", () => {
    expect(DAY_LABELS[0]).toBe("Dom");
    expect(DAY_LABELS[6]).toBe("Sáb");
  });
});
```

- [ ] **Step 2: Rodar e confirmar RED**

Run: `npx vitest run tests/unit/business-hours.test.ts`
Expected: FAIL — `Cannot find module '@/lib/business-hours'` (ou equivalente).

- [ ] **Step 3: Implementar o helper**

```ts
// lib/business-hours.ts
// Horário de funcionamento do negócio. Array fixo de 7 posições,
// índice 0 = domingo (compatível com Date.getDay()); null = fechado.
// close < open significa fechamento após a meia-noite (ex.: 18:00–02:00).

export type DayHours = { open: string; close: string } | null;

export type BusinessHours = DayHours[];

export const DAY_LABELS = [
  "Dom",
  "Seg",
  "Ter",
  "Qua",
  "Qui",
  "Sex",
  "Sáb",
] as const;

const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

const WEEK_DISPLAY_ORDER = [1, 2, 3, 4, 5, 6, 0] as const;

function toMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

export function parseBusinessHours(value: unknown): BusinessHours | null {
  if (!Array.isArray(value) || value.length !== 7) return null;

  const days: BusinessHours = [];
  for (const entry of value) {
    if (entry === null) {
      days.push(null);
      continue;
    }
    if (typeof entry !== "object") return null;
    const { open, close } = entry as { open?: unknown; close?: unknown };
    if (typeof open !== "string" || typeof close !== "string") return null;
    if (!TIME_REGEX.test(open) || !TIME_REGEX.test(close)) return null;
    if (open === close) return null;
    days.push({ open, close });
  }

  return days.some((day) => day !== null) ? days : null;
}

export function isOpenAt(hours: BusinessHours, date: Date): boolean {
  const day = date.getDay();
  const minutes = date.getHours() * 60 + date.getMinutes();

  const today = hours[day];
  if (today) {
    const open = toMinutes(today.open);
    const close = toMinutes(today.close);
    if (close > open) {
      if (minutes >= open && minutes < close) return true;
    } else if (minutes >= open) {
      return true;
    }
  }

  const yesterday = hours[(day + 6) % 7];
  if (yesterday) {
    const open = toMinutes(yesterday.open);
    const close = toMinutes(yesterday.close);
    if (close < open && minutes < close) return true;
  }

  return false;
}

export function getTodayLabel(hours: BusinessHours, date: Date): string {
  const day = date.getDay();
  const minutes = date.getHours() * 60 + date.getMinutes();
  const today = hours[day];

  if (isOpenAt(hours, date)) {
    if (today && minutes >= toMinutes(today.open)) {
      return `fecha às ${today.close}`;
    }
    const yesterday = hours[(day + 6) % 7];
    if (yesterday) return `fecha às ${yesterday.close}`;
    return "";
  }

  if (today && minutes < toMinutes(today.open)) {
    return `abre às ${today.open}`;
  }

  return "fechado hoje";
}

export function formatWeek(
  hours: BusinessHours
): { day: string; label: string }[] {
  return WEEK_DISPLAY_ORDER.map((index) => {
    const entry = hours[index];
    return {
      day: DAY_LABELS[index],
      label: entry ? `${entry.open}–${entry.close}` : "Fechado",
    };
  });
}
```

- [ ] **Step 4: Rodar e confirmar GREEN**

Run: `npx vitest run tests/unit/business-hours.test.ts`
Expected: PASS (todos os testes).

- [ ] **Step 5: Commit**

```bash
git add lib/business-hours.ts tests/unit/business-hours.test.ts
git commit -m "feat(profile): helper puro de horário de funcionamento"
```

---

### Task 2: Helper `lib/social-links.ts` (TDD)

**Files:**
- Test: `tests/unit/social-links.test.ts`
- Create: `lib/social-links.ts`

O dono digita `@handle`, `handle` ou URL completa; persiste-se o digitado e normaliza-se na renderização/validação.

- [ ] **Step 1: Escrever os testes que falham**

```ts
// tests/unit/social-links.test.ts
import { describe, expect, it } from "vitest";

import { normalizeSocialUrl, SOCIAL_LABELS } from "@/lib/social-links";

describe("normalizeSocialUrl", () => {
  it("@handle no Instagram", () => {
    expect(normalizeSocialUrl("instagram", "@meunegocio")).toBe(
      "https://instagram.com/meunegocio"
    );
  });

  it("handle puro no Facebook", () => {
    expect(normalizeSocialUrl("facebook", "meunegocio")).toBe(
      "https://facebook.com/meunegocio"
    );
  });

  it("TikTok usa /@handle", () => {
    expect(normalizeSocialUrl("tiktok", "meunegocio")).toBe(
      "https://tiktok.com/@meunegocio"
    );
  });

  it("URL completa da rede certa é aceita", () => {
    expect(
      normalizeSocialUrl("instagram", "https://www.instagram.com/meunegocio")
    ).toBe("https://www.instagram.com/meunegocio");
  });

  it("URL de domínio errado é rejeitada", () => {
    expect(
      normalizeSocialUrl("instagram", "https://facebook.com/meunegocio")
    ).toBeNull();
  });

  it("handle com espaço é rejeitado", () => {
    expect(normalizeSocialUrl("instagram", "meu negocio")).toBeNull();
  });

  it("vazio e espaços retornam null", () => {
    expect(normalizeSocialUrl("instagram", "")).toBeNull();
    expect(normalizeSocialUrl("instagram", "   ")).toBeNull();
  });

  it("URL inválida é rejeitada", () => {
    expect(normalizeSocialUrl("instagram", "https://")).toBeNull();
  });
});

describe("SOCIAL_LABELS", () => {
  it("labels de exibição por rede", () => {
    expect(SOCIAL_LABELS.instagram).toBe("Instagram");
    expect(SOCIAL_LABELS.facebook).toBe("Facebook");
    expect(SOCIAL_LABELS.tiktok).toBe("TikTok");
  });
});
```

- [ ] **Step 2: Rodar e confirmar RED**

Run: `npx vitest run tests/unit/social-links.test.ts`
Expected: FAIL — módulo inexistente.

- [ ] **Step 3: Implementar o helper**

```ts
// lib/social-links.ts
// Normaliza o valor digitado pelo dono (@handle, handle ou URL completa)
// para a URL pública da rede. O valor digitado é o que persiste no banco.

export type SocialNetwork = "instagram" | "facebook" | "tiktok";

export const SOCIAL_LABELS: Record<SocialNetwork, string> = {
  instagram: "Instagram",
  facebook: "Facebook",
  tiktok: "TikTok",
};

const NETWORK_HOSTS: Record<SocialNetwork, string> = {
  instagram: "instagram.com",
  facebook: "facebook.com",
  tiktok: "tiktok.com",
};

const HANDLE_REGEX = /^[A-Za-z0-9._-]+$/;

export function normalizeSocialUrl(
  network: SocialNetwork,
  value: string
): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (/^https?:\/\//i.test(trimmed)) {
    let url: URL;
    try {
      url = new URL(trimmed);
    } catch {
      return null;
    }
    const host = url.hostname.replace(/^www\./, "");
    const expected = NETWORK_HOSTS[network];
    if (host !== expected && !host.endsWith(`.${expected}`)) return null;
    return url.toString();
  }

  const handle = trimmed.replace(/^@/, "");
  if (!HANDLE_REGEX.test(handle)) return null;

  if (network === "tiktok") return `https://tiktok.com/@${handle}`;
  return `https://${NETWORK_HOSTS[network]}/${handle}`;
}
```

- [ ] **Step 4: Rodar e confirmar GREEN**

Run: `npx vitest run tests/unit/social-links.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/social-links.ts tests/unit/social-links.test.ts
git commit -m "feat(profile): helper de normalização de links sociais"
```

---

### Task 3: Schema Prisma + migration

**Files:**
- Modify: `prisma/schema.prisma` (model `ProviderProfile`, após o campo `businessType`)

- [ ] **Step 1: Adicionar os campos ao model**

Em `prisma/schema.prisma`, dentro de `model ProviderProfile`, logo após a linha `businessType BusinessType @default(SERVICES)`:

```prisma
  address       String?
  instagram     String?
  facebook      String?
  tiktok        String?
  // Horário de funcionamento: array JSON de 7 posições (0 = domingo),
  // cada uma { open, close } em "HH:MM" ou null (fechado). Validado por Zod
  // na escrita e por parseBusinessHours na leitura.
  businessHours Json?
```

- [ ] **Step 2: Criar a migration e gerar o client**

Run:
```bash
npm run prisma:migrate -- --name add_profile_identity_fields
npm run prisma:generate
npx prisma validate
```
Expected: migration criada em `prisma/migrations/*_add_profile_identity_fields/`, client regenerado, schema válido.

- [ ] **Step 3: Replicar no banco de teste**

Run:
```bash
DATABASE_URL="postgresql://vitriny:vitriny@localhost:5432/orcafacil_test" npx prisma db push
```
Expected: schema aplicado sem erro (banco `orcafacil_test` deve existir; ver `docs/ARCHITECTURE.md`).

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat(profile): campos de endereço, redes sociais e horários no schema"
```

---

### Task 4: Validação Zod (TDD)

**Files:**
- Test: `tests/unit/validations/provider-profile-identity.test.ts`
- Modify: `lib/validations/provider-profile.ts`

O formulário envia `businessHours` como **string JSON** (hidden input); vazio = não cadastrado. O schema faz o parse e valida a estrutura de 7 dias.

- [ ] **Step 1: Escrever os testes que falham**

```ts
// tests/unit/validations/provider-profile-identity.test.ts
import { describe, expect, it } from "vitest";

import { providerProfileSchema } from "@/lib/validations/provider-profile";

// Espelha o shape produzido por readProviderProfileFormValues na action.
const baseInput = {
  businessName: "Estúdio Aurora",
  slug: "estudio-aurora",
  description: "",
  phone: "",
  email: "",
  city: "Fortaleza",
  state: "CE",
  isPublished: false,
  pixKey: "",
  pixKeyType: "",
  pixHolderName: "",
  pixCity: "",
  themePreset: "DEFAULT",
  businessType: "SERVICES",
  address: "",
  instagram: "",
  facebook: "",
  tiktok: "",
  businessHours: "",
};

const validWeek = JSON.stringify([
  null,
  { open: "08:00", close: "18:00" },
  { open: "08:00", close: "18:00" },
  { open: "08:00", close: "18:00" },
  { open: "08:00", close: "18:00" },
  { open: "08:00", close: "18:00" },
  null,
]);

describe("providerProfileSchema — identidade", () => {
  it("campos vazios viram null", () => {
    const parsed = providerProfileSchema.safeParse(baseInput);
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.address).toBeNull();
    expect(parsed.data.instagram).toBeNull();
    expect(parsed.data.businessHours).toBeNull();
  });

  it("aceita endereço e redes válidas", () => {
    const parsed = providerProfileSchema.safeParse({
      ...baseInput,
      address: "Rua das Flores, 123 — Centro",
      instagram: "@estudio.aurora",
      facebook: "https://facebook.com/estudioaurora",
      tiktok: "estudioaurora",
    });
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.address).toBe("Rua das Flores, 123 — Centro");
    expect(parsed.data.instagram).toBe("@estudio.aurora");
  });

  it("rejeita rede social não normalizável", () => {
    const parsed = providerProfileSchema.safeParse({
      ...baseInput,
      instagram: "meu negocio inválido",
    });
    expect(parsed.success).toBe(false);
  });

  it("aceita businessHours como JSON válido de 7 dias", () => {
    const parsed = providerProfileSchema.safeParse({
      ...baseInput,
      businessHours: validWeek,
    });
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.businessHours).toHaveLength(7);
    expect(parsed.data.businessHours?.[1]).toEqual({
      open: "08:00",
      close: "18:00",
    });
  });

  it("rejeita JSON inválido", () => {
    const parsed = providerProfileSchema.safeParse({
      ...baseInput,
      businessHours: "{oops",
    });
    expect(parsed.success).toBe(false);
  });

  it("rejeita semana com menos de 7 posições", () => {
    const parsed = providerProfileSchema.safeParse({
      ...baseInput,
      businessHours: JSON.stringify([null, null, null]),
    });
    expect(parsed.success).toBe(false);
  });

  it("rejeita horário fora do formato HH:MM", () => {
    const parsed = providerProfileSchema.safeParse({
      ...baseInput,
      businessHours: JSON.stringify([
        { open: "25:00", close: "18:00" },
        null,
        null,
        null,
        null,
        null,
        null,
      ]),
    });
    expect(parsed.success).toBe(false);
  });

  it("rejeita dia com open igual a close", () => {
    const parsed = providerProfileSchema.safeParse({
      ...baseInput,
      businessHours: JSON.stringify([
        { open: "08:00", close: "08:00" },
        null,
        null,
        null,
        null,
        null,
        null,
      ]),
    });
    expect(parsed.success).toBe(false);
  });
});
```

- [ ] **Step 2: Rodar e confirmar RED**

Run: `npx vitest run tests/unit/validations/provider-profile-identity.test.ts`
Expected: FAIL — os campos novos não existem no schema (erros de chave desconhecida ou `success === true` sem os campos).

- [ ] **Step 3: Estender o schema**

Em `lib/validations/provider-profile.ts`:

1. Adicionar import no topo:

```ts
import { normalizeSocialUrl, type SocialNetwork } from "@/lib/social-links";
```

2. Adicionar antes de `export const providerProfileSchema`:

```ts
const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

const dayHoursSchema = z
  .object({
    open: z.string().regex(TIME_REGEX, "Horário inválido."),
    close: z.string().regex(TIME_REGEX, "Horário inválido.")
  })
  .nullable()
  .refine(
    (day) => day === null || day.open !== day.close,
    "Horário de abrir e fechar não podem ser iguais."
  );

const businessHoursSchema = z.preprocess(
  (value) => {
    if (value == null || value === "") return null;
    if (typeof value !== "string") return value;
    try {
      return JSON.parse(value);
    } catch {
      // Valor não-JSON cai na união e falha com mensagem de horários inválidos.
      return value;
    }
  },
  z.union(
    [z.array(dayHoursSchema).length(7, "Horários incompletos."), z.null()],
    { error: "Horários inválidos." }
  )
);

const optionalSocial = (network: SocialNetwork) =>
  optionalText.pipe(
    z
      .string()
      .max(120, "Use no máximo 120 caracteres.")
      .nullable()
      .refine(
        (value) => value === null || normalizeSocialUrl(network, value) !== null,
        "Informe um @usuario ou link válido."
      )
  );
```

3. Dentro do `z.object({ ... })`, após `businessType: businessTypeSchema.default("SERVICES")`, adicionar:

```ts
    address: optionalText.pipe(
      z.string().max(160, "Use no máximo 160 caracteres.").nullable()
    ),
    instagram: optionalSocial("instagram"),
    facebook: optionalSocial("facebook"),
    tiktok: optionalSocial("tiktok"),
    businessHours: businessHoursSchema
```

- [ ] **Step 4: Rodar e confirmar GREEN (novos e existentes)**

Run:
```bash
npx vitest run tests/unit/validations/provider-profile-identity.test.ts
npx vitest run tests/unit/validations/provider-profile.test.ts
```
Expected: PASS nos dois arquivos (o segundo garante que o schema existente não regrediu).

- [ ] **Step 5: Commit**

```bash
git add lib/validations/provider-profile.ts tests/unit/validations/provider-profile-identity.test.ts
git commit -m "feat(profile): validação Zod de endereço, redes e horários"
```

---

### Task 5: Server Action

**Files:**
- Modify: `lib/actions/provider-profile.ts`

- [ ] **Step 1: Estender tipos e leitura do form**

Em `ProviderProfileFormValues`, adicionar após `businessType: BusinessType;`:

```ts
  address: string;
  instagram: string;
  facebook: string;
  tiktok: string;
  businessHours: string;
```

Em `readProviderProfileFormValues`, adicionar ao objeto retornado, após `businessType: ...`:

```ts
    address: formValue(formData, "address"),
    instagram: formValue(formData, "instagram"),
    facebook: formValue(formData, "facebook"),
    tiktok: formValue(formData, "tiktok"),
    businessHours: formValue(formData, "businessHours")
```

- [ ] **Step 2: Mapear `businessHours` para o Json do Prisma**

Coluna `Json?` do Prisma não aceita `null` puro no TypeScript — exige `Prisma.DbNull`. Em `saveProviderProfile`, substituir o bloco `const dataToSave = { ... }` por:

```ts
  const { businessHours, ...profileData } = parsed.data;

  const dataToSave = {
    ...profileData,
    businessHours: businessHours ?? Prisma.DbNull,
    themePreset:
      currentProfile?.plan === "PRO"
        ? parsed.data.themePreset
        : currentProfile?.themePreset ?? "DEFAULT"
  };
```

(`Prisma` já é importado no topo do arquivo.)

- [ ] **Step 3: Verificar que nada regrediu**

Run: `npx vitest run tests/actions/provider-profile.test.ts && npm run build`
Expected: testes existentes da action PASS; build sem erro de tipo.

- [ ] **Step 4: Commit**

```bash
git add lib/actions/provider-profile.ts
git commit -m "feat(profile): persiste endereço, redes sociais e horários"
```

---

### Task 6: Editor de horários + seção no formulário

**Files:**
- Create: `components/provider-profile/BusinessHoursEditor.tsx`
- Modify: `components/provider-profile/ProfileForm.tsx`

- [ ] **Step 1: Criar o editor (client component)**

```tsx
// components/provider-profile/BusinessHoursEditor.tsx
"use client";

import { useState } from "react";

import {
  DAY_LABELS,
  parseBusinessHours,
  type DayHours,
} from "@/lib/business-hours";

const WEEK_DISPLAY_ORDER = [1, 2, 3, 4, 5, 6, 0];
const EMPTY_WEEK: DayHours[] = [null, null, null, null, null, null, null];
const DEFAULT_DAY: NonNullable<DayHours> = { open: "08:00", close: "18:00" };

type BusinessHoursEditorProps = {
  // Aceita o Json vindo do banco (profile.businessHours) ou a string JSON
  // reenviada após erro de validação (values.businessHours).
  defaultValue: unknown;
};

function parseDefault(value: unknown): DayHours[] {
  if (typeof value === "string") {
    if (!value) return [...EMPTY_WEEK];
    try {
      return parseBusinessHours(JSON.parse(value)) ?? [...EMPTY_WEEK];
    } catch {
      return [...EMPTY_WEEK];
    }
  }
  return parseBusinessHours(value) ?? [...EMPTY_WEEK];
}

export function BusinessHoursEditor({ defaultValue }: BusinessHoursEditorProps) {
  const [days, setDays] = useState<DayHours[]>(() => parseDefault(defaultValue));

  const hasAnyDay = days.some((day) => day !== null);

  const setDay = (index: number, value: DayHours) => {
    setDays((prev) => prev.map((day, i) => (i === index ? value : day)));
  };

  const copyMondayToWeekdays = () => {
    setDays((prev) => {
      const monday = prev[1];
      return prev.map((day, i) =>
        i >= 2 && i <= 5 ? (monday ? { ...monday } : null) : day
      );
    });
  };

  return (
    <div className="grid gap-3 rounded-xl border border-paper-soft bg-paper p-5">
      <input name="businessHours" type="hidden" value={hasAnyDay ? JSON.stringify(days) : ""} />

      {WEEK_DISPLAY_ORDER.map((index) => {
        const day = days[index];
        return (
          <div className="flex flex-wrap items-center gap-3" key={index}>
            <span className="w-10 text-sm font-semibold text-ink">
              {DAY_LABELS[index]}
            </span>
            <label className="flex cursor-pointer items-center gap-2 text-xs text-ink-muted">
              <input
                checked={day !== null}
                onChange={(e) =>
                  setDay(index, e.target.checked ? { ...DEFAULT_DAY } : null)
                }
                type="checkbox"
              />
              Aberto
            </label>
            {day ? (
              <>
                <input
                  className="min-h-9 rounded-lg border border-paper-soft bg-white px-2 text-sm text-ink outline-none transition focus:border-leaf focus:ring-2 focus:ring-leaf/20"
                  onChange={(e) => setDay(index, { ...day, open: e.target.value })}
                  type="time"
                  value={day.open}
                />
                <span className="text-xs text-ink-muted">até</span>
                <input
                  className="min-h-9 rounded-lg border border-paper-soft bg-white px-2 text-sm text-ink outline-none transition focus:border-leaf focus:ring-2 focus:ring-leaf/20"
                  onChange={(e) => setDay(index, { ...day, close: e.target.value })}
                  type="time"
                  value={day.close}
                />
              </>
            ) : (
              <span className="text-xs text-ink-muted">Fechado</span>
            )}
          </div>
        );
      })}

      <button
        className="mt-1 w-fit text-xs font-semibold text-leaf transition hover:underline"
        onClick={copyMondayToWeekdays}
        type="button"
      >
        Copiar segunda para ter–sex
      </button>

      <p className="text-xs text-ink-muted">
        Para fechar depois da meia-noite (ex.: 18:00 até 02:00), informe o
        horário de fechar menor que o de abrir.
      </p>
    </div>
  );
}
```

- [ ] **Step 2: Adicionar a seção ao `ProfileForm`**

Em `components/provider-profile/ProfileForm.tsx`:

1. Import no topo, junto aos demais:

```tsx
import { BusinessHoursEditor } from "@/components/provider-profile/BusinessHoursEditor";
```

2. Dentro da seção **"Contato e localização"** (após o grid de cidade/estado, ainda dentro do `<div className="grid gap-5">` da seção), adicionar o campo endereço:

```tsx
        <div className="grid gap-2">
          <label className={labelClass} htmlFor="address">
            Endereço{" "}
            <span className="font-normal text-ink-muted">(opcional)</span>
          </label>
          <input
            className={inputClass}
            defaultValue={values?.address ?? profile?.address ?? ""}
            id="address"
            name="address"
            placeholder="Rua, número e bairro — vira link para o Google Maps"
            type="text"
          />
        </div>
```

3. Após o fechamento da seção "Contato e localização" (antes da seção "Aparência da página"), adicionar a nova seção:

```tsx
      {/* ── Presença e horários ────────────────────── */}
      <SectionHeader
        label="Presença e horários"
        description="Redes sociais e horário de funcionamento exibidos na sua vitrine. Todos opcionais."
      />

      <div className="grid gap-5">
        <div className="grid gap-5 sm:grid-cols-3">
          <div className="grid gap-2">
            <label className={labelClass} htmlFor="instagram">
              Instagram
            </label>
            <input
              className={inputClass}
              defaultValue={values?.instagram ?? profile?.instagram ?? ""}
              id="instagram"
              name="instagram"
              placeholder="@seunegocio"
              type="text"
            />
          </div>

          <div className="grid gap-2">
            <label className={labelClass} htmlFor="facebook">
              Facebook
            </label>
            <input
              className={inputClass}
              defaultValue={values?.facebook ?? profile?.facebook ?? ""}
              id="facebook"
              name="facebook"
              placeholder="@seunegocio"
              type="text"
            />
          </div>

          <div className="grid gap-2">
            <label className={labelClass} htmlFor="tiktok">
              TikTok
            </label>
            <input
              className={inputClass}
              defaultValue={values?.tiktok ?? profile?.tiktok ?? ""}
              id="tiktok"
              name="tiktok"
              placeholder="@seunegocio"
              type="text"
            />
          </div>
        </div>

        <div className="grid gap-2">
          <p className={labelClass}>Horário de funcionamento</p>
          <BusinessHoursEditor
            defaultValue={values?.businessHours ?? profile?.businessHours ?? null}
          />
        </div>
      </div>
```

- [ ] **Step 3: Verificar build e lint**

Run: `npm run lint && npm run build`
Expected: sem erros.

- [ ] **Step 4: Teste manual rápido**

Com `npm run dev` rodando: abrir `/dashboard/perfil`, preencher endereço, `@teste` no Instagram, marcar seg–sex 08:00–18:00 via "Copiar segunda para ter–sex", salvar. Reabrir a página e confirmar que os valores voltam preenchidos. Testar também: salvar com Instagram `texto inválido!` e confirmar a mensagem de erro genérica com valores preservados.

- [ ] **Step 5: Commit**

```bash
git add components/provider-profile/BusinessHoursEditor.tsx components/provider-profile/ProfileForm.tsx
git commit -m "feat(profile): seção de presença e horários no formulário"
```

---

### Task 7: Vitrine pública — badge, horários, Maps e redes

**Files:**
- Create: `components/public/OpenNowBadge.tsx`
- Modify: `app/u/[slug]/page.tsx`

- [ ] **Step 1: Criar o badge client-side**

Calculado no navegador porque o visitante quase sempre está no mesmo fuso do negócio; evita cache de HTML com estado errado. Renderiza `null` no servidor e no primeiro paint (sem hydration mismatch); sem JS o badge simplesmente não aparece.

```tsx
// components/public/OpenNowBadge.tsx
"use client";

import { useEffect, useState } from "react";

import {
  getTodayLabel,
  isOpenAt,
  parseBusinessHours,
} from "@/lib/business-hours";

export function OpenNowBadge({ businessHours }: { businessHours: unknown }) {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
  }, []);

  const hours = parseBusinessHours(businessHours);
  if (!now || !hours) return null;

  const open = isOpenAt(hours, now);
  const label = getTodayLabel(hours, now);

  return (
    <span className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3 py-1 text-xs font-semibold text-white">
      <span
        className={`h-2 w-2 rounded-full ${open ? "bg-emerald-400" : "bg-red-400"}`}
      />
      {open ? "Aberto agora" : "Fechado"}
      {label ? <span className="font-normal text-white/70">· {label}</span> : null}
    </span>
  );
}
```

- [ ] **Step 2: Atualizar a query e os dados derivados da página**

Em `app/u/[slug]/page.tsx`:

1. Imports novos no topo:

```tsx
import { OpenNowBadge } from "@/components/public/OpenNowBadge";
import { formatWeek, parseBusinessHours } from "@/lib/business-hours";
import { normalizeSocialUrl, SOCIAL_LABELS } from "@/lib/social-links";
```

2. No `select` de `getProfile`, após `state: true,`:

```ts
      address: true,
      instagram: true,
      facebook: true,
      tiktok: true,
      businessHours: true,
```

3. No corpo do componente, após `const location = ...`:

```tsx
  const hours = parseBusinessHours(profile.businessHours);

  const mapsQuery = [profile.address, profile.city, profile.state]
    .filter(Boolean)
    .join(", ");
  const mapsUrl = mapsQuery
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapsQuery)}`
    : null;

  const socialLinks = (
    [
      ["instagram", profile.instagram],
      ["facebook", profile.facebook],
      ["tiktok", profile.tiktok],
    ] as const
  ).flatMap(([network, value]) => {
    if (!value) return [];
    const href = normalizeSocialUrl(network, value);
    return href ? [{ network, label: SOCIAL_LABELS[network], href }] : [];
  });
```

4. No array `contacts`, trocar a entrada de localização para usar o link do Maps (o renderizador existente já transforma `href` em `<a>`):

```tsx
    location
      ? {
          label: "Localização",
          value: mapsUrl ? `${location} · Ver no mapa` : location,
          href: mapsUrl,
          whatsappHref: null,
        }
      : null,
```

- [ ] **Step 3: Renderizar badge e redes no hero**

Dentro do hero, logo após o `<h1>` (antes do parágrafo de descrição), adicionar:

```tsx
          <OpenNowBadge businessHours={profile.businessHours} />
```

E após o parágrafo de descrição (`{profile.description ? ... : null}`):

```tsx
          {socialLinks.length > 0 ? (
            <div className="mt-5 flex flex-wrap gap-2">
              {socialLinks.map((link) => (
                <a
                  className="rounded-full border border-white/30 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-white/10"
                  href={link.href}
                  key={link.network}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  {link.label}
                </a>
              ))}
            </div>
          ) : null}
```

- [ ] **Step 4: Card de horários**

Logo após o bloco dos contact cards (`{contacts.length > 0 ? (...) : null}`), adicionar:

```tsx
          {hours ? (
            <div className="mt-3 rounded-xl border border-paper-soft bg-white p-4 shadow-card">
              <p className="text-xs font-semibold uppercase tracking-widest text-ink-muted">
                Horário de funcionamento
              </p>
              <dl className="mt-3 grid gap-1.5 sm:grid-cols-2 sm:gap-x-10">
                {formatWeek(hours).map((entry) => (
                  <div
                    className="flex items-baseline justify-between gap-4 text-sm"
                    key={entry.day}
                  >
                    <dt className="text-ink-muted">{entry.day}</dt>
                    <dd className="font-semibold text-ink">{entry.label}</dd>
                  </div>
                ))}
              </dl>
            </div>
          ) : null}
```

- [ ] **Step 5: Verificar build e teste manual**

Run: `npm run lint && npm run build`
Expected: sem erros.

Manual com `npm run dev`: abrir `/u/[slug]` de um perfil com os dados da Task 6 preenchidos e confirmar: badge aparece com estado coerente com o relógio local; card de horários lista Seg→Dom; "Ver no mapa" abre o Google Maps com o endereço; links sociais abrem em aba nova. Depois limpar os campos no perfil e confirmar que nada disso é renderizado.

- [ ] **Step 6: Commit**

```bash
git add components/public/OpenNowBadge.tsx "app/u/[slug]/page.tsx"
git commit -m "feat(public): badge aberto agora, horários, mapa e redes na vitrine"
```

---

### Task 8: Documentação + validação final

**Files:**
- Modify: `docs/DATABASE.md`, `docs/PROJECT_OVERVIEW.md`, `docs/AI_HANDOFF.md`, `docs/MVP_FLOW.md`

- [ ] **Step 1: `docs/DATABASE.md`**

Na seção `### ProviderProfile`, adicionar à lista de "Campos importantes":

```markdown
- `address`: endereço livre (rua, número, bairro) usado no link "Ver no mapa" da vitrine pública. Opcional.
- `instagram`, `facebook`, `tiktok`: valor digitado pelo dono (@handle, handle ou URL); normalizado para URL na renderização por `lib/social-links.ts`. Opcionais.
- `businessHours`: `Json?` — array de 7 posições (índice 0 = domingo), cada uma `{ open, close }` em `"HH:MM"` ou `null` (fechado). `close < open` significa fechamento após a meia-noite. Validado por Zod na escrita e `parseBusinessHours` na leitura. Opcional.
```

- [ ] **Step 2: `docs/PROJECT_OVERVIEW.md`**

Na seção "Decisões de produto", adicionar:

```markdown
- **Recursos de identidade são FREE**: endereço, redes sociais e horário de funcionamento com badge "Aberto agora" ficam disponíveis em todos os planos. Identidade do negócio não é gatilho de upgrade; os limites PRO continuam nos recursos que o dono sente (itens, propostas, fotos, temas).
```

- [ ] **Step 3: `docs/AI_HANDOFF.md`**

Na seção "Mudanças recentes", adicionar ao topo da lista de mudanças técnicas:

```markdown
- o perfil ganhou `address`, `instagram`, `facebook`, `tiktok` e `businessHours` (Json de 7 dias, índice 0 = domingo); helpers puros em `lib/business-hours.ts` e `lib/social-links.ts`; a vitrine pública exibe badge "Aberto agora" (calculado no navegador via `components/public/OpenNowBadge.tsx`), card de horários, link "Ver no mapa" e links sociais — tudo opcional e FREE;
```

- [ ] **Step 4: `docs/MVP_FLOW.md`**

Na seção "### 2. Perfil", após a linha que começa com "Preencha `businessName`...", adicionar:

```markdown
- Opcionalmente, preencha endereço, redes sociais (@usuario ou link) e o horário de funcionamento por dia da semana.
- Esperado na vitrine pública: badge "Aberto agora"/"Fechado" coerente com o relógio local, card com os horários da semana, localização com link "Ver no mapa" e links sociais. Campos não preenchidos não aparecem.
```

- [ ] **Step 5: Validação final completa**

Run:
```bash
npm run lint
npm run build
npx prisma validate
npm test
```
Expected: tudo PASS, sem warnings novos de lint.

- [ ] **Step 6: Commit**

```bash
git add docs/DATABASE.md docs/PROJECT_OVERVIEW.md docs/AI_HANDOFF.md docs/MVP_FLOW.md
git commit -m "docs: registra campos de presença e horários do perfil"
```
