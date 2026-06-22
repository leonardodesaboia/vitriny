# Auth

## Como funciona

O projeto usa Auth.js/NextAuth v5 beta com GitHub OAuth e Prisma Adapter.

Versão instalada no momento da documentação:

- `next-auth@5.0.0-beta.31`
- `@auth/prisma-adapter@2.11.2`

## Provider

Provider configurado:

- GitHub

Não há login com e-mail/senha no código atual.

## Arquivos envolvidos

- `auth.ts`
- `app/api/auth/[...nextauth]/route.ts`
- `proxy.ts`
- `components/auth/AuthButton.tsx`
- `components/auth/LoginButton.tsx`
- `components/auth/LogoutButton.tsx`
- `app/(auth)/login/page.tsx`

## Variáveis de ambiente

```env
AUTH_SECRET="segredo-forte"
AUTH_URL="http://localhost:3000"
AUTH_GITHUB_ID="github-client-id"
AUTH_GITHUB_SECRET="github-client-secret"
```

Em produção, `AUTH_URL` deve apontar para o domínio real.

## Configuração central

`auth.ts` exporta:

- `handlers`
- `auth`
- `signIn`
- `signOut`

O adapter usa:

```ts
PrismaAdapter(prisma)
```

## Rota de autenticação

`app/api/auth/[...nextauth]/route.ts` exporta `GET` e `POST` a partir de `handlers`.

## Proteção do dashboard

`proxy.ts` protege:

```text
/dashboard/:path*
```

As páginas internas também checam `auth()` e redirecionam para `/login` quando não há sessão.

## Testar login/logout

1. Configure GitHub OAuth.
2. Rode `npm run dev`.
3. Acesse `/login`.
4. Clique em `Entrar com GitHub`.
5. Confirme redirecionamento para `/dashboard`.
6. Clique em `Sair`.

## Produção

No GitHub OAuth App:

```text
Homepage URL: https://seu-dominio.com
Authorization callback URL: https://seu-dominio.com/api/auth/callback/github
```

Cuidados:

- Nunca commitar `.env`.
- Usar `AUTH_SECRET` forte.
- Conferir `AUTH_URL`.
- Conferir callback do GitHub.
- Rodar `npx prisma migrate deploy` antes de testar login em produção.

## Observações Auth.js v5

Auth.js v5 usa o padrão `auth.ts` na raiz e exports como `handlers`, `auth`, `signIn`, `signOut`.

Este projeto usa esse padrão.
