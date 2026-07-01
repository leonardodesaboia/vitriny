# Vitriny

Vitriny é uma vitrine online para pequenos negócios apresentarem produtos e serviços, receberem pedidos, enviarem propostas e oferecerem pagamento via Pix manual.

## Visão geral

O produto resolve um problema simples: pequenos negócios recebem pedidos soltos por mensagens, perdem contexto e precisam organizar retornos e propostas manualmente. O Vitriny centraliza esse fluxo em um painel simples.

Público-alvo:

- pequenos negócios que vendem produtos ou serviços;
- profissionais autônomos;
- negócios que recebem encomendas, pedidos personalizados ou solicitações sob consulta.

## Glossário da interface

A interface usa uma linguagem ampla sem renomear a arquitetura interna:

- **item da vitrine** corresponde ao model interno `Service`;
- **Produto** ou **Serviço** corresponde a `Service.itemType` (`PRODUCT` ou `SERVICE`) e serve apenas como classificação visual;
- **vitrine pública** corresponde ao `ProviderProfile` publicado em `/u/[slug]`;
- **pedido** ou **solicitação** corresponde ao model interno `QuoteRequest`;
- **proposta** corresponde ao model `Proposal` e permanece no fluxo de itens sob consulta;
- **pagamento via Pix** é manual e feito diretamente ao negócio; o Vitriny não processa nem confirma o pagamento automaticamente.

Rotas, models, enums e nomes técnicos mantêm a nomenclatura original nesta fase.

`itemType` não altera preço, Pix, propostas, pedidos ou limites. Essas regras continuam dependendo de `pricingType` e `fixedServiceCheckoutMode`.

## Stack

- Next.js 16 com App Router
- TypeScript
- Tailwind CSS
- PostgreSQL
- Prisma
- Auth.js / NextAuth v5 beta
- Google OAuth + e-mail/senha
- Zod

## Status atual do MVP

MVP funcional implementado:

- landing page;
- login/logout;
- dashboard protegido com onboarding por tipo de serviço, métricas mensais, pendências operacionais e atividade recente;
- dados do negócio;
- cadastro de itens da vitrine;
- classificação dos itens como Produto ou Serviço;
- vitrine pública do negócio em `/u/[slug]`;
- pedido público em `/u/[slug]/orcamento`, com item pré-selecionado, contato obrigatório e validação server-side por tipo de item;
- painel de pedidos recebidos;
- criação de proposta;
- página pública da proposta em `/proposta/[publicToken]`;
- aprovação ou recusa pública da proposta;
- histórico de status do pedido no painel;
- histórico de status da proposta na página pública;
- notas internas do pedido no painel;
- templates de proposta no dashboard;
- filtro de pedidos por status em `/dashboard/pedidos`;
- visões rápidas de pedidos abertas pela dashboard: mês atual, pedidos em aberto, propostas aprovadas, pagamentos Pix e entradas pendentes;
- itens com preço fixo ou sob consulta, agendamento opcional e imagem para PRO;
- Pix manual para entrada de proposta e pagamento obrigatório de item com preço fixo;
- download autenticado da proposta em PDF após aprovação ou recusa;
- personalização global de cores e fontes para usuários PRO;
- tela de assinatura com faturas carregadas em segundo plano, sem travar o dashboard;
- assinatura recorrente PRO via Stripe Checkout embutido e webhook assinado.

## Fora do MVP

Não implementar ainda sem validação:

- pagamento automático ou gateway Pix;
- WhatsApp API;
- assinatura digital;
- editor avançado de PDF;
- IA para sugerir preço;
- aplicativo mobile;
- multiempresa complexo;
- marketplace;
- pagamento automatizado do cliente final.

## Planos e limites de uso

O produto possui planos com limites de uso, assinatura PRO via Stripe e Pix manual para pagamentos do cliente final.

Planos:

- `FREE`
- `PRO`

Limites do plano `FREE`:

- até 3 itens ativos;
- até 10 pedidos por mês;
- até 5 propostas por mês;
- até 1 template de proposta.

O plano `PRO` não possui limites práticos no MVP. As regras ficam centralizadas em `lib/plan-limits.ts`.

