# Architecture

## Arquitetura técnica

Vitriny usa Next.js App Router com Server Components, Server Actions, Prisma e PostgreSQL.

Na interface, `Service`, `ProviderProfile` e `QuoteRequest` são apresentados respectivamente como item da vitrine, vitrine pública e pedido/solicitação. A nomenclatura técnica, as rotas e os models permanecem inalterados.

`Service.itemType` classifica o item como `PRODUCT` ou `SERVICE`. É um atributo visual e organizacional; as regras de proposta e pedidos continuam baseadas em `pricingType`.

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
- `lib/service-sale-mode.ts`: helper de UI que mapeia `pricingType` para o tipo `ServiceSaleMode` (`CUSTOM` | `FIXED_REQUEST`). Não existe no banco.
- `lib/dashboard.ts`: regras puras do onboarding, das visões rápidas de pedidos e da composição imutável da atividade recente.
- `lib/dashboard-activity.ts`: consultas limitadas e filtradas por prestador que alimentam a timeline da dashboard.
- `lib/brand-appearance.ts`: opções allowlisted e resolução por plano da paleta e tipografia; os tokens são aplicados por CSS variables em `app/globals.css`.
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
- `app/(auth)/verifique-seu-email/page.tsx`
- `app/(auth)/verificar-email/[token]/page.tsx`
- `app/u/[slug]/page.tsx`
- `app/u/[slug]/orcamento/page.tsx`
- `app/proposta/[publicToken]/page.tsx`

Rotas autenticadas:

- `app/(dashboard)/dashboard/page.tsx`
- `app/(dashboard)/dashboard/perfil/page.tsx`
- `app/(dashboard)/dashboard/servicos/page.tsx` — gerenciamento de itens da vitrine (rota técnica/legada)
- `app/(dashboard)/dashboard/pedidos/page.tsx`
- `app/(dashboard)/dashboard/propostas/nova/page.tsx`
- `app/(dashboard)/dashboard/propostas/templates/page.tsx`
- `app/(dashboard)/dashboard/billing/page.tsx`

`/dashboard/pedidos` aceita filtros por status em `?status=` e visões operacionais vindas da dashboard em `?view=MONTH|OPEN|APPROVED_MONTH|DEPOSIT`.

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
- `quote-requests.ts` — `createQuoteRequest`, `updateQuoteRequestDescription`
- `quote-request-notes.ts`
- `quote-request-status.ts`
- `proposals.ts` — inclui `markDepositPaid` (provider-only)
- `proposal-templates.ts` — inclui `saveProposalAsTemplate` (salva a proposta em edição como modelo sem redirecionar)
- `proposal-response.ts`
- `auth.ts` (`registerUser`, `loginWithCredentials`, `confirmEmail`, `resendEmailVerification`, `requestPasswordReset`, `resetPassword`)

Elas validam sessão quando necessário e aplicam regras de ownership.

## Route Handlers

- `app/api/auth/[...nextauth]/route.ts` — Auth.js.
- `app/api/services/[id]/image/route.ts` — upload (`POST`) e remoção (`DELETE`) de imagem de serviço via MinIO/S3. O tipo do arquivo é detectado por magic bytes (não por `Content-Type`) para evitar bypass de validação.
- `app/api/billing/invoices/route.ts` — lista faturas Stripe do prestador autenticado sem bloquear a renderização da página.
- `app/api/stripe/webhook/route.ts` — webhook Stripe com validação de assinatura.
- `app/api/proposals/[id]/pdf/route.ts` — download autenticado de proposta aprovada ou recusada em PDF, com validação de ownership.

## SEO e indexação

Helpers puros e testáveis em `lib/seo/`; `robots.ts` e `sitemap.ts` dinâmicos.

Regras de indexação:

- **Indexáveis:** landing (`/`), institucionais (`/termos`, `/privacidade`) e vitrines publicadas `/u/[slug]` **com conteúdo suficiente**.
- **`noindex, nofollow`** via metadata (helper `lib/seo/metadata.ts`): `/dashboard/**`, `(auth)/**`, `/u/[slug]/orcamento`, `/proposta/[publicToken]` e a página 404.
- `robots.txt` só faz `Disallow: /api` (sem HTML). **Não** se mistura `Disallow` com `noindex` na mesma rota — o Google precisa rastrear a página para ler o `noindex`.
- Vitrine **não publicada/inexistente** → `notFound()` (404 real) + `noindex`.
- **Conteúdo suficiente** (`lib/seo/storefront-content.ts`): itens ativos **ou** descrição **ou** (localização **e** contato). Vitrine publicada sem isso renderiza (200) mas fica `noindex` e fora do sitemap.

Metadata e dados estruturados:

- Vitrine: título/descrição locais ("[negócio] — [tipo] em [cidade, UF]") em `lib/seo/storefront-metadata.ts`; canonical próprio.
- JSON-LD (`lib/seo/structured-data.ts`, injetado por `components/seo/JsonLd.tsx`): o `@type` **varia por `businessType`** (serviços → `ProfessionalService`; produtos/ambos → `LocalBusiness` + `OfferCatalog`) + `BreadcrumbList`; landing usa `Organization` + `WebSite`. **Só reflete o que a vitrine mostra** — telefone, endereço, redes e catálogo entram apenas quando publicados. `serializeJsonLd` escapa `<` (XSS).

## Auth.js / NextAuth

Configuração central:

- `auth.ts`

Providers:

