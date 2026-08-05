# Remover o prefixo /u das vitrines públicas — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A vitrine pública de um provider passa a viver em `vitriny.com/[slug]` em vez de `vitriny.com/u/[slug]`, sem redirect do formato antigo, e sem permitir que um usuário escolha um slug igual a uma rota do sistema.

**Architecture:** A pasta `app/u/[slug]` é movida para `app/[slug]` (Next.js já resolve segmentos estáticos como `/admin`, `/dashboard`, `/login` antes do dynamic segment, então não há ambiguidade de roteamento). Um novo módulo `lib/reserved-slugs.ts` centraliza a lista de slugs proibidos; `saveProviderProfile` passa a rejeitá-los com a mesma mensagem genérica já usada para slug duplicado. Todas as referências hardcoded a `/u/${slug}` no código e nos testes são atualizadas para `/${slug}`.

**Tech Stack:** Next.js (App Router, Server Actions), Prisma/PostgreSQL, Zod, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-08-05-remove-prefixo-u-design.md`

## Global Constraints

- Sem redirect de `/u/:slug` para `/:slug` — troca direta (definido no spec).
- Mensagem de erro para slug reservado é idêntica à de slug duplicado: `"Este endereço público já está em uso. Escolha outro."`
- A lista de reservados vive só em `lib/reserved-slugs.ts` — nenhum outro arquivo duplica essas strings.
- Não editar arquivos em `docs/superpowers/plans/**` ou `docs/superpowers/specs/**` além dos criados por este plano — são registro histórico.

---

## File Structure

- Create `lib/reserved-slugs.ts` — `RESERVED_SLUGS: ReadonlySet<string>` e `isReservedSlug(slug: string): boolean`.
- Create `tests/unit/reserved-slugs.test.ts` — testes do helper acima.
- Modify `lib/actions/provider-profile.ts` — chama `isReservedSlug` antes da checagem de unicidade no banco.
- Modify `tests/actions/provider-profile.test.ts` — novo teste cobrindo slug reservado.
- Move `app/u/[slug]/page.tsx` → `app/[slug]/page.tsx` (atualiza `/u/${slug}` → `/${slug}` internamente).
- Move `app/u/[slug]/orcamento/page.tsx` → `app/[slug]/orcamento/page.tsx` (idem).
- Move `app/u/[slug]/loading.tsx` → `app/[slug]/loading.tsx` (sem mudança de conteúdo).
- Modify `tests/e2e/public-profile.spec.ts` — caminhos `/u/...` → `/...`.
- Modify `lib/actions/quote-requests.ts` — 4 ocorrências de `/u/${slug}` → `/${slug}`.
- Modify `tests/actions/quote-requests.test.ts` — 6 ocorrências de asserção.
- Modify `app/(dashboard)/dashboard/page.tsx`, `app/sitemap.ts`, `components/onboarding/OnboardingChecklist.tsx`, `components/public/PublicServicesGrid.tsx`, `components/services/ServiceItem.tsx`, `components/auth/AuthVitrinePreview.tsx`, `components/landing/LandingFeatures.tsx`, `components/landing/LandingSteps.tsx`, `components/provider-profile/sections/IdentitySection.tsx`, `components/provider-profile/sections/StatusSection.tsx`, `lib/actions/brand-appearance.ts` (comentário) — trocam `/u/` por `/`.
- Modify `tests/unit/seo-sitemap.test.ts`, `tests/unit/seo-structured-data.test.ts`, `tests/unit/whatsapp-messages.test.ts`, `tests/unit/email.test.ts` — fixtures com `/u/` → `/`.
- Modify `proxy.ts` — chave/matcher de rate-limit do formulário de orçamento.

---

## Task 1: `lib/reserved-slugs.ts` (TDD)

**Files:**
- Create: `lib/reserved-slugs.ts`
- Test: `tests/unit/reserved-slugs.test.ts`

**Interfaces:**
- Produces: `RESERVED_SLUGS: ReadonlySet<string>`, `isReservedSlug(slug: string): boolean` — usados pela Task 2.

- [ ] **Step 1: Write the failing tests**

Create `tests/unit/reserved-slugs.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { isReservedSlug, RESERVED_SLUGS } from "@/lib/reserved-slugs";

describe("isReservedSlug", () => {
  it("rejeita rotas do sistema que já existem", () => {
    expect(isReservedSlug("admin")).toBe(true);
    expect(isReservedSlug("api")).toBe(true);
    expect(isReservedSlug("dashboard")).toBe(true);
    expect(isReservedSlug("login")).toBe(true);
    expect(isReservedSlug("cadastro")).toBe(true);
    expect(isReservedSlug("u")).toBe(true);
  });

  it("rejeita palavras institucionais reservadas para o futuro", () => {
    expect(isReservedSlug("sobre")).toBe(true);
    expect(isReservedSlug("precos")).toBe(true);
    expect(isReservedSlug("blog")).toBe(true);
  });

  it("rejeita palavras de infraestrutura", () => {
    expect(isReservedSlug("_next")).toBe(true);
    expect(isReservedSlug("webhook")).toBe(true);
  });

  it("é case-insensitive", () => {
    expect(isReservedSlug("ADMIN")).toBe(true);
    expect(isReservedSlug("Admin")).toBe(true);
  });

  it("aceita um slug de negócio normal", () => {
    expect(isReservedSlug("pinturas-silva")).toBe(false);
    expect(isReservedSlug("atelie-aurora")).toBe(false);
  });

  it("RESERVED_SLUGS só contém entradas em minúsculas", () => {
    for (const slug of RESERVED_SLUGS) {
      expect(slug).toBe(slug.toLowerCase());
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/reserved-slugs.test.ts`
Expected: FAIL — `Cannot find module '@/lib/reserved-slugs'`

- [ ] **Step 3: Write the implementation**

Create `lib/reserved-slugs.ts`:

```ts
// Slugs que um provider não pode escolher como endereço público
// (vitriny.com/[slug]). Três blocos:
//  1) rotas estáticas que já existem no app hoje;
//  2) nomes de infraestrutura/API/convenções do Next, mesmo sem rota hoje;
//  3) palavras institucionais com boa chance de virar página no futuro.
// Mantém só aqui — nenhum outro arquivo deve duplicar esta lista.
export const RESERVED_SLUGS: ReadonlySet<string> = new Set([
  // Rotas existentes
  "admin",
  "api",
  "dashboard",
  "login",
  "cadastro",
  "esqueci-senha",
  "redefinir-senha",
  "verificar-email",
  "verifique-seu-email",
  "privacidade",
  "termos",
  "proposta",
  "u",

  // Infra / API / convenções do Next
  "_next",
  "static",
  "assets",
  "webhook",
  "webhooks",
  "auth",
  "graphql",
  ".well-known",
  "robots.txt",
  "sitemap.xml",
  "favicon.ico",
  "manifest.json",

  // Palavras institucionais reservadas para páginas futuras
  "sobre",
  "contato",
  "precos",
  "planos",
  "blog",
  "ajuda",
  "suporte",
  "novidades",
  "faq",
  "carreiras",
  "parceiros",
  "afiliados",
  "app",
  "www",
  "home",
  "explorar",
  "busca",
  "categorias",
]);

export function isReservedSlug(slug: string): boolean {
  return RESERVED_SLUGS.has(slug.toLowerCase());
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/reserved-slugs.test.ts`
Expected: PASS (6 testes)

- [ ] **Step 5: Commit**

```bash
git add lib/reserved-slugs.ts tests/unit/reserved-slugs.test.ts
git commit -m "feat: adiciona lista de slugs reservados"
```

---

## Task 2: Rejeitar slug reservado em `saveProviderProfile`

**Files:**
- Modify: `lib/actions/provider-profile.ts:99-111`
- Test: `tests/actions/provider-profile.test.ts`

**Interfaces:**
- Consumes: `isReservedSlug(slug: string): boolean` da Task 1.

- [ ] **Step 1: Write the failing test**

In `tests/actions/provider-profile.test.ts`, add right after the "retorna erro de slug em uso quando outro usuário já tem o slug" test (after line 111, before "permite atualizar o próprio slug"):

```ts
  it("retorna erro quando o slug é uma palavra reservada", async () => {
    const form = makeFormData({
      businessName: "Pinturas Silva",
      slug: "admin",
      description: "",
      phone: "",
      email: "",
      city: "",
      state: "",
      isPublished: "on"
    });

    const { saveProviderProfile } = await import("@/lib/actions/provider-profile");
    const result = await saveProviderProfile(undefined, form);

    expect(result).toEqual(expect.objectContaining({ error: expect.stringContaining("em uso") }));
    expect(db.providerProfile.findUnique).not.toHaveBeenCalled();
    expect(db.providerProfile.upsert).not.toHaveBeenCalled();
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/actions/provider-profile.test.ts -t "palavra reservada"`
Expected: FAIL — `result.error` is `undefined` (a action segue até o upsert em vez de retornar cedo)

- [ ] **Step 3: Write the implementation**

In `lib/actions/provider-profile.ts`, add the import:

```ts
import { prisma } from "@/lib/prisma";
import { providerProfileSchema } from "@/lib/validations/provider-profile";
import { requireAuth } from "@/lib/actions/auth-guard";
import { sanitizeProfileLinks } from "@/lib/profile-links";
import { isReservedSlug } from "@/lib/reserved-slugs";
```

Then, right before the `existingSlug` lookup (`lib/actions/provider-profile.ts:100`), insert the reserved check so it short-circuits before hitting the database:

```ts
  if (isReservedSlug(parsed.data.slug)) {
    return {
      error: "Este endereço público já está em uso. Escolha outro.",
      values,
      submittedAt: Date.now()
    };
  }

  const existingSlug = await prisma.providerProfile.findUnique({
    where: { slug: parsed.data.slug },
    select: { userId: true }
  });
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/actions/provider-profile.test.ts`
Expected: PASS (todos os testes do arquivo, incluindo o novo)

- [ ] **Step 5: Commit**

```bash
git add lib/actions/provider-profile.ts tests/actions/provider-profile.test.ts
git commit -m "feat: rejeita slug reservado ao salvar perfil do provider"
```

---

## Task 3: Mover a rota `app/u/[slug]` → `app/[slug]`

**Files:**
- Move: `app/u/[slug]/page.tsx` → `app/[slug]/page.tsx`
- Move: `app/u/[slug]/orcamento/page.tsx` → `app/[slug]/orcamento/page.tsx`
- Move: `app/u/[slug]/loading.tsx` → `app/[slug]/loading.tsx`
- Modify: `tests/e2e/public-profile.spec.ts`

- [ ] **Step 1: Move the files with git mv**

```bash
mkdir -p "app/[slug]/orcamento"
git mv "app/u/[slug]/page.tsx" "app/[slug]/page.tsx"
git mv "app/u/[slug]/loading.tsx" "app/[slug]/loading.tsx"
git mv "app/u/[slug]/orcamento/page.tsx" "app/[slug]/orcamento/page.tsx"
rm -rf app/u
```

- [ ] **Step 2: Update internal references in `app/[slug]/page.tsx`**

Line 96 — metadata canonical URL:

```ts
  const url = `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/${slug}`;
```

Line 262 — JSON-LD canonical URL:

```ts
  const canonicalUrl = `${baseUrl}/${slug}`;
```

- [ ] **Step 3: Update internal references in `app/[slug]/orcamento/page.tsx`**

Line 132 (link "Voltar à vitrine" no topo):

```tsx
          href={`/${slug}`}
```

Line 217 (link "Voltar à vitrine" no bloco de sucesso):

```tsx
                    href={`/${slug}`}
```

Line 235 (link "Voltar à vitrine" no bloco de "nenhum item disponível"):

```tsx
                  href={`/${slug}`}
```

- [ ] **Step 4: Update the e2e test paths**

In `tests/e2e/public-profile.spec.ts`:

```ts
import { test, expect } from "@playwright/test";
import { E2E_PROVIDER_SLUG } from "./global-setup";

test.describe("Vitrine pública do negócio", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`/${E2E_PROVIDER_SLUG}`);
  });

  test("exibe nome do negócio", async ({ page }) => {
    await expect(page.locator("text=E2E Test Business")).toBeVisible();
  });

  test("exibe cidade e estado do negócio", async ({ page }) => {
    await expect(page.locator("text=São Paulo")).toBeVisible();
  });

  test("exibe itens ativos da vitrine", async ({ page }) => {
    await expect(page.locator("text=Pintura residencial")).toBeVisible();
    // Negócio de um tipo só não mostra badge Produto/Serviço (seria ruído — todo
    // item é igual); o sinal acionável do card é o CTA de venda.
    await expect(page.getByText("Solicitar orçamento").first()).toBeVisible();
  });

  test("exibe botão ou link para enviar solicitação", async ({ page }) => {
    const link = page.locator(`a[href*="/${E2E_PROVIDER_SLUG}/orcamento"]`);
    await expect(link.first()).toBeVisible();
  });

  test("oferece um link discreto para criar uma vitrine no Vitriny", async ({
    page,
  }) => {
    const creditLink = page.getByRole("link", {
      name: "Vitriny",
      exact: true,
    });

    await expect(creditLink).toBeVisible();
    await expect(creditLink).toHaveAttribute("href", "/");
  });

  test("retorna 404 para slug inexistente", async ({ page }) => {
    const response = await page.goto("/prestador-que-nao-existe-xyz123");
    expect(response?.status()).toBe(404);
  });
});
```

- [ ] **Step 5: Verify the app still type-checks and unit tests pass**

Run: `npx tsc --noEmit`
Expected: sem erros novos relacionados a `app/[slug]` ou `app/u`

Run: `npx vitest run`
Expected: falhas apenas nos arquivos que ainda citam `/u/` explicitamente (tratados nas próximas tasks) — nenhuma falha vinda de `app/[slug]`

- [ ] **Step 6: Commit**

```bash
git add app tests/e2e/public-profile.spec.ts
git commit -m "feat: move a vitrine pública de /u/[slug] para /[slug]"
```

---

## Task 4: Atualizar `lib/actions/quote-requests.ts` e seus testes

**Files:**
- Modify: `lib/actions/quote-requests.ts:78,102,158,192,203`
- Test: `tests/actions/quote-requests.test.ts:155,184,232,282,307,327`

- [ ] **Step 1: Update the test assertions first**

In `tests/actions/quote-requests.test.ts`, replace every occurrence of the string `"/u/vitriny/orcamento?success=1"` with `"/vitriny/orcamento?success=1"`. There are 6 occurrences, at lines 155, 184, 232, 282, 307 and 327 — each inside a `.rejects.toThrow(...)` call. Example of one (the pattern repeats identically at the other five sites):

```ts
    ).rejects.toThrow("/vitriny/orcamento?success=1");
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/actions/quote-requests.test.ts`
Expected: FAIL — actual thrown value is still `NEXT_REDIRECT;/u/vitriny/orcamento?success=1`, doesn't match the new expected string

- [ ] **Step 3: Update the implementation**

In `lib/actions/quote-requests.ts`, line 78:

```ts
    redirect(`/${slug}/orcamento?error=unavailable`);
```

Line 102:

```ts
      redirect(`/${slug}/orcamento?error=service`);
```

Lines 157-159:

```ts
    redirect(
      `/${slug}/orcamento?error=${PLAN_LIMIT_ERROR_CODES.monthlyQuoteRequests}`
    );
```

Line 192:

```ts
          profileUrl: appUrl(`/${slug}`)
```

Line 203:

```ts
  redirect(`/${slug}/orcamento?success=1`);
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/actions/quote-requests.test.ts`
Expected: PASS (todos os testes do arquivo)

- [ ] **Step 5: Commit**

```bash
git add lib/actions/quote-requests.ts tests/actions/quote-requests.test.ts
git commit -m "feat: atualiza redirects de pedido de orçamento para /[slug]"
```

---

## Task 5: Atualizar as demais referências a `/u/` em UI e testes de fixture

**Files:**
- Modify: `app/(dashboard)/dashboard/page.tsx:350`
- Modify: `app/sitemap.ts:50`
- Modify: `components/onboarding/OnboardingChecklist.tsx:86,237`
- Modify: `components/public/PublicServicesGrid.tsx:35,108`
- Modify: `components/services/ServiceItem.tsx:49`
- Modify: `components/auth/AuthVitrinePreview.tsx:21`
- Modify: `components/landing/LandingFeatures.tsx:25`
- Modify: `components/landing/LandingSteps.tsx:24`
- Modify: `components/provider-profile/sections/IdentitySection.tsx:57,78`
- Modify: `components/provider-profile/sections/StatusSection.tsx:45`
- Modify: `lib/actions/brand-appearance.ts:85`
- Modify: `tests/unit/seo-sitemap.test.ts:48-49`
- Modify: `tests/unit/seo-structured-data.test.ts:24,112`
- Modify: `tests/unit/whatsapp-messages.test.ts:6`
- Modify: `tests/unit/email.test.ts:186,193`

Nenhuma dessas mudanças altera comportamento testável de forma isolada além do que os testes de fixture abaixo já cobrem — são strings de exibição/link. Atualize teste e implementação juntos por arquivo.

- [ ] **Step 1: Update test fixtures**

In `tests/unit/seo-sitemap.test.ts`, lines 48-49:

```ts
    expect(urls).toContain("https://vitriny.example/com-itens");
    expect(urls).not.toContain("https://vitriny.example/vazia");
```

In `tests/unit/seo-structured-data.test.ts`, line 24:

```ts
    url: "https://vitriny.example/estudio-aurora",
```

And line 112:

```ts
      url: "https://vitriny.example/estudio-aurora",
```

In `tests/unit/whatsapp-messages.test.ts`, line 6:

```ts
  const url = "https://vitriny.app/doceria/orcamento?serviceId=abc";
```

In `tests/unit/email.test.ts`, line 186:

```ts
      profileUrl: "https://app.test/joao"
```

And line 193:

```ts
        html: expect.stringContaining("https://app.test/joao")
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/unit/seo-sitemap.test.ts tests/unit/seo-structured-data.test.ts tests/unit/whatsapp-messages.test.ts tests/unit/email.test.ts`
Expected: FAIL — implementação ainda produz `/u/...`

- [ ] **Step 3: Update `app/sitemap.ts`**

Line 50:

```ts
      url: `${baseUrl}/${profile.slug}`,
```

- [ ] **Step 4: Run the fixture tests again to verify they pass**

Run: `npx vitest run tests/unit/seo-sitemap.test.ts tests/unit/seo-structured-data.test.ts tests/unit/whatsapp-messages.test.ts tests/unit/email.test.ts`
Expected: PASS — `seo-structured-data.test.ts` e `whatsapp-messages.test.ts` já passavam porque testam funções puras que só formatam a URL recebida (a URL de teste em si é a fixture, já corrigida no Step 1); `email.test.ts` idem; `seo-sitemap.test.ts` passa porque `app/sitemap.ts` foi corrigido no Step 3.

- [ ] **Step 5: Update the remaining functional links (not covered by unit tests)**

In `app/(dashboard)/dashboard/page.tsx`, line 350:

```tsx
          url={`${process.env.NEXT_PUBLIC_APP_URL ?? ""}/${profile.slug}`}
```

In `components/onboarding/OnboardingChecklist.tsx`, line 86:

```ts
    const url = `${window.location.origin}/${slug}`;
```

And line 237:

```tsx
                          href={`/${slug}`}
```

In `components/public/PublicServicesGrid.tsx`, line 35:

```ts
  const href = `/${slug}/orcamento?serviceId=${service.id}`;
```

And line 108 (identical pattern, different function):

```ts
  const href = `/${slug}/orcamento?serviceId=${service.id}`;
```

In `components/services/ServiceItem.tsx`, line 49:

```ts
    ? `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/${slug}/orcamento?serviceId=${service.id}`
```

- [ ] **Step 6: Update display-only text**

In `components/auth/AuthVitrinePreview.tsx`, line 21:

```tsx
          vitriny.com/atelie-aurora
```

In `components/landing/LandingFeatures.tsx`, line 25:

```ts
    text: "Uma página profissional em vitriny.com/seu-nome, pronta para receber clientes.",
```

In `components/landing/LandingSteps.tsx`, line 24:

```tsx
          vitriny.com/
```

In `components/provider-profile/sections/IdentitySection.tsx`, line 57:

```tsx
                <span className="font-semibold text-ink">vitriny.com/{slug}</span>
```

And line 78 (o prefixo fixo ao lado do input do formulário):

```tsx
            vitriny.com/
```

In `components/provider-profile/sections/StatusSection.tsx`, line 45:

```tsx
            /{slug}
```

- [ ] **Step 7: Update the comment in `lib/actions/brand-appearance.ts`**

Line 85, inside the existing comment block:

```ts
    // refresh da rota atual a cada clique, e o React reaplicaria
    // data-brand-color/font do servidor por cima da aplicação otimista do
    // cliente — revertendo/piscando o tema durante trocas rápidas.
```

becomes (só a linha 85 muda, as outras do comentário ficam iguais):

```ts
    // Sem revalidatePath: todas as páginas que leem a aparência são
    // force-dynamic (dashboard layout, /[slug], orçamento, proposta), então
    // sempre renderizam fresco do banco. Chamar revalidatePath aqui forçaria um
```

(Essa é a linha 85 original — `// force-dynamic (dashboard layout, /u/[slug], orçamento, proposta), então` — só troca `/u/[slug]` por `/[slug]`.)

- [ ] **Step 8: Run the full unit suite**

Run: `npx vitest run`
Expected: PASS — nenhum arquivo de teste unitário deve mais conter a string `/u/`

Run: `grep -rn "/u/" app lib components --include="*.ts" --include="*.tsx"`
Expected: sem resultados (confirma que não sobrou nenhuma referência)

- [ ] **Step 9: Commit**

```bash
git add app components lib tests/unit
git commit -m "feat: atualiza links e textos restantes de /u/[slug] para /[slug]"
```

---

## Task 6: Atualizar o rate-limit do middleware (`proxy.ts`)

**Files:**
- Modify: `proxy.ts:32-33,59-71,110`

- [ ] **Step 1: Update the rate-limit rule key and matcher**

Line 32-33 — comentário e chave da regra:

```ts
  // Formulário público de pedido (Server Action em /[slug]/orcamento)
  "/orcamento": { limit: 20, windowMs: 60_000 },
```

Lines 59-71 — a função de matching precisa reconhecer o novo padrão de dois segmentos (`/[slug]/orcamento`) em vez do antigo com prefixo `/u/`:

```ts
function matchRateLimitRule(pathname: string, method: string): RateLimitRule | null {
  if (method !== "POST") return null;

  for (const [pattern, rule] of Object.entries(RATE_LIMIT_RULES)) {
    if (pattern === "/orcamento") {
      // Matches /[slug]/orcamento
      if (/^\/[^/]+\/orcamento/.test(pathname)) return rule;
      continue;
    }
    if (pathname === pattern || pathname.startsWith(pattern + "/")) return rule;
  }

  return null;
}
```

Line 110 — matcher do Next middleware:

```ts
    "/:slug/orcamento",
```

- [ ] **Step 2: Verify manually that unrelated static routes still match their own rules**

Run: `npx vitest run` (o middleware não tem teste unitário dedicado no projeto — a verificação é de leitura: confirme que `"/login"`, `"/cadastro"` etc. continuam batendo por igualdade exata antes do loop chegar no `"/orcamento"`, já que `Object.entries` preserva a ordem de inserção e essas chaves vêm antes na lista)

- [ ] **Step 3: Commit**

```bash
git add proxy.ts
git commit -m "feat: ajusta rate-limit do orçamento para o novo caminho /[slug]/orcamento"
```

---

## Task 7: Verificação final

**Files:** nenhum (só validação)

- [ ] **Step 1: Confirm no `/u/` references remain in source**

Run: `grep -rn "/u/" app lib components tests --include="*.ts" --include="*.tsx"`
Expected: sem resultados

- [ ] **Step 2: Run the full unit test suite**

Run: `npx vitest run`
Expected: PASS, todos os testes

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: sem erros

- [ ] **Step 4: Lint**

Run: `npm run lint`
Expected: sem erros

- [ ] **Step 5: Run the e2e public-profile spec**

Run: `npx playwright test tests/e2e/public-profile.spec.ts`
Expected: PASS (requer o setup normal de e2e do projeto — banco de teste com `E2E_PROVIDER_SLUG` seedado)

- [ ] **Step 6: Manual smoke check**

Rode `npm run dev`, abra `/<slug de um provider publicado localmente>` e confirme que a vitrine carrega, que "Ver orçamento" leva a `/<slug>/orcamento`, e que tentar salvar o perfil com slug `admin` no dashboard retorna o erro de "endereço já em uso".

- [ ] **Step 7: Final commit (if any cleanup was needed)**

```bash
git status
git add -A
git commit -m "chore: verificação final da remoção do prefixo /u" --allow-empty
```