Importante: o Pix do cliente final é manual. O Vitriny mostra chave Pix, código copia e cola e QR Code, mas não processa dinheiro nem confirma pagamento automaticamente. Stripe continua sendo usado apenas para assinatura do prestador.

## Feature PRO: Tema visual da aplicação

Usuários no plano PRO podem escolher um tema visual para a aplicação: dashboard do profissional e fluxo público do cliente, incluindo perfil em `/u/[slug]`, formulário de pedido, pagamento Pix e proposta pública em `/proposta/[publicToken]`. Os temas disponíveis são `DEFAULT`, `CLEAN`, `BEAUTY`, `CREATIVE`, `PREMIUM` e `BOLD`.

Usuários FREE sempre usam o tema `DEFAULT`. Se um usuário PRO escolher um tema e depois voltar para FREE, o valor permanece salvo no banco, mas a aplicação renderiza `DEFAULT` enquanto o plano não for PRO.

Os temas alteram apenas tokens globais de cor e fonte via CSS variables. Eles não trocam layout, espaçamento ou classes específicas de cada componente. As regras ficam centralizadas em `lib/theme-presets.ts` e `app/globals.css`. Não há editor visual livre, CSS customizado, upload de banner ou drag-and-drop nesta etapa.

## Feature de billing

A página `/dashboard/billing` permite assinar, cancelar e reativar o PRO, atualizar a forma de pagamento e abrir o portal da Stripe. O resumo do plano carrega imediatamente e as faturas são buscadas depois via `/api/billing/invoices`, sem bloquear a página. O webhook `/api/stripe/webhook` mantém plano e status da assinatura sincronizados.

## Feature PRO: Imagem por serviço

Usuários no plano PRO podem adicionar 1 imagem por item (JPEG, PNG ou WebP, máximo 2 MB). A imagem é exibida no card do item na vitrine pública `/u/[slug]`.

O storage usa MinIO (compatível com S3 via `@aws-sdk/client-s3`). As credenciais ficam exclusivamente server-side — nunca expostas ao browser.

### Como rodar MinIO localmente com Docker

```bash
docker run -d \
  --name minio \
  -p 9000:9000 \
  -p 9001:9001 \
  -e MINIO_ROOT_USER=minioadmin \
  -e MINIO_ROOT_PASSWORD=minioadmin \
  quay.io/minio/minio server /data --console-address ":9001"
```

Acesse o console em `http://localhost:9001` (usuário: `minioadmin`, senha: `minioadmin`).

### Criar bucket e permitir leitura pública

1. Acesse o console MinIO em `http://localhost:9001`
2. Vá em **Buckets → Create Bucket**
3. Nome: `vitriny` (deve bater com `S3_BUCKET_NAME`)
4. Vá em **Buckets → vitriny → Access Policy**
5. Selecione **Public** (ou defina a policy como `s3:GetObject` para todos)

> **Importante:** Se o bucket não for público, o upload funciona mas as imagens não aparecerão no browser. O `imageUrl` armazenado no banco usa `S3_PUBLIC_BASE_URL`, que precisa ser acessível pelo navegador do cliente final.

### Variáveis MinIO

```env
S3_ENDPOINT="http://localhost:9000"          # usado pelo SDK (interno)
S3_REGION="us-east-1"
S3_ACCESS_KEY_ID="minioadmin"
S3_SECRET_ACCESS_KEY="minioadmin"
S3_BUCKET_NAME="vitriny"
S3_PUBLIC_BASE_URL="http://localhost:9000/vitriny"  # URL pública no imageUrl
S3_FORCE_PATH_STYLE="true"                   # obrigatório para MinIO
```

