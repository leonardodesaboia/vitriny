# Architecture

## Arquitetura técnica

Vitriny usa Next.js App Router com Server Components, Server Actions, Prisma e PostgreSQL.

Na interface, `Service`, `ProviderProfile` e `QuoteRequest` são apresentados respectivamente como item da vitrine, vitrine pública e pedido/solicitação. A nomenclatura técnica, as rotas e os models permanecem inalterados.

`Service.itemType` classifica o item como `PRODUCT` ou `SERVICE`. É um atributo visual e organizacional; as regras de proposta, Pix e pedidos continuam baseadas em `pricingType` e `fixedServiceCheckoutMode`.

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
- `components/onboarding/PublicLinkCard.tsx` e `components/onboarding/onboarding-storage.ts`: registram localmente a cópia/abertura do link público no onboarding.
- `components/dashboard/`: cards de métricas, pendências e timeline de atividade recente da dashboard.
- `components/billing/AsyncInvoiceList.tsx`: carrega as faturas depois do primeiro paint para não travar a página de billing.
- `lib/actions/`: Server Actions.
- `lib/actions/auth-guard.ts`: helpers `requireAuth` e `requireProviderProfile`.
- `lib/validations/`: schemas Zod.
- `lib/prisma.ts`: instância do Prisma Client.
- `lib/plan-limits.ts`: regras de limites de plano centralizadas.
- `lib/service-sale-mode.ts`: helper de UI que mapeia `pricingType` + `fixedServiceCheckoutMode` para o tipo `ServiceSaleMode` (`CUSTOM` | `FIXED_REQUEST` | `FIXED_PIX`). Não existe no banco.
- `lib/dashboard.ts`: regras puras do onboarding, das visões rápidas de pedidos e da composição imutável da atividade recente.
- `lib/dashboard-activity.ts`: consultas limitadas e filtradas por prestador que alimentam a timeline da dashboard.
- `lib/theme-presets.ts`: metadados dos temas visuais da aplicação; as cores e fontes são aplicadas por CSS variables em `app/globals.css`.
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
- `app/u/[slug]/reserva/[requestId]/page.tsx` — página de pagamento antecipado obrigatório: mostra QR Code + código copia e cola; requer `pixReservationRequestedAt` preenchido e Pix configurado.
- `app/u/[slug]/pagamento/[requestId]/page.tsx` — compatibilidade para links legados de pagamento direto; novos pedidos não usam esta rota.
- `app/proposta/[publicToken]/page.tsx`

Rotas autenticadas:

- `app/(dashboard)/dashboard/page.tsx`
- `app/(dashboard)/dashboard/perfil/page.tsx`
- `app/(dashboard)/dashboard/servicos/page.tsx` — gerenciamento de itens da vitrine (rota técnica/legada)
- `app/(dashboard)/dashboard/pedidos/page.tsx`
- `app/(dashboard)/dashboard/propostas/nova/page.tsx`
- `app/(dashboard)/dashboard/propostas/templates/page.tsx`
- `app/(dashboard)/dashboard/billing/page.tsx`

`/dashboard/pedidos` aceita filtros por status em `?status=` e visões operacionais vindas da dashboard em `?view=MONTH|OPEN|APPROVED_MONTH|PIX_RESERVATION|DEPOSIT`.

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
- `services.ts` — `createService`, `updateService`, `toggleServiceStatus`, `deleteService`
- `quote-requests.ts` — `createQuoteRequest` (fluxo normal ou pagamento Pix obrigatório), `updateQuoteRequestDescription`, `markPixReservationPaid` (provider-only)
- `quote-request-notes.ts`
- `quote-request-status.ts`
- `proposals.ts` — inclui `markDepositPaid` (provider-only)
- `proposal-templates.ts`
- `proposal-response.ts`
- `auth.ts` (`registerUser`, `loginWithCredentials`, `requestPasswordReset`, `resetPassword`)

Elas validam sessão quando necessário e aplicam regras de ownership.

## Route Handlers

