# Links customizados no perfil — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir que o dono do negócio adicione links livres (rótulo + URL) no perfil, além das redes sociais fixas, exibidos na vitrine pública. FREE em todos os planos, teto de 10.

**Architecture:** Coluna `links Json?` em `ProviderProfile` guarda um array `{label,url}`. Um helper puro (`lib/profile-links.ts`) normaliza/valida URLs (só http/https) e corta em 10. O formulário do perfil ganha uma lista dinâmica client-side (`ProfileLinksFields`), a server action valida pelo helper e persiste, e a vitrine pública renderiza os links com `rel="noopener noreferrer nofollow"`.

**Tech Stack:** Next.js (App Router, Server Actions), Prisma/PostgreSQL, React 19 (`useState`), Zod (perfil), Vitest.

**Spec:** `docs/superpowers/specs/2026-07-22-perfil-links-customizados-design.md`

---

## File structure

- Create `lib/profile-links.ts` — helper puro: tipos, `MAX_PROFILE_LINKS`, `normalizeLinkUrl`, `sanitizeProfileLinks`, `parseProfileLinks`.
- Create `tests/unit/profile-links.test.ts` — testes unitários do helper.
- Modify `prisma/schema.prisma` — adiciona `links Json?` em `ProviderProfile`.
- Modify `lib/actions/provider-profile.ts` — lê `linkLabel[]`/`linkUrl[]`, valida via helper, persiste; adiciona `links` a `ProviderProfileFormValues`.
- Create `components/provider-profile/ProfileLinksFields.tsx` — lista dinâmica client-side (rótulo + URL).
- Modify `components/provider-profile/sections/PresenceSection.tsx` — renderiza `ProfileLinksFields` abaixo das redes sociais.
- Modify `app/u/[slug]/page.tsx` — `select` inclui `links`; renderiza seção "Links".
- Modify docs: `PROJECT_OVERVIEW.md`, `DATABASE.md`, `ROADMAP.md`, `AI_HANDOFF.md`.

---

## Task 1: Helper `lib/profile-links.ts` (TDD)

**Files:**
- Create: `lib/profile-links.ts`
- Test: `tests/unit/profile-links.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/unit/profile-links.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import {
  MAX_PROFILE_LINKS,
  normalizeLinkUrl,
  parseProfileLinks,
  sanitizeProfileLinks,
} from "@/lib/profile-links";

describe("normalizeLinkUrl", () => {
  it("prefixa https:// quando falta esquema", () => {
    expect(normalizeLinkUrl("exemplo.com")).toBe("https://exemplo.com/");
  });

  it("mantém caminho e query", () => {
    expect(normalizeLinkUrl("exemplo.com/cardapio?x=1")).toBe(
      "https://exemplo.com/cardapio?x=1"
    );
  });

  it("aceita http:// e https:// explícitos", () => {
    expect(normalizeLinkUrl("http://exemplo.com")).toBe("http://exemplo.com/");
    expect(normalizeLinkUrl("https://exemplo.com/loja")).toBe(
      "https://exemplo.com/loja"
    );
  });

  it("rejeita esquemas perigosos", () => {
    expect(normalizeLinkUrl("javascript:alert(1)")).toBeNull();
    expect(normalizeLinkUrl("data:text/html;base64,PHM=")).toBeNull();
    expect(normalizeLinkUrl("mailto:a@b.com")).toBeNull();
  });

  it("rejeita string vazia", () => {
    expect(normalizeLinkUrl("   ")).toBeNull();
  });
});

describe("sanitizeProfileLinks", () => {
  it("descarta linhas totalmente vazias", () => {
    const result = sanitizeProfileLinks([
      { label: "", url: "" },
      { label: "Site", url: "exemplo.com" },
    ]);
    expect(result.errors).toEqual([]);
    expect(result.links).toEqual([
      { label: "Site", url: "https://exemplo.com/" },
    ]);
  });

  it("exige rótulo quando há URL", () => {
    const result = sanitizeProfileLinks([{ label: "", url: "exemplo.com" }]);
    expect(result.links).toEqual([]);
    expect(result.errors.length).toBe(1);
  });

  it("exige URL válida quando há rótulo", () => {
    const result = sanitizeProfileLinks([{ label: "Site", url: "" }]);
    expect(result.links).toEqual([]);
    expect(result.errors.length).toBe(1);
  });

  it("rejeita rótulo muito longo", () => {
    const result = sanitizeProfileLinks([
      { label: "x".repeat(41), url: "exemplo.com" },
    ]);
    expect(result.links).toEqual([]);
    expect(result.errors.length).toBe(1);
  });

  it("corta no máximo permitido", () => {
    const raw = Array.from({ length: MAX_PROFILE_LINKS + 3 }, (_, i) => ({
      label: `Link ${i}`,
      url: `exemplo${i}.com`,
    }));
    const result = sanitizeProfileLinks(raw);
    expect(result.links.length).toBe(MAX_PROFILE_LINKS);
  });
});

describe("parseProfileLinks", () => {
  it("lê um array JSON válido", () => {
    expect(
      parseProfileLinks([{ label: "Site", url: "https://exemplo.com/" }])
    ).toEqual([{ label: "Site", url: "https://exemplo.com/" }]);
  });

  it("retorna [] para null", () => {
    expect(parseProfileLinks(null)).toEqual([]);
  });

  it("ignora itens malformados", () => {
    expect(
      parseProfileLinks([{ label: "Site" }, 42, { label: "Ok", url: "https://x.com/" }])
    ).toEqual([{ label: "Ok", url: "https://x.com/" }]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/unit/profile-links.test.ts`
