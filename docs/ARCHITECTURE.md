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
tests/
types/
docs/
```

## Responsabilidades

- `app/`: rotas, páginas e route handlers.
- `components/`: componentes reutilizáveis de UI/formulários.
- `lib/actions/`: Server Actions.
- `lib/actions/auth-guard.ts`: helpers `requireAuth` e `requireProviderProfile`.
- `lib/validations/`: schemas Zod.
- `lib/prisma.ts`: instância do Prisma Client.
- `lib/plan-limits.ts`: regras de limites de plano centralizadas.
- `prisma/schema.prisma`: modelo de dados.
- `types/`: tipos compartilhados entre actions e componentes.
- `tests/`: testes automatizados (unit, actions, integration, e2e).
- `docs/`: documentação técnica e de produto.

## App Router

Rotas públicas:

- `app/page.tsx`
- `app/(auth)/login/page.tsx`
- `app/(auth)/cadastro/page.tsx`
- `app/(auth)/esqueci-senha/page.tsx`
- `app/(auth)/redefinir-senha/[token]/page.tsx`
- `app/u/[slug]/page.tsx`
- `app/u/[slug]/orcamento/page.tsx`
- `app/proposta/[publicToken]/page.tsx`

Rotas autenticadas:

- `app/(dashboard)/dashboard/page.tsx`
- `app/(dashboard)/dashboard/perfil/page.tsx`
- `app/(dashboard)/dashboard/servicos/page.tsx`
- `app/(dashboard)/dashboard/pedidos/page.tsx`
- `app/(dashboard)/dashboard/propostas/nova/page.tsx`
- `app/(dashboard)/dashboard/propostas/templates/page.tsx`

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
- `quote-request-notes.ts`
- `quote-request-status.ts`
- `proposals.ts`
- `proposal-templates.ts`
- `proposal-response.ts`
- `auth.ts` (`registerUser`, `loginWithCredentials`, `requestPasswordReset`, `resetPassword`)

Elas validam sessão quando necessário e aplicam regras de ownership.

## Route Handlers

O único route handler explícito é Auth.js:

- `app/api/auth/[...nextauth]/route.ts`

## Auth.js / NextAuth

Configuração central:

- `auth.ts`

Providers:

- Google OAuth.
- Credentials (e-mail/senha), com `bcrypt` para hash/verificação de senha.

Sessão:

- Estratégia `jwt` (exigência do Credentials provider; antes era `database`).

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
- `quote-request-note.ts`
- `quote-request-status.ts`
- `proposal.ts`
- `proposal-template.ts`
- `auth.ts` (`registerSchema`, `loginSchema`, `forgotPasswordSchema`, `resetPasswordSchema`)

## Planos e limites

As regras de limites ficam centralizadas em `lib/plan-limits.ts`.

O plano é armazenado em `ProviderProfile.plan`, usando `PlanTier`:

- `FREE`
- `PRO`

Limites `FREE`:

- 3 serviços ativos;
- 10 pedidos de orçamento por mês;
- 5 propostas por mês;
- 1 template de proposta.

`PRO` usa `null` nos limites para representar uso sem limite prático no MVP. Stripe é usado apenas para assinatura do prestador. Pagamento do cliente final por Pix é manual: a proposta aprovada pode exibir chave Pix, código copia e cola e QR Code, mas o OrçaFácil não processa dinheiro nem confirma pagamento automaticamente.

## Segurança adotada

- Recursos autenticados filtram pelo `ProviderProfile` do `session.user.id`.
- Cliente público não precisa de login.
- Propostas públicas usam `publicToken`, não ID interno.
- Perfil público só aparece se `isPublished=true`.
- Serviços públicos só aparecem se `isActive=true`.
- Proposta expirada não pode ser aprovada/recusada.
- Proposta já aprovada/recusada não pode ser respondida novamente.
- Mudanças de status de pedidos são registradas em `QuoteRequestStatusHistory`.
- Mudanças de status de propostas são registradas em `ProposalStatusHistory`.
- Notas internas de pedidos e templates de proposta são autenticados e filtrados por ownership do prestador.
- Senha de usuário sempre hash bcrypt, nunca texto puro.
- E-mail duplicado entre Google e e-mail/senha é bloqueado, nunca vinculado automaticamente.
- "Esqueci minha senha" nunca revela se um e-mail existe no sistema (mesma resposta em todos os casos).

## Testes

### Camadas de teste

| Camada | Localização | Runner | Banco |
|--------|------------|--------|-------|
| Unitários (validações + limites) | `tests/unit/` | Vitest | — |
| Actions (Prisma mockado) | `tests/actions/` | Vitest | mock |
| Integração | `tests/integration/` | Vitest | `orcafacil_test` |
| E2E | `tests/e2e/` | Playwright | dev DB |

### Comandos

```bash
npm test                   # unit + actions (200 testes, sem banco real)
npm run test:integration   # integração com banco real (24 testes)
npm run test:e2e           # E2E Playwright (exige dev server rodando)
npm run test:e2e:ui        # Playwright com UI interativa
npm run playwright:install # instalar browsers (primeira vez)
```

### Banco de testes

A suite de integração usa um banco PostgreSQL separado (`orcafacil_test`) no mesmo container Docker.

Criação e migração:
```bash
docker exec orcafacil-postgres psql -U orcafacil -c "CREATE DATABASE orcafacil_test;"
DATABASE_URL="postgresql://orcafacil:orcafacil@localhost:5432/orcafacil_test" npx prisma db push
```

### E2E

O Playwright usa o dev server na porta 3000 com `reuseExistingServer: true`.

- `tests/e2e/global-setup.ts`: cria usuário de teste no banco.
- `tests/e2e/global-teardown.ts`: apaga o usuário de teste.
- `tests/e2e/auth.setup.ts`: faz login e salva o `storageState` em `.auth/user.json`.
- Testes públicos (`landing`, `public-profile`) rodam no projeto `chromium-public`.
- Testes autenticados (`auth`) rodam no projeto `chromium` com estado de sessão salvo.

## Riscos técnicos conhecidos

- `QuoteRequest` possui `serviceId` opcional. Pedidos novos salvam a descrição limpa; a UI de pedidos ainda usa parsing legado da `description` apenas para pedidos antigos sem `serviceId`. No formulário público, quando o pedido vem de um card de serviço, o serviço já entra pré-selecionado e o select fica oculto.
- Auth.js v5 está em beta (`next-auth@5.0.0-beta.31`).
- Sessão `jwt` não é invalidável manualmente antes de expirar.
- Remetente do Resend (`onboarding@resend.dev`) é sandbox; trocar por domínio verificado antes de produção real.
- O fluxo de proposta usa editor dinâmico de itens, mantendo o cálculo do total no servidor.
- Históricos, notas internas e templates já possuem UI nas áreas correspondentes, mas ainda não existe uma página dedicada de detalhe do pedido.
- Não há rate limit em formulários públicos.
