# Auth: Google OAuth + Cadastro com E-mail/Senha — Design

## Contexto

Hoje o Vitriny só permite login via GitHub OAuth (Auth.js v5 beta + PrismaAdapter, sessão `database`). O objetivo desta etapa é remover o GitHub e oferecer duas novas formas de entrada: Google OAuth e cadastro tradicional com e-mail/senha, incluindo recuperação de senha por e-mail.

Decisão confirmada com o usuário: não há usuários reais cadastrados via GitHub hoje (só dados de teste), então a remoção do GitHub não precisa de plano de migração.

## Objetivo

- Remover GitHub OAuth.
- Adicionar Google OAuth.
- Adicionar cadastro/login com e-mail e senha.
- Adicionar fluxo de "esqueci minha senha" via e-mail (Resend).
- Bloquear e-mails duplicados entre métodos de login diferentes, com mensagem clara.

## Fora de escopo (próximos passos, não implementados agora)

- Verificação de e-mail no cadastro por e-mail/senha.
- Vínculo automático de contas quando o mesmo e-mail é usado em métodos diferentes (Google vs e-mail/senha) — por enquanto bloqueado, sem auto-merge.
- Rate limiting em formulários de autenticação (risco já conhecido do projeto, sem rate limit em nenhum formulário público hoje).

## Decisão de arquitetura: sessão JWT

O Auth.js exige sessão `jwt` quando se usa um Credentials provider customizado — a sessão `database` (atual, via PrismaAdapter) não é compatível com Credentials. O PrismaAdapter continua sendo usado para Google (criação de `User`/`Account` via OAuth), mas a sessão passa a ser `jwt` em vez de `database`.

Trade-off aceito: sessão JWT não pode ser invalidada manualmente antes de expirar (diferente da sessão em banco atual). Aceitável para o estágio atual do produto.

## Mudanças de schema (`prisma/schema.prisma`)

### `User` — novo campo

```prisma
model User {
  // ...campos existentes...
  password String? // hash bcrypt; null para usuários só-OAuth (Google)
}
```

### Novo model `PasswordResetToken`

```prisma
model PasswordResetToken {
  id        String   @id @default(cuid())
  userId    String
  token     String   @unique
  expiresAt DateTime
  createdAt DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

- Token gerado com `crypto.randomBytes(32).toString("hex")`, mesmo padrão usado para `Proposal.publicToken`.
- Expira em 1 hora (`expiresAt = now + 1h`).
- Ao redefinir a senha com sucesso, apagar esse token e quaisquer outros tokens existentes do mesmo usuário.

`VerificationToken` (modelo padrão do Auth.js, hoje sem uso real no fluxo GitHub) não é reaproveitado para isso, para não misturar o conceito de magic-link do Auth.js com o fluxo próprio de reset de senha.

## `auth.ts`

```ts
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";