Expected: FAIL — `Cannot find module '@/lib/profile-links'`.

- [ ] **Step 3: Write the helper**

Create `lib/profile-links.ts`:

```ts
export type ProfileLink = { label: string; url: string };

export const MAX_PROFILE_LINKS = 10;
export const MAX_LINK_LABEL_LENGTH = 40;

// Normaliza a URL digitada: prefixa https:// quando falta esquema, valida com
// new URL() e aceita SOMENTE http/https (bloqueia javascript:, data:, etc.).
// Retorna a URL normalizada (url.href) ou null se for inválida.
export function normalizeLinkUrl(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  // Tem um esquema explícito ("algo:")? Se sim, respeita; senão, assume https.
  const hasScheme = /^[a-zA-Z][a-zA-Z\d+.-]*:/.test(trimmed);
  const candidate = hasScheme ? trimmed : `https://${trimmed}`;

  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    return null;
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  return url.href;
}

// Sanitiza a lista crua vinda do formulário: descarta linhas vazias, valida
// rótulo e URL, e corta em MAX_PROFILE_LINKS. Erros são mensagens por linha.
export function sanitizeProfileLinks(
  raw: Array<{ label: string; url: string }>
): { links: ProfileLink[]; errors: string[] } {
  const links: ProfileLink[] = [];
  const errors: string[] = [];

  for (const row of raw) {
    const label = row.label.trim();
    const rawUrl = row.url.trim();

    if (!label && !rawUrl) continue;

    if (label.length > MAX_LINK_LABEL_LENGTH) {
      errors.push(
        `Um dos rótulos é muito longo (máx. ${MAX_LINK_LABEL_LENGTH} caracteres).`
      );
      continue;
    }

    if (!label) {
      errors.push("Informe um rótulo para cada link.");
      continue;
    }

    const url = normalizeLinkUrl(rawUrl);
    if (!url) {
      errors.push(`O link "${label}" precisa de uma URL válida.`);
      continue;
    }

    links.push({ label, url });
  }

  return { links: links.slice(0, MAX_PROFILE_LINKS), errors };
}

