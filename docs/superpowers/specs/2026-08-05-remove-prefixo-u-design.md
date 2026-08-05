# Design: remover o prefixo `/u` das vitrines públicas

**Data:** 2026-08-05
**Status:** aprovado, aguardando plano de implementação

## Contexto

Hoje toda vitrine pública vive em `/u/[slug]` (e `/u/[slug]/orcamento`), definida por
`app/u/[slug]/page.tsx`. Queremos que o link público de um provider seja
`vitriny.com/[slug]` diretamente, sem o segmento `/u`.

O produto ainda está em fase inicial: não há links reais compartilhados publicamente
que precisem continuar funcionando, então **não haverá redirect** de `/u/:slug` para
`/:slug` — é uma troca direta.

## Por que não há conflito de rota

O app tem hoje estas rotas estáticas na raiz: `admin`, `api`, `dashboard` (via route
group `(dashboard)`), `login`, `cadastro`, `esqueci-senha`, `redefinir-senha`,
`verificar-email`, `verifique-seu-email`, `privacidade`, `termos`, `proposta`, `u`.

O Next.js sempre resolve um segmento estático (`/admin`, `/dashboard`, ...) antes de
cair no dynamic segment `[slug]`, então mover `app/u/[slug]` para `app/[slug]` não
cria ambiguidade de roteamento. O único risco real é um usuário *escolher* um slug
igual a uma dessas rotas (ou a uma futura) — por isso a lista de reservados abaixo.

## 1. Mover a rota

```
app/u/[slug]/page.tsx           → app/[slug]/page.tsx
app/u/[slug]/orcamento/page.tsx → app/[slug]/orcamento/page.tsx
app/u/[slug]/loading.tsx        → app/[slug]/loading.tsx
```

A pasta `app/u/` é removida depois da migração. O conteúdo dos arquivos não muda
estruturalmente — só as referências internas a `/u/${slug}` (ver seção 3).

## 2. Lista de slugs reservados

Novo arquivo `lib/reserved-slugs.ts`, exportando um `Set<string>` (`RESERVED_SLUGS`)
com três blocos, todos em minúsculas:

**Rotas que já existem hoje:**
`admin`, `api`, `dashboard`, `login`, `cadastro`, `esqueci-senha`,
`redefinir-senha`, `verificar-email`, `verifique-seu-email`, `privacidade`,
`termos`, `proposta`, `u`

**Infra / API / convenções do Next (sem rota hoje, mas evita conflito ou confusão
futura):** `_next`, `static`, `assets`, `webhook`, `webhooks`, `auth`, `graphql`,
`.well-known`, `robots.txt`, `sitemap.xml`, `favicon.ico`, `manifest.json`

**Palavras institucionais prováveis de virar página no futuro:** `sobre`,
`contato`, `precos`, `planos`, `blog`, `ajuda`, `suporte`, `novidades`, `faq`,
`carreiras`, `parceiros`, `afiliados`, `app`, `www`, `home`, `explorar`, `busca`,
`categorias`

Exporta também um helper `isReservedSlug(slug: string): boolean`.

### Validação

A checagem entra em `saveProviderProfile` (`lib/actions/provider-profile.ts`),
logo antes da checagem de unicidade contra o banco (`existingSlug`). Quando o slug
enviado está em `RESERVED_SLUGS`, retorna o **mesmo** estado de erro já usado para
slug duplicado:

```ts
{ error: "Este endereço público já está em uso. Escolha outro.", values, submittedAt: Date.now() }
```

Não muda o zod schema (`lib/validations/provider-profile.ts`) — a checagem de
reservados fica só na server action, no mesmo lugar da checagem de unicidade,
mantendo os dois casos indistinguíveis para o usuário.

## 3. Atualizar referências a `/u/`

Trocar `/u/${slug}` → `/${slug}` (e variantes) nos seguintes arquivos:

**Rotas movidas (pós-migração):**
- `app/[slug]/page.tsx` — `url` (metadata) e `canonicalUrl` (JSON-LD)
- `app/[slug]/orcamento/page.tsx` — 3 links "voltar à vitrine"

**Server actions:**
- `lib/actions/quote-requests.ts` — 3 redirects de erro/sucesso + `profileUrl` usado
  no e-mail de notificação ao provider

**Outras páginas/rotas:**
- `app/(dashboard)/dashboard/page.tsx` — link exibido no dashboard
- `app/sitemap.ts` — geração das URLs do sitemap

**Componentes (links funcionais):**
- `components/onboarding/OnboardingChecklist.tsx` (link copiável + `href`)
- `components/public/PublicServicesGrid.tsx` (2 ocorrências, `href` do botão de item)
- `components/services/ServiceItem.tsx` (link de checkout)

**Componentes (texto de exibição, cosmético):**
- `components/auth/AuthVitrinePreview.tsx` — `vitriny.com/u/atelie-aurora` → `vitriny.com/atelie-aurora`
- `components/landing/LandingFeatures.tsx` — mesmo padrão
- `components/landing/LandingSteps.tsx` — `vitriny.com/u/` → `vitriny.com/`
- `components/provider-profile/sections/IdentitySection.tsx` — label `vitriny/u/{slug}`
  vira `vitriny.com/{slug}`; o prefixo fixo `/u/` ao lado do input do formulário
  vira `vitriny.com/`
- `components/provider-profile/sections/StatusSection.tsx` — `/u/{slug}` → `/{slug}`

**Comentário cosmético (não funcional):**
- `lib/actions/brand-appearance.ts` — comentário menciona `/u/[slug]`, atualizar para
  `/[slug]`

**Middleware (`proxy.ts`):**
- Chave de rate-limit `RATE_LIMIT_RULES["/u/orcamento"]` → `"/orcamento"` (nome da
  regra), com o matcher de path passando de `/^\/u\/[^/]+\/orcamento/` para
  `/^\/[^/]+\/orcamento/`
- `config.matcher`: `"/u/:slug/orcamento"` → `"/:slug/orcamento"`

## 4. Testes

Atualizar caminhos esperados (`/u/vitriny/orcamento` → `/vitriny/orcamento`, etc.) em:
- `tests/actions/quote-requests.test.ts`
- `tests/e2e/public-profile.spec.ts`
- `tests/unit/email.test.ts`
- `tests/unit/seo-sitemap.test.ts`
- `tests/unit/seo-structured-data.test.ts`
- `tests/unit/whatsapp-messages.test.ts`

Adicionar um teste novo (unitário, próximo aos testes existentes de
`saveProviderProfile`) cobrindo: tentar salvar um slug da lista de reservados
(ex.: `"admin"`) retorna o erro genérico de endereço em uso, sem gravar no banco.

## Fora de escopo

- **Redirect de `/u/:slug` antigo:** não há links externos reais publicados ainda,
  então a troca é direta, sem 301.
- **Docs históricos em `docs/superpowers/**`:** specs e planos já implementados que
  citam `/u/` não serão reescritos — são registro histórico, não documentação viva.
