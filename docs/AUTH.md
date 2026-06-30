# Auth

## Como funciona

O projeto usa Auth.js/NextAuth v5 beta com **Google OAuth** e **Credentials (e-mail/senha)**, com `PrismaAdapter`. A sessão usa estratégia **`jwt`** (não `database`), exigência do Auth.js para usar um Credentials provider customizado. O Google OAuth continua funcionando normalmente nesse modo.

Versão instalada no momento da documentação:

- `next-auth@5.0.0-beta.31`
- `@auth/prisma-adapter@2.11.2`
- `bcryptjs` (hash de senha)
- `resend` (envio de e-mails transacionais)

GitHub OAuth foi removido completamente do projeto.

## Providers

Providers configurados:

- **Google** (OAuth)
- **Credentials** (e-mail/senha)

Não há mais GitHub. Não há login por magic link/e-mail mágico (`VerificationToken` continua no schema como model padrão do Auth.js, mas sem uso real).

## Cadastro e login com e-mail/senha

- Cadastro: `/cadastro`, action `registerUser` em `lib/actions/auth.ts`. Cria `User` com `password` hasheado (`bcrypt.hash`, custo 10) e já loga automaticamente.
- Login: `/login`, action `loginWithCredentials` em `lib/actions/auth.ts`. O provider `Credentials` (`auth.ts`) valida e-mail/senha com `loginSchema` e `bcrypt.compare`.
- Sem verificação de e-mail no cadastro (decisão de produto para esta etapa).

### Bloqueio de e-mail duplicado entre métodos

- **Lado Credentials → Google:** se o e-mail já existe com `password` definido, cadastro mostra "Este e-mail já está cadastrado." Se o e-mail existe mas é conta só-Google (`password: null`), mostra "Este e-mail já está cadastrado com Google. Entre com Google."
- **Lado Google → Credentials:** comportamento padrão do Auth.js — sem `allowDangerousEmailAccountLinking`, login Google com e-mail já cadastrado por senha é bloqueado automaticamente (erro `OAuthAccountNotLinked`), redirecionado para `/login` (graças a `pages.signIn: "/login"` em `auth.ts`) com mensagem própria.
- Não há vínculo automático de conta entre os dois métodos.

## Recuperação de senha

- `/esqueci-senha`: formulário de e-mail, action `requestPasswordReset`.
- `/redefinir-senha/[token]`: formulário de nova senha, action `resetPassword`.
- Modelo de dados: `PasswordResetToken` (`id`, `userId`, `token` único, `expiresAt`, `createdAt`), separado do `VerificationToken` padrão do Auth.js.
- Token gerado com `crypto.randomBytes(32).toString("hex")`, expira em 1 hora, apagado após uso (e qualquer outro token do mesmo usuário, via `$transaction`).
- **Proteção contra enumeração de e-mail:** `requestPasswordReset` sempre redireciona para `/esqueci-senha?sent=1` com a mesma mensagem de sucesso, independentemente de o e-mail existir ou ser conta Google-only. O e-mail só é efetivamente enviado quando existe um `User` com `password` definido para aquele e-mail.
- Envio de e-mail via Resend (`lib/email.ts`, função `sendPasswordResetEmail`). O remetente vem de `EMAIL_FROM`; em produção, usar um domínio verificado no Resend. Falhas de configuração ou envio (`{ error }` retornado pela API do Resend) lançam exceção em vez de falhar silenciosamente.

## E-mails transacionais

Além da recuperação de senha, `lib/email.ts` envia notificações para pontos críticos do MVP:

- novo pedido público: e-mail para o prestador (`ProviderProfile.email` ou, se ausente, `User.email`);
- proposta criada: e-mail para o cliente quando `QuoteRequest.customerEmail` existe;
- proposta aprovada/recusada: e-mail para o prestador (`ProviderProfile.email` ou `User.email`).

Falhas nesses e-mails são registradas no servidor com `console.error`, mas não bloqueiam o fluxo principal de criação de pedido, envio de proposta ou resposta do cliente.