- `app/api/auth/[...nextauth]/route.ts` — Auth.js.
- `app/api/services/[id]/image/route.ts` — upload (`POST`) e remoção (`DELETE`) de imagem de serviço via MinIO/S3. O tipo do arquivo é detectado por magic bytes (não por `Content-Type`) para evitar bypass de validação.
- `app/api/billing/invoices/route.ts` — lista faturas Stripe do prestador autenticado sem bloquear a renderização da página.
- `app/api/stripe/webhook/route.ts` — webhook Stripe com validação de assinatura.
- `app/api/proposals/[id]/pdf/route.ts` — download autenticado de proposta aprovada ou recusada em PDF, com validação de ownership.

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

- `proxy.ts` protege `/dashboard/:path*` e aplica rate limiting em POST para `/api/auth/callback/credentials`, `/esqueci-senha` e `/u/*/orcamento`. O store é in-memory (sliding window); trocar por Redis/Upstash antes de escalar para múltiplas instâncias.
- Páginas autenticadas também checam `auth()` e redirecionam para `/login`.
- `next.config.mjs` define security headers HTTP em todas as respostas: `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy` e `Permissions-Policy`.

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

O pedido público exige pelo menos e-mail ou telefone. Regras dependentes do serviço são validadas novamente na Server Action: descrição para `CUSTOM` ou pedido genérico, dados completos de agendamento quando configurados e data real não passada.

## Planos e limites

As regras de limites ficam centralizadas em `lib/plan-limits.ts`.

O plano é armazenado em `ProviderProfile.plan`, usando `PlanTier`:

- `FREE`
- `PRO`

Limites `FREE`:

- 3 itens ativos;
- 10 pedidos de orçamento por mês;
- 5 propostas por mês;
- 1 template de proposta.

`PRO` usa `null` nos limites para representar uso sem limite prático no MVP. A assinatura do prestador usa Stripe Checkout embutido, SetupIntent, portal, consulta de faturas e webhook assinado. O pagamento do cliente final usa Pix manual; a aplicação gera o código, mas não processa dinheiro nem recebe confirmação automática.

## Segurança adotada

- Recursos autenticados filtram pelo `ProviderProfile` do `session.user.id`.
- Cliente público não precisa de login.
- Propostas públicas usam `publicToken`, não ID interno.
- Perfil público só aparece se `isPublished=true`.
- Itens públicos só aparecem se `isActive=true`.
- Páginas públicas de Pix validam que o pedido pertence ao perfil indicado pelo slug e usam o valor congelado em `fixedServiceAmount`.
- Upload/remoção de imagem e geração de PDF validam autenticação, plano quando aplicável e ownership.
- Webhook Stripe valida `stripe-signature` antes de alterar plano ou assinatura.
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

| Camada                           | Localização          | Runner     | Banco            |
| -------------------------------- | -------------------- | ---------- | ---------------- |
| Unitários (validações + limites) | `tests/unit/`        | Vitest     | —                |
| Actions (Prisma mockado)         | `tests/actions/`     | Vitest     | mock             |
| Integração                       | `tests/integration/` | Vitest     | `orcafacil_test` |
| E2E                              | `tests/e2e/`         | Playwright | dev DB           |

### Comandos

```bash
npm test                   # unit + actions, sem banco real
npm run test:integration   # integração com banco real
npm run test:e2e           # E2E Playwright (exige dev server rodando)
npm run test:e2e:ui        # Playwright com UI interativa
npm run playwright:install # instalar browsers (primeira vez)
```

### Banco de testes

A suite de integração usa um banco PostgreSQL separado (`orcafacil_test`) no mesmo container Docker.

Criação e migração:

```bash
docker exec vitriny-postgres psql -U vitriny -c "CREATE DATABASE orcafacil_test;"
DATABASE_URL="postgresql://vitriny:vitriny@localhost:5432/orcafacil_test" npx prisma db push
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
- Rate limiting in-memory no middleware não sobrevive a reinicializações e não é compartilhado entre instâncias. Adequado para single-instance; exige Redis/Upstash em produção multi-instância.
- Pagamento Pix obrigatório não tem expiração automática: `pixReservationRequestedAt` fica permanente no banco mesmo se o cliente não pagar. Sem limpeza automática de pagamentos abandonados.
- Imagens de serviço dependem de MinIO/S3 local em desenvolvimento. O bucket deve existir com leitura pública. Em produção, configurar as variáveis `S3_*` descritas em `.env.example`.
