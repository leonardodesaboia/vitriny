# OrçaFácil

OrçaFácil é um microSaaS para prestadores de serviço criarem um link público de orçamento, receberem pedidos organizados, enviarem propostas e permitirem que clientes aprovem ou recusem por link.

## Stack

- Next.js com App Router
- TypeScript
- Tailwind CSS
- PostgreSQL
- Prisma
- Auth.js / NextAuth

Nesta etapa, Next.js, TypeScript, Tailwind CSS e Prisma com PostgreSQL foram configurados. Autenticação, dashboard e fluxos de produto entram nas próximas etapas do MVP.

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

## Próximos passos

1. Criar a primeira migration local quando o PostgreSQL estiver configurado.
2. Configurar Auth.js / NextAuth.
3. Criar dashboard autenticado mínimo.
4. Implementar perfil público do prestador.