- Google OAuth.
- Credentials (e-mail/senha), com `bcrypt` e confirmação obrigatória antes do primeiro login para contas criadas após a migration de verificação. Contas anteriores foram marcadas como verificadas no rollout para evitar lockout.

Sessão:

- Estratégia `jwt` (exigência do Credentials provider; antes era `database`).

Adapter:

- `PrismaAdapter(prisma)`.

Proteção:

- `proxy.ts` protege `/dashboard/:path*` e aplica rate limiting em POST para login, cadastro, redefinição/reenvio/confirmação de e-mail e pedidos públicos. O store é in-memory (sliding window); trocar por Redis/Upstash antes de escalar para múltiplas instâncias.
- Cadastro Credentials persiste `User` pendente e `EmailVerificationToken` na mesma transação. A confirmação é uma mutação `POST`, preenche `emailVerified` e consome o token de uso único. Google OAuth não é condicionado por esse campo.
- A migration `20260702140000_add_email_verification` faz backfill de `emailVerified` somente para contas Credentials preexistentes; por isso elas não recebem confirmação retroativa.
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

O pedido público exige pelo menos e-mail ou telefone e um item da vitrine selecionado (não existe pedido genérico sem item). Regras dependentes do serviço são validadas novamente na Server Action: descrição para `CUSTOM`, dados completos de agendamento quando configurados e data real não passada.

## Fuso horário

As funções de data em `lib/utils/date.ts` (`getCurrentMonthRange`, `startOfLocalDay`, `isProposalExpired`) e o parse de `validUntil` usam horário local do processo. Como o produto é do Brasil, `instrumentation.ts` fixa `process.env.TZ = "America/Sao_Paulo"` (Brasil não tem horário de verão desde 2019) quando `TZ` não vem do ambiente. Sem isso, um servidor em UTC calcularia o reset do limite mensal e a expiração de proposta na meia-noite UTC (21h de Brasília), errando o dia por ~3h. O deploy pode sobrescrever definindo `TZ`. A expiração do Pix (`isPixPaymentExpired`) usa diferença absoluta em ms e independe do fuso.

## Planos e limites

As regras de limites ficam centralizadas em `lib/plan-limits.ts`.

O plano é armazenado em `ProviderProfile.plan`, usando `PlanTier`:

- `FREE`
- `PRO`

Limites `FREE`:

- 3 itens ativos;
- 50 pedidos de orçamento por mês (teto anti-abuso, não gatilho de upgrade — quem bate é o cliente final);
- 5 propostas por mês;
- 1 template de proposta.

`PRO` usa `null` nos limites para representar uso sem limite prático no MVP. A assinatura do prestador usa Stripe Checkout embutido, SetupIntent, portal, consulta de faturas e webhook assinado. O pagamento do cliente final usa Pix manual; a aplicação gera o código, mas não processa dinheiro nem recebe confirmação automática.

## Segurança adotada

- Recursos autenticados filtram pelo `ProviderProfile` do `session.user.id`.
- Cliente público não precisa de login.
- Propostas públicas usam `publicToken`, não ID interno.
- Perfil público só aparece se `isPublished=true`.
- Itens públicos só aparecem se `isActive=true`.
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
- O login por credenciais responde `invalid-credentials` genérico também para conta Google-only (sem senha): não revela existência nem método da conta antes de validar a senha. O aviso `email-not-verified` só aparece após a senha correta, então não serve para enumeração.

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
npm run test:coverage      # unit + actions com relatório de cobertura (gera coverage/, ignorado no git)
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
- Sessão `jwt` não é invalidável manualmente antes de expirar; por isso `requireAuth` e o layout do dashboard verificam `User.deletedAt` a cada requisição.
- Exclusão de conta é soft delete (`lib/actions/account.ts`): dados pessoais anonimizados, e-mail/slug viram tombstones (liberando ambos para novo cadastro), assinaturas recorrentes Stripe/Mercado Pago são canceladas antes da anonimização, itens são desativados e imagens removidas do storage. Pedidos, propostas e históricos são preservados para a futura tela administrativa; `deletedEmailHash` (SHA-256) permite detectar recorrência sem guardar o e-mail.
- Remetente do Resend (`onboarding@resend.dev`) é sandbox; trocar por domínio verificado antes de produção real.
- O fluxo de proposta usa editor dinâmico de itens, mantendo o cálculo do total no servidor.
- Históricos, notas internas e templates já possuem UI nas áreas correspondentes, mas ainda não existe uma página dedicada de detalhe do pedido.
- Rate limiting in-memory no middleware não sobrevive a reinicializações e não é compartilhado entre instâncias. Adequado para single-instance; exige Redis/Upstash em produção multi-instância.
- O pagamento antecipado obrigatório via Pix para itens `FIXED` (rota de reserva, actions `markPixReservationPaid`/`reopenPixReservation`/`markPixReservationClientPaid`, emails e visão de dashboard) foi removido. As colunas `fixedServiceAmount`, `pixReservationRequestedAt`, `pixReservationPaidAt`, `pixReservationClientPaidAt` e o valor de enum `REQUIRE_PIX_PAYMENT` permanecem no schema como resíduo legado (não são mais lidos nem escritos pela aplicação); uma migration de limpeza é follow-up pendente.
- Imagens de serviço dependem de MinIO/S3 local em desenvolvimento. O bucket deve existir com leitura pública. Em produção, configurar as variáveis `S3_*` descritas em `.env.example`.