> Em produção, `S3_ENDPOINT` aponta para o MinIO interno e `S3_PUBLIC_BASE_URL` aponta para o domínio público (ex: `https://files.seudominio.com/vitriny`).

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
DATABASE_URL="postgresql://vitriny:vitriny@localhost:5432/vitriny"
AUTH_SECRET="um-segredo-com-pelo-menos-32-caracteres"
AUTH_URL="http://localhost:3000"
AUTH_GOOGLE_ID="seu-google-client-id"
AUTH_GOOGLE_SECRET="seu-google-client-secret"
RESEND_API_KEY="re_sua_api_key"
EMAIL_FROM="Vitriny <contato@seu-dominio.com>"
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
STRIPE_PRO_PRICE_ID="price_..."
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_..."
NEXT_PUBLIC_APP_URL="http://localhost:3000"
S3_ENDPOINT="http://localhost:9000"
S3_REGION="us-east-1"
S3_ACCESS_KEY_ID="minioadmin"
S3_SECRET_ACCESS_KEY="minioadmin"
S3_BUCKET_NAME="vitriny"
S3_PUBLIC_BASE_URL="http://localhost:9000/vitriny"
S3_FORCE_PATH_STYLE="true"
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

As migrations versionadas ficam em `prisma/migrations/`. O diretório é a fonte de verdade; não mantenha uma lista manual duplicada neste arquivo.

Observação técnica: `QuoteRequest` possui relação opcional com `Service` via `serviceId`. A UI de pedidos já usa `quoteRequest.service`, pré-seleciona o serviço quando o cliente vem de um card e mantém compatibilidade com o prefixo legado na descrição para pedidos antigos.
Históricos de status, notas internas, templates de proposta, billing, Pix, imagens de serviço e temas globais já possuem migrations versionadas.

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
   Quando o item com preço fixo exige pagamento, segue obrigatoriamente para `/u/[slug]/reserva/[requestId]`. `/u/[slug]/pagamento/[requestId]` permanece apenas para links legados.
9. Negócio vê o pedido em `/dashboard/pedidos`.
10. Negócio cria proposta em `/dashboard/propostas/nova?requestId=...`.
11. Cliente acessa `/proposta/[publicToken]`.
12. Cliente aprova ou recusa a proposta.
13. Negócio confere status atualizado em `/dashboard/pedidos`.

## Deploy

Variáveis necessárias em produção:

```env
DATABASE_URL="postgresql://usuario:senha@host:5432/vitriny"
AUTH_SECRET="segredo-forte"
AUTH_URL="https://seu-dominio.com"
AUTH_GOOGLE_ID="google-client-id"
AUTH_GOOGLE_SECRET="google-client-secret"
RESEND_API_KEY="re_sua_api_key"
EMAIL_FROM="Vitriny <contato@seu-dominio.com>"
STRIPE_SECRET_KEY="sk_live_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
STRIPE_PRO_PRICE_ID="price_..."
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_live_..."
NEXT_PUBLIC_APP_URL="https://seu-dominio.com"
S3_ENDPOINT="https://storage-interno.exemplo.com"
S3_REGION="us-east-1"
S3_ACCESS_KEY_ID="credencial-do-storage"
S3_SECRET_ACCESS_KEY="segredo-do-storage"
S3_BUCKET_NAME="vitriny"
S3_PUBLIC_BASE_URL="https://files.seu-dominio.com/vitriny"
S3_FORCE_PATH_STYLE="true"
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
- [x] Dados do negócio
- [x] Cadastro de itens da vitrine
- [x] Classificação visual de itens como Produto ou Serviço
- [x] Vitrine pública do negócio
- [x] Pedido público
- [x] Painel de pedidos recebidos
- [x] Criação de proposta
- [x] Página pública da proposta
- [x] Aprovar ou recusar proposta
- [x] Relação entre pedido e serviço
- [x] Histórico de status do pedido
- [x] Histórico de status da proposta
- [x] Notas internas do pedido
- [x] Templates de proposta
- [x] Planos, limites e assinatura PRO via Stripe
- [x] Pix manual para propostas e itens com preço fixo
- [x] PDF de proposta
- [x] Imagem por item para PRO
- [x] Temas globais para PRO
- [x] Filtro de pedidos por status
- [x] Polimento visual, validações e preparação para deploy

## Documentação complementar

- [Visão do projeto](docs/PROJECT_OVERVIEW.md)
- [Arquitetura](docs/ARCHITECTURE.md)
- [Banco de dados](docs/DATABASE.md)
- [Autenticação](docs/AUTH.md)
- [Fluxo do MVP](docs/MVP_FLOW.md)
- [Roadmap](docs/ROADMAP.md)
- [Handoff para IA/desenvolvedores](docs/AI_HANDOFF.md)