// Lê defensivamente a coluna Json (unknown) do banco para ProfileLink[].
export function parseProfileLinks(value: unknown): ProfileLink[] {
  if (!Array.isArray(value)) return [];

  return value
    .flatMap((item) => {
      if (
        item &&
        typeof item === "object" &&
        typeof (item as { label?: unknown }).label === "string" &&
        typeof (item as { url?: unknown }).url === "string"
      ) {
        const link = item as ProfileLink;
        return [{ label: link.label, url: link.url }];
      }
      return [];
    })
    .slice(0, MAX_PROFILE_LINKS);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/unit/profile-links.test.ts`
Expected: PASS (all tests green).

- [ ] **Step 5: Commit**

```bash
git add lib/profile-links.ts tests/unit/profile-links.test.ts
git commit -m "feat: helper de links customizados do perfil"
```

---

## Task 2: Coluna `links` no schema

**Files:**
- Modify: `prisma/schema.prisma` (model `ProviderProfile`)

- [ ] **Step 1: Add the column**

No model `ProviderProfile`, logo após o campo `businessHours Json?`, adicione:

```prisma
  // Links livres do perfil: array JSON de { label, url }. Validado e cortado
  // em MAX_PROFILE_LINKS por lib/profile-links.ts na escrita e na leitura.
  links Json?
```

- [ ] **Step 2: Create and apply the migration**

Run: `npx prisma migrate dev --name add_provider_profile_links`
Expected: cria `prisma/migrations/<timestamp>_add_provider_profile_links/` e roda `prisma generate` (Postgres já está no `docker-compose`, porta 5432).

- [ ] **Step 3: Typecheck to confirm the client updated**

Run: `npx tsc --noEmit 2>&1 | grep -c "error TS" || true`
Expected: sem novos erros relacionados a `links` (o campo agora existe no client Prisma).

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat: coluna links (Json) em ProviderProfile"
```

---

## Task 3: Server action — validar e persistir os links

**Files:**
- Modify: `lib/actions/provider-profile.ts`

- [ ] **Step 1: Import the helper**

No topo do arquivo, junto dos outros imports:

```ts
import { sanitizeProfileLinks } from "@/lib/profile-links";
```

- [ ] **Step 2: Add `links` to the form values type**

Em `ProviderProfileFormValues` (o `type`), adicione o campo ao final:

```ts
  businessHours: string;
  links: { label: string; url: string }[];
```

- [ ] **Step 3: Read the link rows from the form**

Em `readProviderProfileFormValues`, antes do `return`, adicione:

```ts
  const linkLabels = formData.getAll("linkLabel");
  const linkUrls = formData.getAll("linkUrl");
  const links = linkLabels.map((label, index) => ({
    label: typeof label === "string" ? label : "",
    url: typeof linkUrls[index] === "string" ? (linkUrls[index] as string) : "",
  }));
```

E inclua `links` no objeto retornado (após `businessHours`):

```ts
    businessHours: formValue(formData, "businessHours"),
    links
  };
```

- [ ] **Step 4: Validate + persist in `saveProviderProfile`**

Em `saveProviderProfile`, logo após o bloco que checa `existingSlug` (antes de `const { businessHours, ...profileData } = parsed.data;`), adicione:

```ts
  const { links: sanitizedLinks, errors: linkErrors } = sanitizeProfileLinks(
    values.links
  );
  if (linkErrors.length > 0) {
    return { error: linkErrors[0], values, submittedAt: Date.now() };
  }
```

E em `dataToSave`, adicione a chave `links` (usa `Prisma.DbNull` quando vazio, como `businessHours`):

```ts
  const dataToSave = {
    ...profileData,
    businessHours: businessHours ?? Prisma.DbNull,
    links: sanitizedLinks.length > 0 ? sanitizedLinks : Prisma.DbNull,
    themePreset:
      currentProfile?.plan && canUseThemePresets(currentProfile.plan)
        ? parsed.data.themePreset
        : currentProfile?.themePreset ?? "DEFAULT"
  };
```

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit 2>&1 | grep -vE "^tests/" | grep -c "error TS"`
Expected: `0`.
Se aparecer erro de tipo em `links: sanitizedLinks` (Prisma Json), troque por `links: sanitizedLinks.length > 0 ? (sanitizedLinks as unknown as Prisma.InputJsonValue) : Prisma.DbNull`.

- [ ] **Step 6: Commit**

```bash
git add lib/actions/provider-profile.ts
git commit -m "feat: persiste links customizados ao salvar o perfil"
```

---

## Task 4: UI de edição — lista dinâmica de links

**Files:**
- Create: `components/provider-profile/ProfileLinksFields.tsx`
- Modify: `components/provider-profile/sections/PresenceSection.tsx`

- [ ] **Step 1: Create the dynamic list component**

Create `components/provider-profile/ProfileLinksFields.tsx`:

```tsx
"use client";

import { useState } from "react";

import { inputClass } from "@/components/provider-profile/profile-form-ui";
import { labelClass } from "@/components/ui/Field";
import { MAX_PROFILE_LINKS, type ProfileLink } from "@/lib/profile-links";

type Row = { key: string; label: string; url: string };

type ProfileLinksFieldsProps = {
  initialLinks?: ProfileLink[];
};

export function ProfileLinksFields({ initialLinks }: ProfileLinksFieldsProps) {
  const [rows, setRows] = useState<Row[]>(
    initialLinks && initialLinks.length > 0
      ? initialLinks.map((link, index) => ({
          key: `link-init-${index}`,
          label: link.label,
          url: link.url,
        }))
      : []
  );

  function updateRow(key: string, field: "label" | "url", value: string) {
    setRows((current) =>
      current.map((row) => (row.key === key ? { ...row, [field]: value } : row))
    );
  }

  function addRow() {
    setRows((current) =>
      current.length >= MAX_PROFILE_LINKS
        ? current
        : [
            ...current,
            { key: `link-${Date.now()}`, label: "", url: "" },
          ]
    );
  }

  function removeRow(key: string) {
    setRows((current) => current.filter((row) => row.key !== key));
  }

  return (
    <fieldset className="grid gap-3">
      <legend className={`${labelClass} mb-1`}>Outros links</legend>
      <p className="-mt-1 text-xs leading-5 text-ink-muted">
        Site, cardápio, WhatsApp, catálogo, canais… até {MAX_PROFILE_LINKS}.
        Todos opcionais.
      </p>

      {rows.map((row) => (
        <div
          className="grid gap-3 rounded-lg border border-paper-soft bg-white p-4 sm:grid-cols-[1fr_1.5fr_auto]"
          key={row.key}
        >
          <input
            className={inputClass}
            maxLength={40}
            name="linkLabel"
            onChange={(e) => updateRow(row.key, "label", e.target.value)}
            placeholder="Ex: Cardápio"
            type="text"
            value={row.label}
          />
          <input
            className={inputClass}
            inputMode="url"
            name="linkUrl"
            onChange={(e) => updateRow(row.key, "url", e.target.value)}
            placeholder="https://…"
            type="text"
            value={row.url}
          />
          <button
            className="inline-flex min-h-11 items-center justify-center rounded-md border border-red-200 bg-red-50 px-3 text-xs font-semibold text-red-700 transition hover:border-red-300"
            onClick={() => removeRow(row.key)}
            type="button"
          >
            Remover
          </button>
        </div>
      ))}

      {rows.length < MAX_PROFILE_LINKS ? (
        <button
          className="inline-flex min-h-9 w-fit items-center justify-center rounded-md border border-paper-soft bg-white px-4 text-xs font-semibold text-ink transition hover:border-leaf hover:text-leaf"
          onClick={addRow}
          type="button"
        >
          + Adicionar link
        </button>
      ) : null}
    </fieldset>
  );
}
```

- [ ] **Step 2: Render it inside `PresenceSection`**

Em `components/provider-profile/sections/PresenceSection.tsx`:

Adicione os imports:

```ts
import { ProfileLinksFields } from "@/components/provider-profile/ProfileLinksFields";
import { parseProfileLinks } from "@/lib/profile-links";
```

No começo do corpo do componente (antes do `return`), derive os links iniciais (valores digitados têm prioridade na repopulação após erro; senão lê do banco):

```ts
  const initialLinks = values?.links ?? parseProfileLinks(profile?.links);
```

E, dentro do `return`, logo após o `</div>` que fecha o grid das três redes sociais (Instagram/Facebook/TikTok) e antes do `<fieldset>` de "Horário de funcionamento", insira:

```tsx
      <ProfileLinksFields initialLinks={initialLinks} />
```

- [ ] **Step 3: Typecheck + lint**

Run: `npx tsc --noEmit 2>&1 | grep -vE "^tests/" | grep -c "error TS"`
Expected: `0`.
Run: `npx eslint components/provider-profile/ProfileLinksFields.tsx components/provider-profile/sections/PresenceSection.tsx`
Expected: sem erros.

- [ ] **Step 4: Commit**

```bash
git add components/provider-profile/ProfileLinksFields.tsx components/provider-profile/sections/PresenceSection.tsx
git commit -m "feat: edição de links customizados no perfil"
```

---

## Task 5: Exibição na vitrine pública

**Files:**
- Modify: `app/u/[slug]/page.tsx`

- [ ] **Step 1: Include `links` in the profile select**

No objeto `select` do `findFirst`/`findUnique` do perfil (onde estão `instagram: true`, `facebook: true`, `tiktok: true`, `businessHours: true`), adicione:

```ts
      links: true,
```

- [ ] **Step 2: Parse the links**

No topo do arquivo, adicione o import:

```ts
import { parseProfileLinks } from "@/lib/profile-links";
```

E, junto de onde `socialLinks` é montado (logo depois dele), adicione:

```ts
  const customLinks = parseProfileLinks(profile.links);
```

- [ ] **Step 3: Render the "Links" section**

Logo após a `<section>` de "Redes sociais" (o bloco `{socialLinks.length > 0 ? (...) : null}`) e antes da seção de "Contatos", insira:

```tsx
          {customLinks.length > 0 ? (
            <section className={socialLinks.length > 0 ? "mt-8" : ""}>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-leaf">
                Links
              </p>
              <div className="mt-3 grid gap-2 sm:flex sm:flex-wrap">
                {customLinks.map((link, index) => (
                  <a
                    className="inline-flex min-h-8 items-center justify-center rounded-full border border-paper-soft bg-white px-3 text-xs font-semibold text-ink-muted transition hover:border-leaf hover:text-leaf focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber focus-visible:ring-offset-2"
                    href={link.url}
                    key={`${link.url}-${index}`}
                    rel="noopener noreferrer nofollow"
                    target="_blank"
                  >
                    {link.label} ↗
                  </a>
                ))}
              </div>
            </section>
          ) : null}
```

- [ ] **Step 4: Fix the "Contatos" section top spacing**

Localize a `<section>` de "Contatos" cujo `className` é `socialLinks.length > 0 ? "mt-8" : ""` e troque a condição para considerar também os links customizados:

```tsx
            <section className={socialLinks.length > 0 || customLinks.length > 0 ? "mt-8" : ""}>
```

- [ ] **Step 5: Typecheck + lint**

Run: `npx tsc --noEmit 2>&1 | grep -vE "^tests/" | grep -c "error TS"`
Expected: `0`.
Run: `npx eslint "app/u/[slug]/page.tsx"`
Expected: sem erros.

- [ ] **Step 6: Commit**

```bash
git add "app/u/[slug]/page.tsx"
git commit -m "feat: exibe links customizados na vitrine pública"
```

---

## Task 6: Documentação

**Files:**
- Modify: `docs/PROJECT_OVERVIEW.md`, `docs/DATABASE.md`, `docs/ROADMAP.md`, `docs/AI_HANDOFF.md`

- [ ] **Step 1: PROJECT_OVERVIEW.md**

Na entidade `ProviderProfile` (seção "Entidades principais"), mencione o novo campo, e adicione uma linha em "Decisões de produto":

```markdown
- **Links customizados do perfil são FREE**: além de Instagram/Facebook/TikTok, o dono adiciona até 10 links livres (rótulo + URL) exibidos na vitrine pública. Recurso de identidade, disponível em todos os planos. URLs aceitam só `http`/`https`.
```

- [ ] **Step 2: DATABASE.md**

Na seção do model `ProviderProfile`, documente a coluna `links` (Json, array de `{label,url}`, máx. 10, validada por `lib/profile-links.ts`).

- [ ] **Step 3: ROADMAP.md**

Adicione em "Concluído":

```markdown
- Links customizados no perfil (até 10, FREE) exibidos na vitrine pública
```

- [ ] **Step 4: AI_HANDOFF.md**

Se houver lista de campos do perfil (ex.: onde cita `address`, `instagram`, `facebook`, `tiktok`, `businessHours`), inclua `links` com nota do limite (10) e da validação de esquema `http`/`https`.

- [ ] **Step 5: Commit**

```bash
git add docs/PROJECT_OVERVIEW.md docs/DATABASE.md docs/ROADMAP.md docs/AI_HANDOFF.md
git commit -m "docs: registra links customizados do perfil"
```

---

## Verificação final

- [ ] `npx vitest run tests/unit/profile-links.test.ts` — verde.
- [ ] `npx tsc --noEmit` — 0 erros fora de `tests/` pré-existentes.
- [ ] `npx eslint .` — sem novos erros nos arquivos tocados.
- [ ] Manual (dev server): em `/dashboard/perfil` → aba **Contato**, adicionar 2 links, salvar, reabrir e conferir persistência; abrir `/u/[slug]` e ver a seção **Links**; tentar salvar `javascript:alert(1)` e confirmar rejeição.

## Notas de teste

- O helper é o único com testes unitários (lógica pura). Action/UI/render seguem o padrão do repo (verificação por `tsc`/`eslint` + checagem manual), coerente com a seção "Testes" do spec.
- Não há teto por plano: 10 vale para FREE e PRO (identidade é FREE).
