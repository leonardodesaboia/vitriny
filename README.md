# OrçaFácil

OrçaFácil é um microSaaS para prestadores de serviço criarem um link público de orçamento, receberem pedidos organizados, enviarem propostas e permitirem que clientes aprovem ou recusem por link.

## Stack

- Next.js com App Router
- TypeScript
- Tailwind CSS
- PostgreSQL
- Prisma
- Auth.js / NextAuth

Nesta etapa inicial, somente Next.js, TypeScript e Tailwind CSS foram configurados. Banco de dados, Prisma e autenticação entram nas próximas etapas do MVP.

## Scripts

```bash
npm run dev
npm run build
npm run lint
```

## Como rodar localmente

Instale as dependências e inicie o servidor de desenvolvimento:

```bash
npm install
npm run dev
```

A aplicação ficará disponível em `http://localhost:3000`.

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

1. Configurar Prisma e PostgreSQL.
2. Configurar Auth.js / NextAuth.
3. Criar dashboard autenticado mínimo.
4. Implementar perfil público do prestador.
