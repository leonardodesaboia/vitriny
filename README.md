# OrçaFácil

OrçaFácil é um microSaaS para prestadores de serviço criarem um perfil público, receberem pedidos de orçamento, enviarem propostas e permitirem que clientes aprovem ou recusem por link.

## Visão geral

O produto resolve um problema simples: muitos prestadores recebem pedidos soltos por mensagens, perdem contexto e precisam montar propostas manualmente. O OrçaFácil centraliza esse fluxo em um painel simples.

Público-alvo:

- prestadores autônomos;
- pequenos negócios de serviços;
- profissionais que precisam enviar propostas simples por link.

## Stack

- Next.js 16 com App Router
- TypeScript
- Tailwind CSS
- PostgreSQL
- Prisma
- Auth.js / NextAuth v5 beta
- GitHub OAuth
- Zod

## Status atual do MVP

MVP funcional implementado:

- landing page;
- login/logout;
- dashboard protegido;
- perfil do prestador;
- cadastro de serviços;
- página pública do prestador em `/u/[slug]`;
- pedido público de orçamento em `/u/[slug]/orcamento`;
- painel de pedidos recebidos;
- criação de proposta;
- página pública da proposta em `/proposta/[publicToken]`;
- aprovação ou recusa pública da proposta;
- histórico de status do pedido no painel;
- histórico de status da proposta na página pública;
- notas internas do pedido no painel;
- templates de proposta no dashboard.

## Fora do MVP

Não implementar ainda sem validação:

- pagamento real;
- Pix;
- WhatsApp API;
- assinatura digital;
- PDF avançado;
- IA para sugerir preço;
- aplicativo mobile;
- multiempresa complexo;
- marketplace;
- planos pagos.

## Como rodar localmente

Instale dependências:

```bash
npm install
```

Suba PostgreSQL com Docker Compose:

```bash
docker compose up -d
```

Crie o `.env`:

```bash
cp .env.example .env
```

Rode migrations e gere o Prisma Client:

```bash
npm run prisma:migrate
npm run prisma:generate
```

Inicie o app:

```bash
npm run dev
```

Acesse `http://localhost:3000`.

## Variáveis de ambiente

```env
DATABASE_URL="postgresql://orcafacil:orcafacil@localhost:5432/orcafacil"
AUTH_SECRET="um-segredo-com-pelo-menos-32-caracteres"
AUTH_URL="http://localhost:3000"
AUTH_GOOGLE_ID="seu-google-client-id"
AUTH_GOOGLE_SECRET="seu-google-client-secret"
RESEND_API_KEY="re_sua_api_key"
```

Para gerar `AUTH_SECRET`:

```bash
openssl rand -base64 33
```

Callback do Google OAuth em desenvolvimento:

```text
http://localhost:3000/api/auth/callback/google
```

## Comandos úteis

```bash
npm run dev
npm run build
npm run lint
npm run prisma:generate
npm run prisma:migrate
npm run prisma:studio
```

Parar o banco local:

```bash
docker compose down
```

## Prisma

Schema principal: `prisma/schema.prisma`.

Migrations existentes:

- `prisma/migrations/20260622204845_init/migration.sql`
- `prisma/migrations/20260622205244_add_auth/migration.sql`
- `prisma/migrations/20260623000000_add_quote_request_service_relation/migration.sql`
- `prisma/migrations/20260623001000_add_quote_request_status_history/migration.sql`
- `prisma/migrations/20260623002000_add_proposal_status_history/migration.sql`
- `prisma/migrations/20260623003000_add_quote_request_internal_notes/migration.sql`
- `prisma/migrations/20260623004000_add_proposal_templates/migration.sql`

Observação técnica: `QuoteRequest` possui relação opcional com `Service` via `serviceId`. A UI de pedidos já usa `quoteRequest.service` e mantém compatibilidade com o prefixo legado na descrição para pedidos antigos.
Históricos de status, notas internas e templates de proposta já aparecem no front nas áreas correspondentes.

Comandos:

```bash
npm run prisma:migrate
npm run prisma:generate
npm run prisma:studio
npx prisma validate
```

## Teste manual do fluxo completo

1. Usuário acessa `/`.
2. Usuário faz login em `/login`.
3. Usuário acessa `/dashboard`.
4. Usuário cria ou edita perfil em `/dashboard/perfil`.
5. Usuário marca o perfil como publicado.
6. Usuário cadastra serviços em `/dashboard/servicos`.
7. Cliente acessa `/u/[slug]`.
8. Cliente envia pedido em `/u/[slug]/orcamento`.
9. Prestador vê o pedido em `/dashboard/pedidos`.
10. Prestador cria proposta em `/dashboard/propostas/nova?requestId=...`.
11. Cliente acessa `/proposta/[publicToken]`.
12. Cliente aprova ou recusa a proposta.
13. Prestador confere status atualizado em `/dashboard/pedidos`.

## Deploy

Variáveis necessárias em produção:

```env
DATABASE_URL="postgresql://usuario:senha@host:5432/orcafacil"
AUTH_SECRET="segredo-forte"
AUTH_URL="https://seu-dominio.com"
AUTH_GOOGLE_ID="google-client-id"
AUTH_GOOGLE_SECRET="google-client-secret"
RESEND_API_KEY="re_sua_api_key"
```

Antes do deploy:

```bash
npm run lint
npm run build
npx prisma validate
npx prisma migrate deploy
```

Configure o Google OAuth Client (Google Cloud Console > APIs & Services > Credentials):

```text
Authorized redirect URI: https://seu-dominio.com/api/auth/callback/google
```

## Roadmap resumido

- [x] Base Next.js + TypeScript + Tailwind
- [x] PostgreSQL + Prisma
- [x] Auth.js / NextAuth
- [x] Dashboard protegido
- [x] Perfil do prestador
- [x] Cadastro de serviços
- [x] Página pública do prestador
- [x] Pedido público de orçamento
- [x] Painel de pedidos recebidos
- [x] Criação de proposta
- [x] Página pública da proposta
- [x] Aprovar ou recusar proposta
- [x] Relação entre pedido e serviço
- [x] Histórico de status do pedido
- [x] Histórico de status da proposta
- [x] Notas internas do pedido
- [x] Templates de proposta
- [x] Polimento visual, validações e preparação para deploy

## Documentação complementar

- [Visão do projeto](docs/PROJECT_OVERVIEW.md)
- [Arquitetura](docs/ARCHITECTURE.md)
- [Banco de dados](docs/DATABASE.md)
- [Autenticação](docs/AUTH.md)
- [Fluxo do MVP](docs/MVP_FLOW.md)
- [Roadmap](docs/ROADMAP.md)
- [Handoff para IA/desenvolvedores](docs/AI_HANDOFF.md)