## Arquivos envolvidos

- `auth.ts` — configuração central (providers, sessão, callbacks, erros customizados)
- `lib/actions/auth.ts` — `registerUser`, `loginWithCredentials`, `requestPasswordReset`, `resetPassword`
- `lib/validations/auth.ts` — `registerSchema`, `loginSchema`, `forgotPasswordSchema`, `resetPasswordSchema`
- `lib/email.ts` — wrapper do Resend e templates de e-mails transacionais
- `app/api/auth/[...nextauth]/route.ts`
- `proxy.ts`
- `app/(auth)/layout.tsx` — layout compartilhado (painel decorativo) das 4 páginas de auth
- `app/(auth)/login/page.tsx`
- `app/(auth)/cadastro/page.tsx`
- `app/(auth)/esqueci-senha/page.tsx`
- `app/(auth)/redefinir-senha/[token]/page.tsx`
- `components/auth/AuthButton.tsx`
- `components/auth/GoogleButton.tsx`
- `components/auth/LoginForm.tsx`
- `components/auth/RegisterForm.tsx`
- `components/auth/ForgotPasswordForm.tsx`
- `components/auth/ResetPasswordForm.tsx`
- `components/auth/LogoutButton.tsx`

## Variáveis de ambiente

```env
AUTH_SECRET="segredo-forte"
AUTH_URL="http://localhost:3000"
AUTH_GOOGLE_ID="google-client-id"
AUTH_GOOGLE_SECRET="google-client-secret"
RESEND_API_KEY="re_sua_api_key"
EMAIL_FROM="Vitriny <contato@seu-dominio.com>"
```

Em produção, `AUTH_URL` deve apontar para o domínio real.

## Configuração central

`auth.ts` exporta:

- `handlers`
- `auth`
- `signIn`
- `signOut`

```ts
session: { strategy: "jwt" }
pages: { signIn: "/login" }
providers: [Google, Credentials({ ... })]
```

O adapter usa:

```ts
PrismaAdapter(prisma);
```

`pages.signIn: "/login"` garante que erros OAuth (ex.: `OAuthAccountNotLinked`) caiam na página de login própria do projeto, não na página padrão do Auth.js.

## Rota de autenticação

`app/api/auth/[...nextauth]/route.ts` exporta `GET` e `POST` a partir de `handlers`.

## Proteção do dashboard

`proxy.ts` protege:

```text
/dashboard/:path*
```

As páginas internas também checam `auth()` e redirecionam para `/login` quando não há sessão.

## Testar login/logout

1. Configure Google OAuth (Google Cloud Console) e/ou use e-mail/senha.
2. Rode `npm run dev`.
3. Acesse `/login`.
4. Clique em `Entrar com Google`, ou cadastre-se em `/cadastro` e entre com e-mail/senha.
5. Confirme redirecionamento para `/dashboard`.
6. Clique em `Sair`.

## Produção

No Google Cloud Console (APIs & Services > Credentials):

```text
Authorized redirect URI: https://seu-dominio.com/api/auth/callback/google
```

Cuidados:

- Nunca commitar `.env`.
- Usar `AUTH_SECRET` forte.
- Conferir `AUTH_URL`.
- Conferir o redirect URI do Google.
- Configurar `EMAIL_FROM` com remetente de domínio verificado no Resend.
- Rodar `npx prisma migrate deploy` antes de testar login em produção.

## Observações Auth.js v5

Auth.js v5 usa o padrão `auth.ts` na raiz e exports como `handlers`, `auth`, `signIn`, `signOut`.

Este projeto usa esse padrão, com sessão `jwt` (não `database`) por exigência do Credentials provider customizado.

## Riscos conhecidos

- Sessão JWT não é invalidável manualmente antes de expirar (diferente da sessão em banco usada antes).
- Sem verificação de e-mail no cadastro por senha.
- Sem vínculo automático de conta entre Google e e-mail/senha (decisão deliberada, não falha).
- Sem rate limit nos formulários de auth (mesmo risco já existente nos outros formulários públicos do projeto).
