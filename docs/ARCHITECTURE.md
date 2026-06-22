# Architecture

## Arquitetura técnica

OrçaFácil usa Next.js App Router com Server Components, Server Actions, Prisma e PostgreSQL.

Fluxo simplificado:

```text
Browser
  -> Next.js App Router
  -> Server Components / Server Actions
  -> Zod validation
  -> Prisma Client
  -> PostgreSQL
```

## Estrutura de pastas

```text
app/
components/
lib/
prisma/
docs/
```

## Responsabilidades

- `app/`: rotas, páginas e route handlers.
- `components/`: componentes reutilizáveis de UI/formulários.
- `lib/actions/`: Server Actions.
- `lib/validations/`: schemas Zod.
- `lib/prisma.ts`: instância do Prisma Client.
- `prisma/schema.prisma`: modelo de dados.
- `docs/`: documentação técnica e de produto.

## App Router

Rotas públicas:

- `app/page.tsx`
- `app/u/[slug]/page.tsx`
- `app/u/[slug]/orcamento/page.tsx`
- `app/proposta/[publicToken]/page.tsx`

Rotas autenticadas:

- `app/(dashboard)/dashboard/page.tsx`
- `app/(dashboard)/dashboard/perfil/page.tsx`
- `app/(dashboard)/dashboard/servicos/page.tsx`
- `app/(dashboard)/dashboard/pedidos/page.tsx`
- `app/(dashboard)/dashboard/propostas/nova/page.tsx`

Auth:

- `app/api/auth/[...nextauth]/route.ts`
- `auth.ts`
- `proxy.ts`

## Server Components

As páginas são majoritariamente Server Components. Elas fazem leitura direta com Prisma no servidor e renderizam HTML inicial.

Exemplos:

- `app/(dashboard)/dashboard/page.tsx`
- `app/u/[slug]/page.tsx`
- `app/proposta/[publicToken]/page.tsx`

## Server Actions

Server Actions ficam em `lib/actions/`:

- `provider-profile.ts`
- `services.ts`
- `quote-requests.ts`
- `quote-request-status.ts`
- `proposals.ts`
- `proposal-response.ts`

Elas validam sessão quando necessário e aplicam regras de ownership.

## Route Handlers

O único route handler explícito é Auth.js:

- `app/api/auth/[...nextauth]/route.ts`

## Auth.js / NextAuth

Configuração central:

- `auth.ts`

Provider:

- GitHub OAuth.

Adapter:

- `PrismaAdapter(prisma)`.

Proteção:

- `proxy.ts` protege `/dashboard/:path*`.
- Páginas autenticadas também checam `auth()` e redirecionam para `/login`.

## Prisma e PostgreSQL

O Prisma Client é criado em `lib/prisma.ts` com cache em desenvolvimento para evitar múltiplas instâncias.

Datasource:

```prisma
provider = "postgresql"
url      = env("DATABASE_URL")
```

## Validação com Zod

Schemas ficam em `lib/validations/`:

- `provider-profile.ts`
- `service.ts`
- `quote-request.ts`
- `quote-request-status.ts`
- `proposal.ts`

## Segurança adotada

- Recursos autenticados filtram pelo `ProviderProfile` do `session.user.id`.
- Cliente público não precisa de login.
- Propostas públicas usam `publicToken`, não ID interno.
- Perfil público só aparece se `isPublished=true`.
- Serviços públicos só aparecem se `isActive=true`.
- Proposta expirada não pode ser aprovada/recusada.
- Proposta já aprovada/recusada não pode ser respondida novamente.

## Riscos técnicos conhecidos

- `QuoteRequest` não tem `serviceId`; o serviço escolhido é salvo como texto no início de `description`. Isso funciona no MVP, mas deve virar relacionamento se o produto evoluir.
- Auth.js v5 está em beta (`next-auth@5.0.0-beta.31`).
- O fluxo de proposta não possui editor dinâmico de itens; há até 3 campos fixos no formulário atual.
- Não há testes automatizados ainda.
- Não há rate limit em formulários públicos.
