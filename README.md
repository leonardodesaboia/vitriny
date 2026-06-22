# OrçaFácil

OrçaFácil é um microSaaS para prestadores de serviço criarem um link público de orçamento, receberem pedidos organizados, enviarem propostas e permitirem que clientes aprovem ou recusem por link.

## Stack

- Next.js com App Router
- TypeScript
- Tailwind CSS
- PostgreSQL
- Prisma
- Auth.js / NextAuth

Nesta etapa, Next.js, TypeScript, Tailwind CSS, Prisma com PostgreSQL, autenticação e dashboard protegido foram configurados. Os fluxos de produto entram nas próximas etapas do MVP.

## Scripts

```bash
npm run dev
npm run build
npm run lint
npm run prisma:generate
npm run prisma:migrate
npm run prisma:studio
```

## Como rodar localmente

Instale as dependências e inicie o servidor de desenvolvimento:

```bash
npm install
npm run dev
```

A aplicação ficará disponível em `http://localhost:3000`.

## Banco de dados

O projeto usa PostgreSQL padrão com Prisma.

Para desenvolvimento local, o jeito mais simples é subir um Postgres com Docker:

```bash
docker run --name orcafacil-postgres \
  -e POSTGRES_USER=orcafacil \
  -e POSTGRES_PASSWORD=orcafacil \
  -e POSTGRES_DB=orcafacil \
  -p 5432:5432 \
  -d postgres:16
```

Crie um arquivo `.env` local a partir do exemplo:

```bash
cp .env.example .env
```

Configure a variável `DATABASE_URL`:

```env
DATABASE_URL="postgresql://orcafacil:orcafacil@localhost:5432/orcafacil"
```

Com o PostgreSQL rodando, gere o Prisma Client:

```bash
npm run prisma:generate
```

Para criar a primeira migration local:

```bash
npm run prisma:migrate -- --name init
```

Para abrir o Prisma Studio:

```bash
npm run prisma:studio
```

## Autenticação

O projeto usa Auth.js/NextAuth com Prisma Adapter e GitHub OAuth.

Adicione as variáveis de autenticação ao `.env`:

```env
AUTH_SECRET="um-segredo-com-pelo-menos-32-caracteres"
AUTH_URL="http://localhost:3000"
AUTH_GITHUB_ID="seu-github-client-id"
AUTH_GITHUB_SECRET="seu-github-client-secret"
```

Para gerar um segredo local:

```bash
openssl rand -base64 33
```

No GitHub, crie um OAuth App e configure:

```text
Homepage URL: http://localhost:3000
Authorization callback URL: http://localhost:3000/api/auth/callback/github
```

Depois de configurar o `.env`, rode a migration de autenticação:

```bash
npm run prisma:migrate -- --name add-auth
```

Para testar:

1. Rode `npm run dev`.
2. Acesse `http://localhost:3000/login`.
3. Clique em `Entrar com GitHub`.
4. Após autenticar, você deve ser redirecionado para `/dashboard`.
5. Use o botão `Sair` para encerrar a sessão.

## Escopo do MVP

1. Landing page
2. Login
3. Perfil público do prestador
4. Cadastro de serviços
5. Formulário público de pedido de orçamento
6. Painel de pedidos recebidos
7. Criação de proposta
8. Página pública da proposta
9. Botões de aprovar/recusar proposta

## Roadmap do MVP

- [x] 1. Base Next.js + TypeScript + Tailwind
- [x] 2. PostgreSQL + Prisma
- [x] 3. Auth.js / NextAuth
- [x] 4. Dashboard protegido
- [ ] 5. Perfil do prestador
- [ ] 6. Cadastro de serviços
- [ ] 7. Página pública do prestador
- [ ] 8. Pedido público de orçamento
- [ ] 9. Painel de pedidos recebidos
- [ ] 10. Criação de proposta
- [ ] 11. Página pública da proposta
- [ ] 12. Aprovar ou recusar proposta
- [ ] 13. Polimento visual, validações e deploy

## Próximos passos

1. Implementar perfil do prestador.
2. Implementar cadastro de serviços.
3. Criar página pública do prestador.