import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/lib/validations/auth";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  providers: [
    Google,
    Credentials({
      credentials: { email: {}, password: {} },
      authorize: async (credentials) => {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email },
        });

        if (!user?.password) return null;

        const valid = await bcrypt.compare(parsed.data.password, user.password);
        if (!valid) return null;

        return { id: user.id, name: user.name, email: user.email };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) token.sub = user.id;
      return token;
    },
    session({ session, token }) {
      if (session.user) session.user.id = token.sub as string;
      return session;
    },
  },
});
```

GitHub é removido (import e provider). Google segue a mesma convenção de variável de ambiente já usada para GitHub no Auth.js v5 (`AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET`), sem configuração extra de provider.

### Bloqueio de e-mail duplicado entre métodos

- **Lado OAuth (Google tentando logar com e-mail já usado por conta de e-mail/senha):** comportamento padrão do Auth.js — como `allowDangerousEmailAccountLinking` não é habilitado, o Auth.js já bloqueia e redireciona com erro `OAuthAccountNotLinked`. Não precisa de código extra.
- **Lado Credentials (cadastro/login por e-mail/senha com e-mail já usado por conta Google):** tratado nas Server Actions (`registerUser`/`authorize`) — se o `User` existe mas `password` é `null`, retorna erro específico "este e-mail já está cadastrado com Google, entre com Google".

## Dependências novas

```bash
npm install bcryptjs resend
npm install -D @types/bcryptjs
```

## Variáveis de ambiente novas

```env
AUTH_GOOGLE_ID="google-client-id"
AUTH_GOOGLE_SECRET="google-client-secret"
RESEND_API_KEY="re_xxx"
```

Remover do `.env.example`/README: `AUTH_GITHUB_ID`, `AUTH_GITHUB_SECRET`.

## Validações (`lib/validations/auth.ts`)

- `registerSchema`: `name` (obrigatório), `email` (formato válido), `password` (mín. 8 caracteres), `confirmPassword` (deve coincidir).
- `loginSchema`: `email`, `password`.
- `forgotPasswordSchema`: `email`.
- `resetPasswordSchema`: `token`, `password` (mín. 8 caracteres), `confirmPassword`.

## Server Actions (`lib/actions/auth.ts`)

- **`registerUser`**
  1. Valida com `registerSchema`.
  2. Busca `User` por e-mail.
     - Se existir com `password` definido → erro "este e-mail já está cadastrado".
     - Se existir com `password: null` (conta Google) → erro "este e-mail já está cadastrado com Google, entre com Google".
  3. Gera hash bcrypt da senha.
  4. Cria `User` com `password` preenchido.
  5. Chama `signIn("credentials", { email, password, redirectTo: "/dashboard" })`.

- **`requestPasswordReset`**
  1. Valida com `forgotPasswordSchema`.
  2. Busca `User` por e-mail.
  3. Só se existir **e** tiver `password` definido: cria `PasswordResetToken` (expira em 1h) e envia e-mail via `sendPasswordResetEmail`.
  4. Em qualquer outro caso (e-mail não existe, ou é conta só-Google), não revela nada — mesma mensagem genérica de sucesso é exibida no front, para não confirmar quais e-mails existem no sistema.

- **`resetPassword`**
  1. Valida com `resetPasswordSchema`.
  2. Busca `PasswordResetToken` pelo token; se não existir ou `expiresAt` no passado → erro "link inválido ou expirado".
  3. Gera novo hash bcrypt, atualiza `User.password`.
  4. Apaga o token usado e quaisquer outros tokens do mesmo usuário.
  5. Redireciona para `/login?reset=1`.

## E-mail (`lib/email.ts`)

Wrapper simples do Resend:

```ts
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendPasswordResetEmail(to: string, resetUrl: string) {
  await resend.emails.send({
    from: "Vitriny <onboarding@resend.dev>",
    to,
    subject: "Redefinir senha — Vitriny",
    html: `<p>Clique para redefinir sua senha:</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>O link expira em 1 hora.</p>`,
  });
}
```

Remetente `onboarding@resend.dev` (sandbox) por enquanto — só entrega para o e-mail da própria conta Resend. Trocar por domínio verificado antes de produção real com usuários externos.

## Rotas e páginas novas (`app/(auth)/`)

- `app/(auth)/login/page.tsx` — redesenhada: botão "Entrar com Google" + `LoginForm` (e-mail/senha) + links para `/cadastro` e `/esqueci-senha`.
- `app/(auth)/cadastro/page.tsx` — novo: `RegisterForm` (nome, e-mail, senha, confirmar senha) + botão Google.
- `app/(auth)/esqueci-senha/page.tsx` — novo: `ForgotPasswordForm` (e-mail) → chama `requestPasswordReset`.
- `app/(auth)/redefinir-senha/[token]/page.tsx` — novo: `ResetPasswordForm` (nova senha, confirmar) → chama `resetPassword` com o `token` da URL.

Todas seguem o layout split (Tropical Paper) já usado em `/login` hoje.

## Componentes novos (`components/auth/`)

- `GoogleButton.tsx` — substitui o atual `LoginButton.tsx` (GitHub-específico, removido).
- `LoginForm.tsx`
- `RegisterForm.tsx`
- `ForgotPasswordForm.tsx`
- `ResetPasswordForm.tsx`

`AuthButton.tsx` não muda (só depende de `auth()` e `LogoutButton`).

## Critérios de aceite

- Login com Google funciona e cria/atualiza `User`/`Account` via PrismaAdapter.
- Cadastro com e-mail/senha cria `User` com senha hasheada (bcrypt) e loga automaticamente.
- Login com e-mail/senha errado mostra erro genérico (sem revelar se o e-mail existe).
- Tentar cadastrar e-mail já usado por conta Google mostra mensagem específica.
- Tentar logar com Google usando e-mail já cadastrado por senha é bloqueado pelo Auth.js (`OAuthAccountNotLinked`).
- "Esqueci minha senha" sempre mostra a mesma mensagem de sucesso, independentemente de o e-mail existir.
- E-mail de reset só é enviado se existir `User` com `password` definido para aquele e-mail.
- Token de reset expira em 1 hora e é de uso único (apagado após uso).
- Senha nunca é armazenada em texto puro; sempre hash bcrypt.
- GitHub não aparece mais em nenhuma tela de login/cadastro.

## Documentação a atualizar após implementação

- `docs/AUTH.md` — reescrever por completo (Google + Credentials + reset de senha, sessão JWT).
- `README.md` — variáveis de ambiente novas/removidas.
- `docs/AI_HANDOFF.md` — restrições atualizadas ("não usar GitHub OAuth" → "usar Google + credentials").
- `docs/ROADMAP.md` — registrar como concluído; listar como próximo passo: verificação de e-mail e vínculo de contas, se algum dia for necessário.
