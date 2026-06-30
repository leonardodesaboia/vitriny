# Auth: Google OAuth + Cadastro com E-mail/Senha Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remover o login por GitHub e adicionar login com Google OAuth e cadastro/login por e-mail e senha, incluindo recuperação de senha via Resend.

**Architecture:** Auth.js v5 com `PrismaAdapter` continua sendo a base. A sessão passa de `database` para `jwt` (exigência do Credentials provider). `Google` é adicionado como provider OAuth seguindo a mesma convenção de env vars já usada pelo GitHub. Um provider `Credentials` customizado faz `bcrypt.compare` contra um novo campo `User.password`. Reset de senha usa uma tabela própria `PasswordResetToken` (não reaproveita `VerificationToken`) e envia e-mail via Resend.

**Tech Stack:** Next.js 16 App Router, TypeScript, Prisma + PostgreSQL, Auth.js v5 beta, Zod, Tailwind CSS, bcryptjs, Resend.

## Global Constraints

- Sem framework de testes automatizados nesta etapa — verificar com `npm run lint`, `npx tsc`, `npm run build` e `npx prisma validate`, mais teste manual (decisão confirmada com o usuário).
- Dinheiro sempre `Decimal`, nunca `Float` — não se aplica diretamente a esta feature, mas não tocar nos campos monetários existentes.
- Não reaproveitar `VerificationToken` para reset de senha — usar model novo `PasswordResetToken`.
- Sessão JWT (não invalidável manualmente antes de expirar) é o trade-off aceito.
- Sem usuários reais de GitHub a preservar — remoção do provider não precisa de migração de dados.
- `onboarding@resend.dev` (sandbox) é o remetente por enquanto — só entrega para o e-mail da própria conta Resend.
- Token de reset expira em 1 hora e é apagado após uso (e qualquer outro token do mesmo usuário).
- "Esqueci minha senha" sempre mostra a mesma mensagem de sucesso, independentemente de o e-mail existir ou ser conta Google-only (evita enumeração de e-mails).
- E-mail duplicado entre métodos é bloqueado com mensagem clara, nunca vinculado automaticamente.

---

## Task 1: Schema — `User.password` e `PasswordResetToken`

**Files:**

- Modify: `prisma/schema.prisma`
- Create (gerado pelo Prisma CLI): `prisma/migrations/<timestamp>_add_password_auth/migration.sql`

**Interfaces:**

- Produces: `User.password: String?` (hash bcrypt, `null` para contas só-Google); model `PasswordResetToken { id, userId, token (único), expiresAt, createdAt }` com relação `user` para `User` (`onDelete: Cascade`).

- [ ] **Step 1: Adicionar campo `password` ao model `User`**

Em `prisma/schema.prisma`, o model `User` hoje é:

```prisma
model User {
  id            String    @id @default(cuid())
  name          String?
  email         String?   @unique
  emailVerified DateTime?
  image         String?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  providerProfile ProviderProfile?
  accounts        Account[]
  sessions        Session[]
  internalNotes   QuoteRequestInternalNote[]
}
```

Substituir por:

```prisma
model User {
  id            String    @id @default(cuid())
  name          String?
  email         String?   @unique
  emailVerified DateTime?
  image         String?
  password      String?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  providerProfile     ProviderProfile?
  accounts             Account[]
  sessions             Session[]
  internalNotes        QuoteRequestInternalNote[]
  passwordResetTokens  PasswordResetToken[]
}
```

- [ ] **Step 2: Adicionar o model `PasswordResetToken`**

Logo depois do model `VerificationToken` (antes de `model ProviderProfile`), adicionar:

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

- [ ] **Step 3: Garantir que o Postgres local está rodando**

Run: `docker compose up -d`
Expected: container do Postgres sobe (ou já está `Up`).

- [ ] **Step 4: Gerar e aplicar a migration**

Run: `npm run prisma:migrate -- --name add_password_auth`
Expected: saída inclui `Your database is now in sync with your schema.` e um novo diretório `prisma/migrations/<timestamp>_add_password_auth/` é criado contendo `migration.sql` com `ALTER TABLE "User" ADD COLUMN "password" TEXT;` e `CREATE TABLE "PasswordResetToken" (...)`.

- [ ] **Step 5: Gerar o Prisma Client e validar o schema**

Run: `npm run prisma:generate && npx prisma validate`
Expected: `Generated Prisma Client` seguido de `The schema at prisma/schema.prisma is valid 🚀`.

- [ ] **Step 6: Commit**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat(db): add User.password and PasswordResetToken for credentials auth"
```

---

## Task 2: Validações Zod (`lib/validations/auth.ts`)

**Files:**

- Create: `lib/validations/auth.ts`

**Interfaces:**

- Consumes: nada (schemas puros).
- Produces: `registerSchema`, `loginSchema`, `forgotPasswordSchema`, `resetPasswordSchema` (todos `z.ZodObject`, usados via `.safeParse` nas Server Actions da Task 5/6) e os tipos `RegisterInput`, `LoginInput`, `ForgotPasswordInput`, `ResetPasswordInput`.

- [ ] **Step 1: Criar o arquivo de validações**

Criar `lib/validations/auth.ts`:

```ts
import { z } from "zod";

export const registerSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Informe seu nome.")
      .max(120, "Use no máximo 120 caracteres."),
    email: z
      .string()
      .trim()
      .email("Informe um e-mail válido.")
      .max(160, "Use no máximo 160 caracteres."),
    password: z.string().min(8, "Use pelo menos 8 caracteres."),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "As senhas não coincidem.",
    path: ["confirmPassword"],
  });

export const loginSchema = z.object({
  email: z.string().trim().email("Informe um e-mail válido."),
  password: z.string().min(1, "Informe sua senha."),
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email("Informe um e-mail válido."),
});

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1, "Token inválido."),
    password: z.string().min(8, "Use pelo menos 8 caracteres."),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "As senhas não coincidem.",
    path: ["confirmPassword"],
  });

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
```

- [ ] **Step 2: Checar tipos e lint**

Run: `npx tsc && npx eslint lib/validations/auth.ts`
Expected: nenhum erro (sem saída, ou `npx tsc` sem mensagens e eslint sem warnings/erros).

- [ ] **Step 3: Commit**

```bash
git add lib/validations/auth.ts
git commit -m "feat(auth): add zod schemas for register, login and password reset"
```

---

## Task 3: `auth.ts` — Google, Credentials, sessão JWT

**Files:**

- Modify: `auth.ts`
- Modify: `package.json` (nova dependência)
- Modify: `.env`, `.env.example`, `README.md` (env vars)

**Interfaces:**

- Consumes: `loginSchema` de `lib/validations/auth.ts` (Task 2); `prisma` de `lib/prisma.ts`.
- Produces: `auth`, `signIn`, `signOut`, `handlers` (mesma assinatura de hoje, sem mudança de uso externo); provider `"google"` e `"credentials"` disponíveis para `signIn(provider, options)`.

- [ ] **Step 1: Instalar `bcryptjs`**

Run: `npm install bcryptjs && npm install -D @types/bcryptjs`
Expected: `package.json` ganha `"bcryptjs"` em `dependencies` e `"@types/bcryptjs"` em `devDependencies`.

- [ ] **Step 2: Reescrever `auth.ts`**

Substituir todo o conteúdo de `auth.ts` por:

```ts
import NextAuth, { CredentialsSignin } from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";

import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/lib/validations/auth";

class InvalidCredentialsError extends CredentialsSignin {
  code = "invalid-credentials";
}

class GoogleOnlyAccountError extends CredentialsSignin {
  code = "google-account";
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    Google,
    Credentials({
      credentials: {
        email: {},
        password: {},
      },
      authorize: async (credentials) => {
        const parsed = loginSchema.safeParse(credentials);

        if (!parsed.success) {
          throw new InvalidCredentialsError();
        }

        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email },
        });

        if (!user) {
          throw new InvalidCredentialsError();
        }

        if (!user.password) {
          throw new GoogleOnlyAccountError();
        }

        const valid = await bcrypt.compare(parsed.data.password, user.password);

        if (!valid) {
          throw new InvalidCredentialsError();
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
  },
});
```

- [ ] **Step 3: Atualizar variáveis de ambiente**

Em `.env.example`, substituir:

```env
AUTH_GITHUB_ID="seu-github-client-id"
AUTH_GITHUB_SECRET="seu-github-client-secret"
```

por:

```env
AUTH_GOOGLE_ID="seu-google-client-id"
AUTH_GOOGLE_SECRET="seu-google-client-secret"
```

Fazer o mesmo em `.env` (usando valores reais de teste do Google OAuth, ou placeholders se ainda não configurado — o login com Google só funcionará com credenciais reais).

Em `README.md`, na seção `## Variáveis de ambiente`, substituir as duas linhas `AUTH_GITHUB_*` por:

```env
AUTH_GOOGLE_ID="seu-google-client-id"
AUTH_GOOGLE_SECRET="seu-google-client-secret"
```

Substituir também a seção "Callback do GitHub OAuth em desenvolvimento" por:

```text
Callback do Google OAuth em desenvolvimento:

http://localhost:3000/api/auth/callback/google
```

E na seção `## Deploy`, trocar as mesmas duas variáveis e o bloco "Configure o GitHub OAuth App" por:

```text
Configure o Google OAuth Client (Google Cloud Console > APIs & Services > Credentials):

Authorized redirect URI: https://seu-dominio.com/api/auth/callback/google
```

- [ ] **Step 4: Checar tipos**

Run: `npx tsc`
Expected: nenhum erro de tipo (o build completo só roda na Task 8, mas o type-check isolado já deve passar).

- [ ] **Step 5: Commit**

```bash
git add auth.ts package.json package-lock.json .env.example README.md
git commit -m "feat(auth): replace GitHub with Google OAuth and Credentials provider"
```

---

## Task 4: Envio de e-mail (`lib/email.ts`)

**Files:**

- Create: `lib/email.ts`
- Modify: `package.json` (nova dependência)
- Modify: `.env`, `.env.example`, `README.md` (env var `RESEND_API_KEY`)

**Interfaces:**

- Consumes: `process.env.RESEND_API_KEY`.
- Produces: `sendPasswordResetEmail(to: string, resetUrl: string): Promise<void>`, usado pela Task 6.

- [ ] **Step 1: Instalar `resend`**

Run: `npm install resend`
Expected: `package.json` ganha `"resend"` em `dependencies`.

- [ ] **Step 2: Criar o wrapper de e-mail**

Criar `lib/email.ts`:

```ts
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendPasswordResetEmail(to: string, resetUrl: string) {
  await resend.emails.send({
    from: "Vitriny <onboarding@resend.dev>",
    to,
    subject: "Redefinir senha — Vitriny",
    html: `<p>Recebemos um pedido para redefinir sua senha.</p><p><a href="${resetUrl}">Clique aqui para criar uma nova senha</a>.</p><p>O link expira em 1 hora. Se você não pediu isso, ignore este e-mail.</p>`,
  });
}
```

- [ ] **Step 3: Adicionar `RESEND_API_KEY`**

Em `.env.example`, adicionar ao final:

```env
RESEND_API_KEY="re_sua_api_key"
```

Em `.env`, adicionar uma chave real (ou de teste) do Resend.

Em `README.md`, na seção `## Variáveis de ambiente`, adicionar a mesma linha ao bloco de env vars de desenvolvimento e ao bloco de `## Deploy`.

- [ ] **Step 4: Checar tipos**

Run: `npx tsc`
Expected: nenhum erro de tipo.

- [ ] **Step 5: Commit**

```bash
git add lib/email.ts package.json package-lock.json .env.example README.md
git commit -m "feat(auth): add Resend wrapper for password reset emails"
```

---

## Task 5: Server Actions — cadastro e login (`lib/actions/auth.ts`)

**Files:**

- Create: `lib/actions/auth.ts`

**Interfaces:**

- Consumes: `signIn` de `@/auth` (Task 3); `AuthError`, `CredentialsSignin` de `"next-auth"`; `registerSchema`, `loginSchema` de `@/lib/validations/auth` (Task 2); `prisma` de `@/lib/prisma`.
- Produces: `registerUser(formData: FormData): Promise<void>`, `loginWithCredentials(formData: FormData): Promise<void>` — usados como `action` em `<form>` nas Tasks 8 e 9.

- [ ] **Step 1: Criar o arquivo com `registerUser` e `loginWithCredentials`**

Criar `lib/actions/auth.ts`:

```ts
"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { AuthError, CredentialsSignin } from "next-auth";

import { signIn } from "@/auth";
import { prisma } from "@/lib/prisma";
import { registerSchema, loginSchema } from "@/lib/validations/auth";

async function signInWithCredentials(
  email: string,
  password: string,
  errorBasePath: string,
) {
  try {
    await signIn("credentials", {
      email,
      password,
      redirectTo: "/dashboard",
    });
  } catch (error) {
    if (error instanceof CredentialsSignin) {
      redirect(`${errorBasePath}?error=${error.code}`);
    }
    if (error instanceof AuthError) {
      redirect(`${errorBasePath}?error=auth`);
    }
    throw error;
  }
}

export async function registerUser(formData: FormData) {
  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    redirect("/cadastro?error=invalid");
  }

  const existingUser = await prisma.user.findUnique({
    where: { email: parsed.data.email },
    select: { password: true },
  });

  if (existingUser) {
    redirect(
      existingUser.password
        ? "/cadastro?error=email-exists"
        : "/cadastro?error=google-account",
    );
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);

  await prisma.user.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      password: passwordHash,
    },
  });

  await signInWithCredentials(
    parsed.data.email,
    parsed.data.password,
    "/cadastro",
  );
}

export async function loginWithCredentials(formData: FormData) {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    redirect("/login?error=invalid-credentials");
  }

  await signInWithCredentials(
    parsed.data.email,
    parsed.data.password,
    "/login",
  );
}
```

- [ ] **Step 2: Checar tipos e lint**

Run: `npx tsc && npx eslint lib/actions/auth.ts`
Expected: nenhum erro.

- [ ] **Step 3: Commit**

```bash
git add lib/actions/auth.ts
git commit -m "feat(auth): add registerUser and loginWithCredentials server actions"
```

---

## Task 6: Server Actions — recuperação de senha

**Files:**

- Modify: `lib/actions/auth.ts`

**Interfaces:**

- Consumes: `sendPasswordResetEmail` de `@/lib/email` (Task 4); `forgotPasswordSchema`, `resetPasswordSchema` de `@/lib/validations/auth` (Task 2).
- Produces: `requestPasswordReset(formData: FormData): Promise<void>`, `resetPassword(formData: FormData): Promise<void>` — usados nas Tasks 10 e 11.

- [ ] **Step 1: Adicionar os imports necessários**

No topo de `lib/actions/auth.ts`, junto aos imports existentes, adicionar:

```ts
import crypto from "crypto";

import { sendPasswordResetEmail } from "@/lib/email";
import {
  forgotPasswordSchema,
  resetPasswordSchema,
} from "@/lib/validations/auth";
```

(A linha `import { registerSchema, loginSchema } from "@/lib/validations/auth";` da Task 5 passa a importar os quatro juntos: `import { registerSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema } from "@/lib/validations/auth";`.)

- [ ] **Step 2: Adicionar a constante de expiração do token**

Logo abaixo dos imports, antes de `signInWithCredentials`:

```ts
const PASSWORD_RESET_TOKEN_TTL_MS = 60 * 60 * 1000;
```

- [ ] **Step 3: Adicionar `requestPasswordReset` e `resetPassword`**

No final de `lib/actions/auth.ts`, adicionar:

```ts
export async function requestPasswordReset(formData: FormData) {
  const parsed = forgotPasswordSchema.safeParse({
    email: formData.get("email"),
  });

  if (!parsed.success) {
    redirect("/esqueci-senha?error=invalid");
  }

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email },
    select: { id: true, password: true },
  });

  if (user?.password) {
    const token = crypto.randomBytes(32).toString("hex");

    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        token,
        expiresAt: new Date(Date.now() + PASSWORD_RESET_TOKEN_TTL_MS),
      },
    });

    await sendPasswordResetEmail(
      parsed.data.email,
      `${process.env.AUTH_URL}/redefinir-senha/${token}`,
    );
  }

  redirect("/esqueci-senha?sent=1");
}

export async function resetPassword(formData: FormData) {
  const parsed = resetPasswordSchema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    const token = String(formData.get("token") ?? "");
    redirect(`/redefinir-senha/${token}?error=invalid`);
  }

  const resetToken = await prisma.passwordResetToken.findUnique({
    where: { token: parsed.data.token },
  });

  if (!resetToken || resetToken.expiresAt < new Date()) {
    redirect("/esqueci-senha?error=expired");
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: resetToken.userId },
      data: { password: passwordHash },
    }),
    prisma.passwordResetToken.deleteMany({
      where: { userId: resetToken.userId },
    }),
  ]);

  redirect("/login?reset=1");
}
```

- [ ] **Step 4: Checar tipos e lint**

Run: `npx tsc && npx eslint lib/actions/auth.ts`
Expected: nenhum erro.

- [ ] **Step 5: Commit**

```bash
git add lib/actions/auth.ts
git commit -m "feat(auth): add requestPasswordReset and resetPassword server actions"
```

---

## Task 7: Layout compartilhado de autenticação

**Files:**

- Create: `app/(auth)/layout.tsx`
- Modify: `app/(auth)/login/page.tsx`

**Interfaces:**

- Produces: `AuthLayout({ children }: { children: ReactNode })` — usado automaticamente pelo App Router para todas as páginas dentro de `app/(auth)/` (login, cadastro, esqueci-senha, redefinir-senha).

- [ ] **Step 1: Criar o layout compartilhado**

Criar `app/(auth)/layout.tsx` com o painel decorativo hoje embutido em `login/page.tsx`:

```tsx
import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-screen text-ink">
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-leaf p-12 lg:flex">
        <p className="font-fraunces text-2xl font-semibold text-white">
          Vitriny
        </p>

        <div
          className="pointer-events-none absolute -bottom-32 -left-32 h-96 w-96 rounded-full opacity-20"
          style={{
            background: "radial-gradient(circle, #D4EBD9, transparent 70%)",
          }}
        />
        <div
          className="pointer-events-none absolute -right-20 top-20 h-64 w-64 rounded-full opacity-15"
          style={{
            background: "radial-gradient(circle, #F5E6D3, transparent 70%)",
          }}
        />

        <blockquote>
          <p className="font-fraunces text-2xl font-medium leading-snug text-white/90">
            &ldquo;Transforme pedidos soltos em propostas profissionais.&rdquo;
          </p>
          <p className="mt-4 text-sm font-medium text-white/60">
            Feito para prestadores de serviço
          </p>
        </blockquote>
      </div>

      <div className="flex flex-1 items-center justify-center bg-paper px-6 py-16">
        <div className="w-full max-w-sm">{children}</div>
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Simplificar `app/(auth)/login/page.tsx` para usar o layout**

Substituir o conteúdo de `app/(auth)/login/page.tsx` por uma versão temporária (será completada na Task 8) que só remove a casca duplicada:

```tsx
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { LoginButton } from "@/components/auth/LoginButton";

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <>
      <p className="font-fraunces text-3xl font-bold text-ink">Entrar</p>
      <p className="mt-3 text-sm leading-6 text-ink-muted">
        Use sua conta do GitHub para acessar o painel do prestador.
      </p>
      <LoginButton className="mt-8 inline-flex min-h-11 w-full items-center justify-center gap-3 rounded-md bg-ink px-5 text-sm font-semibold text-white transition hover:bg-ink/80" />
      <p className="mt-6 text-center text-xs text-ink-muted">
        Ao entrar, você concorda com os termos de uso.
      </p>
    </>
  );
}
```

(Esse conteúdo de `LoginButton`/GitHub é só transitório — a Task 8 substitui por `GoogleButton` + `LoginForm`. O objetivo desta task é isolar a mudança estrutural do layout da mudança de conteúdo do formulário.)

- [ ] **Step 3: Checar tipos, lint e visual**

Run: `npx tsc && npx eslint "app/(auth)/**/*.tsx"`
Expected: nenhum erro.

Run: `npm run dev`, acessar `http://localhost:3000/login`.
Expected: página renderiza igual a antes (painel verde decorativo à esquerda, formulário à direita) — a extração para o layout não deve mudar o visual.

- [ ] **Step 4: Commit**

```bash
git add "app/(auth)/layout.tsx" "app/(auth)/login/page.tsx"
git commit -m "refactor(auth): extract shared split layout for auth pages"
```

---

## Task 8: Página de login (Google + e-mail/senha)

**Files:**

- Create: `components/auth/GoogleButton.tsx`
- Create: `components/auth/LoginForm.tsx`
- Modify: `app/(auth)/login/page.tsx`
- Delete: `components/auth/LoginButton.tsx`

**Interfaces:**

- Consumes: `loginWithCredentials` de `@/lib/actions/auth` (Task 5); `signIn` de `@/auth` (Task 3).
- Produces: `GoogleButton({ className }: { className?: string })`, `LoginForm({ errorCode }: { errorCode?: string })` — reaproveitados pela Task 9 (cadastro usa `GoogleButton` também).

- [ ] **Step 1: Criar `GoogleButton`**

Criar `components/auth/GoogleButton.tsx`:

```tsx
import { signIn } from "@/auth";

type GoogleButtonProps = {
  className?: string;
};

export function GoogleButton({ className }: GoogleButtonProps) {
  return (
    <form
      action={async () => {
        "use server";
        await signIn("google", { redirectTo: "/dashboard" });
      }}
    >
      <button className={className} type="submit">
        Entrar com Google
      </button>
    </form>
  );
}
```

- [ ] **Step 2: Criar `LoginForm`**

Criar `components/auth/LoginForm.tsx`:

```tsx
import { loginWithCredentials } from "@/lib/actions/auth";

type LoginFormProps = {
  errorCode?: string;
};

const inputClass =
  "min-h-11 w-full rounded-lg border border-paper-soft bg-white px-3 text-sm text-ink outline-none ring-offset-paper transition focus:border-leaf focus:ring-2 focus:ring-leaf/20";

const labelClass =
  "text-xs font-semibold uppercase tracking-widest text-ink-muted";

const errorMessages: Record<string, string> = {
  "invalid-credentials": "E-mail ou senha incorretos.",
  "google-account": "Este e-mail está cadastrado com Google. Entre com Google.",
  OAuthAccountNotLinked:
    "Este e-mail já está cadastrado com outro método de login.",
  auth: "Não foi possível entrar. Tente novamente.",
};

export function LoginForm({ errorCode }: LoginFormProps) {
  return (
    <form action={loginWithCredentials} className="mt-6 grid gap-4">
      {errorCode ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3">
          <p className="text-sm font-semibold text-red-700">
            {errorMessages[errorCode] ??
              "Não foi possível entrar. Tente novamente."}
          </p>
        </div>
      ) : null}

      <div className="grid gap-2">
        <label className={labelClass} htmlFor="email">
          E-mail
        </label>
        <input
          className={inputClass}
          id="email"
          name="email"
          placeholder="seu@email.com"
          required
          type="email"
        />
      </div>

      <div className="grid gap-2">
        <label className={labelClass} htmlFor="password">
          Senha
        </label>
        <input
          className={inputClass}
          id="password"
          name="password"
          placeholder="••••••••"
          required
          type="password"
        />
      </div>

      <button
        className="mt-2 inline-flex min-h-11 w-full items-center justify-center rounded-md bg-ink px-5 text-sm font-semibold text-white transition hover:bg-ink/80"
        type="submit"
      >
        Entrar
      </button>
    </form>
  );
}
```

- [ ] **Step 3: Reescrever a página de login**

Substituir `app/(auth)/login/page.tsx` por:

```tsx
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { GoogleButton } from "@/components/auth/GoogleButton";
import { LoginForm } from "@/components/auth/LoginForm";

type LoginPageProps = {
  searchParams: Promise<{ error?: string; reset?: string }>;
};

const googleButtonClassName =
  "mt-8 inline-flex min-h-11 w-full items-center justify-center gap-3 rounded-md border border-stone-300 px-5 text-sm font-semibold text-ink transition hover:border-leaf hover:text-leaf";

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const session = await auth();
  if (session?.user) {
    redirect("/dashboard");
  }

  const query = await searchParams;

  return (
    <>
      <p className="font-fraunces text-3xl font-bold text-ink">Entrar</p>
      <p className="mt-3 text-sm leading-6 text-ink-muted">
        Acesse o painel do prestador.
      </p>

      {query.reset ? (
        <div className="mt-6 rounded-lg border border-mint bg-mint/40 px-4 py-3">
          <p className="text-sm font-semibold text-leaf">
            Senha redefinida. Entre com sua nova senha.
          </p>
        </div>
      ) : null}

      <GoogleButton className={googleButtonClassName} />

      <div className="mt-6 flex items-center gap-3 text-xs uppercase tracking-widest text-ink-muted">
        <span className="h-px flex-1 bg-paper-soft" />
        ou
        <span className="h-px flex-1 bg-paper-soft" />
      </div>

      <LoginForm errorCode={query.error} />

      <p className="mt-6 text-center text-xs text-ink-muted">
        Não tem conta?{" "}
        <Link
          className="font-semibold text-leaf hover:text-leaf-hover"
          href="/cadastro"
        >
          Cadastre-se
        </Link>
      </p>
      <p className="mt-2 text-center text-xs text-ink-muted">
        <Link
          className="font-semibold text-leaf hover:text-leaf-hover"
          href="/esqueci-senha"
        >
          Esqueci minha senha
        </Link>
      </p>
    </>
  );
}
```

- [ ] **Step 4: Remover `LoginButton` (GitHub)**

Apagar o arquivo `components/auth/LoginButton.tsx`.

Run: `grep -rn "LoginButton" --include="*.tsx" --include="*.ts" .`
Expected: nenhuma ocorrência (confirma que nada mais importa `LoginButton`).

- [ ] **Step 5: Checar tipos, lint e testar manualmente**

Run: `npx tsc && npm run lint`
Expected: nenhum erro.

Run: `npm run dev`, acessar `http://localhost:3000/login`.
Expected:

- Botão "Entrar com Google" aparece.
- Formulário de e-mail/senha aparece abaixo do separador "ou".
- Tentar logar com e-mail/senha errados redireciona para `/login?error=invalid-credentials` e mostra "E-mail ou senha incorretos.".
- Links para "Cadastre-se" e "Esqueci minha senha" funcionam (vão dar 404 até as Tasks 9–11).

- [ ] **Step 6: Commit**

```bash
git add components/auth/GoogleButton.tsx components/auth/LoginForm.tsx "app/(auth)/login/page.tsx"
git rm components/auth/LoginButton.tsx
git commit -m "feat(auth): redesign login page with Google and email/password"
```

---

## Task 9: Página de cadastro

**Files:**

- Create: `components/auth/RegisterForm.tsx`
- Create: `app/(auth)/cadastro/page.tsx`

**Interfaces:**

- Consumes: `registerUser` de `@/lib/actions/auth` (Task 5); `GoogleButton` de `@/components/auth/GoogleButton` (Task 8).
- Produces: rota pública `/cadastro`.

- [ ] **Step 1: Criar `RegisterForm`**

Criar `components/auth/RegisterForm.tsx`:

```tsx
import { registerUser } from "@/lib/actions/auth";

type RegisterFormProps = {
  errorCode?: string;
};

const inputClass =
  "min-h-11 w-full rounded-lg border border-paper-soft bg-white px-3 text-sm text-ink outline-none ring-offset-paper transition focus:border-leaf focus:ring-2 focus:ring-leaf/20";

const labelClass =
  "text-xs font-semibold uppercase tracking-widest text-ink-muted";

const errorMessages: Record<string, string> = {
  invalid: "Revise os dados informados.",
  "email-exists": "Este e-mail já está cadastrado.",
  "google-account":
    "Este e-mail já está cadastrado com Google. Entre com Google.",
};

export function RegisterForm({ errorCode }: RegisterFormProps) {
  return (
    <form action={registerUser} className="mt-6 grid gap-4">
      {errorCode ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3">
          <p className="text-sm font-semibold text-red-700">
            {errorMessages[errorCode] ?? "Não foi possível criar a conta."}
          </p>
        </div>
      ) : null}

      <div className="grid gap-2">
        <label className={labelClass} htmlFor="name">
          Nome
        </label>
        <input
          className={inputClass}
          id="name"
          name="name"
          placeholder="Seu nome completo"
          required
          type="text"
        />
      </div>

      <div className="grid gap-2">
        <label className={labelClass} htmlFor="email">
          E-mail
        </label>
        <input
          className={inputClass}
          id="email"
          name="email"
          placeholder="seu@email.com"
          required
          type="email"
        />
      </div>

      <div className="grid gap-2">
        <label className={labelClass} htmlFor="password">
          Senha
        </label>
        <input
          className={inputClass}
          id="password"
          minLength={8}
          name="password"
          placeholder="Pelo menos 8 caracteres"
          required
          type="password"
        />
      </div>

      <div className="grid gap-2">
        <label className={labelClass} htmlFor="confirmPassword">
          Confirmar senha
        </label>
        <input
          className={inputClass}
          id="confirmPassword"
          minLength={8}
          name="confirmPassword"
          placeholder="Repita a senha"
          required
          type="password"
        />
      </div>

      <button
        className="mt-2 inline-flex min-h-11 w-full items-center justify-center rounded-md bg-ink px-5 text-sm font-semibold text-white transition hover:bg-ink/80"
        type="submit"
      >
        Criar conta
      </button>
    </form>
  );
}
```

- [ ] **Step 2: Criar a página de cadastro**

Criar `app/(auth)/cadastro/page.tsx`:

```tsx
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { GoogleButton } from "@/components/auth/GoogleButton";
import { RegisterForm } from "@/components/auth/RegisterForm";

type RegisterPageProps = {
  searchParams: Promise<{ error?: string }>;
};

const googleButtonClassName =
  "mt-8 inline-flex min-h-11 w-full items-center justify-center gap-3 rounded-md border border-stone-300 px-5 text-sm font-semibold text-ink transition hover:border-leaf hover:text-leaf";

export default async function RegisterPage({
  searchParams,
}: RegisterPageProps) {
  const session = await auth();
  if (session?.user) {
    redirect("/dashboard");
  }

  const query = await searchParams;

  return (
    <>
      <p className="font-fraunces text-3xl font-bold text-ink">Criar conta</p>
      <p className="mt-3 text-sm leading-6 text-ink-muted">
        Cadastre-se para criar seu perfil de prestador.
      </p>

      <GoogleButton className={googleButtonClassName} />

      <div className="mt-6 flex items-center gap-3 text-xs uppercase tracking-widest text-ink-muted">
        <span className="h-px flex-1 bg-paper-soft" />
        ou
        <span className="h-px flex-1 bg-paper-soft" />
      </div>

      <RegisterForm errorCode={query.error} />

      <p className="mt-6 text-center text-xs text-ink-muted">
        Já tem conta?{" "}
        <Link
          className="font-semibold text-leaf hover:text-leaf-hover"
          href="/login"
        >
          Entrar
        </Link>
      </p>
    </>
  );
}
```

- [ ] **Step 3: Checar tipos, lint e testar manualmente**

Run: `npx tsc && npm run lint`
Expected: nenhum erro.

Run: `npm run dev`, acessar `http://localhost:3000/cadastro`.
Expected:

- Cadastrar com nome/e-mail/senha novos cria o usuário e redireciona para `/dashboard` já logado.
- Cadastrar de novo com o mesmo e-mail mostra "Este e-mail já está cadastrado.".
- Senhas que não coincidem mostram `?error=invalid` → "Revise os dados informados.".

- [ ] **Step 4: Commit**

```bash
git add components/auth/RegisterForm.tsx "app/(auth)/cadastro/page.tsx"
git commit -m "feat(auth): add registration page with email/password"
```

---

## Task 10: Página "esqueci minha senha"

**Files:**

- Create: `components/auth/ForgotPasswordForm.tsx`
- Create: `app/(auth)/esqueci-senha/page.tsx`

**Interfaces:**

- Consumes: `requestPasswordReset` de `@/lib/actions/auth` (Task 6).
- Produces: rota pública `/esqueci-senha`.

- [ ] **Step 1: Criar `ForgotPasswordForm`**

Criar `components/auth/ForgotPasswordForm.tsx`:

```tsx
import { requestPasswordReset } from "@/lib/actions/auth";

type ForgotPasswordFormProps = {
  errorCode?: string;
};

const inputClass =
  "min-h-11 w-full rounded-lg border border-paper-soft bg-white px-3 text-sm text-ink outline-none ring-offset-paper transition focus:border-leaf focus:ring-2 focus:ring-leaf/20";

const labelClass =
  "text-xs font-semibold uppercase tracking-widest text-ink-muted";

const errorMessages: Record<string, string> = {
  invalid: "Informe um e-mail válido.",
};

export function ForgotPasswordForm({ errorCode }: ForgotPasswordFormProps) {
  return (
    <form action={requestPasswordReset} className="mt-6 grid gap-4">
      {errorCode ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3">
          <p className="text-sm font-semibold text-red-700">
            {errorMessages[errorCode] ?? "Não foi possível processar o pedido."}
          </p>
        </div>
      ) : null}

      <div className="grid gap-2">
        <label className={labelClass} htmlFor="email">
          E-mail
        </label>
        <input
          className={inputClass}
          id="email"
          name="email"
          placeholder="seu@email.com"
          required
          type="email"
        />
      </div>

      <button
        className="mt-2 inline-flex min-h-11 w-full items-center justify-center rounded-md bg-ink px-5 text-sm font-semibold text-white transition hover:bg-ink/80"
        type="submit"
      >
        Enviar link de redefinição
      </button>
    </form>
  );
}
```

- [ ] **Step 2: Criar a página**

Criar `app/(auth)/esqueci-senha/page.tsx`:

```tsx
import Link from "next/link";

import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";

type ForgotPasswordPageProps = {
  searchParams: Promise<{ error?: string; sent?: string }>;
};

export default async function ForgotPasswordPage({
  searchParams,
}: ForgotPasswordPageProps) {
  const query = await searchParams;

  return (
    <>
      <p className="font-fraunces text-3xl font-bold text-ink">
        Esqueci minha senha
      </p>
      <p className="mt-3 text-sm leading-6 text-ink-muted">
        Informe seu e-mail para receber um link de redefinição de senha.
      </p>

      {query.sent ? (
        <div className="mt-6 rounded-lg border border-mint bg-mint/40 px-4 py-3">
          <p className="text-sm font-semibold text-leaf">
            Se esse e-mail estiver cadastrado com senha, você vai receber um
            link em instantes.
          </p>
        </div>
      ) : (
        <ForgotPasswordForm errorCode={query.error} />
      )}

      <p className="mt-6 text-center text-xs text-ink-muted">
        <Link
          className="font-semibold text-leaf hover:text-leaf-hover"
          href="/login"
        >
          Voltar para o login
        </Link>
      </p>
    </>
  );
}
```

- [ ] **Step 3: Checar tipos, lint e testar manualmente**

Run: `npx tsc && npm run lint`
Expected: nenhum erro.

Run: `npm run dev`, acessar `http://localhost:3000/esqueci-senha`.
Expected:

- Enviar um e-mail cadastrado com senha mostra a mensagem de sucesso e (com `RESEND_API_KEY` configurada) chega um e-mail real.
- Enviar um e-mail que não existe, ou que é conta Google-only, mostra a mesma mensagem de sucesso (sem diferenciação visível).
- Enviar e-mail em formato inválido mostra "Informe um e-mail válido.".

- [ ] **Step 4: Commit**

```bash
git add components/auth/ForgotPasswordForm.tsx "app/(auth)/esqueci-senha/page.tsx"
git commit -m "feat(auth): add forgot password page"
```

---

## Task 11: Página "redefinir senha"

**Files:**

- Create: `components/auth/ResetPasswordForm.tsx`
- Create: `app/(auth)/redefinir-senha/[token]/page.tsx`

**Interfaces:**

- Consumes: `resetPassword` de `@/lib/actions/auth` (Task 6); `prisma` de `@/lib/prisma`.
- Produces: rota pública `/redefinir-senha/[token]`.

- [ ] **Step 1: Criar `ResetPasswordForm`**

Criar `components/auth/ResetPasswordForm.tsx`:

```tsx
import { resetPassword } from "@/lib/actions/auth";

type ResetPasswordFormProps = {
  token: string;
  errorCode?: string;
};

const inputClass =
  "min-h-11 w-full rounded-lg border border-paper-soft bg-white px-3 text-sm text-ink outline-none ring-offset-paper transition focus:border-leaf focus:ring-2 focus:ring-leaf/20";

const labelClass =
  "text-xs font-semibold uppercase tracking-widest text-ink-muted";

const errorMessages: Record<string, string> = {
  invalid: "Revise a senha informada.",
};

export function ResetPasswordForm({
  token,
  errorCode,
}: ResetPasswordFormProps) {
  return (
    <form action={resetPassword} className="mt-6 grid gap-4">
      <input name="token" type="hidden" value={token} />

      {errorCode ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3">
          <p className="text-sm font-semibold text-red-700">
            {errorMessages[errorCode] ?? "Não foi possível redefinir a senha."}
          </p>
        </div>
      ) : null}

      <div className="grid gap-2">
        <label className={labelClass} htmlFor="password">
          Nova senha
        </label>
        <input
          className={inputClass}
          id="password"
          minLength={8}
          name="password"
          placeholder="Pelo menos 8 caracteres"
          required
          type="password"
        />
      </div>

      <div className="grid gap-2">
        <label className={labelClass} htmlFor="confirmPassword">
          Confirmar nova senha
        </label>
        <input
          className={inputClass}
          id="confirmPassword"
          minLength={8}
          name="confirmPassword"
          placeholder="Repita a senha"
          required
          type="password"
        />
      </div>

      <button
        className="mt-2 inline-flex min-h-11 w-full items-center justify-center rounded-md bg-ink px-5 text-sm font-semibold text-white transition hover:bg-ink/80"
        type="submit"
      >
        Redefinir senha
      </button>
    </form>
  );
}
```

- [ ] **Step 2: Criar a página**

Criar `app/(auth)/redefinir-senha/[token]/page.tsx`:

```tsx
import Link from "next/link";

import { prisma } from "@/lib/prisma";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";

type ResetPasswordPageProps = {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ error?: string }>;
};

export default async function ResetPasswordPage({
  params,
  searchParams,
}: ResetPasswordPageProps) {
  const { token } = await params;
  const query = await searchParams;

  const resetToken = await prisma.passwordResetToken.findUnique({
    where: { token },
    select: { expiresAt: true },
  });

  const isValid = !!resetToken && resetToken.expiresAt > new Date();

  return (
    <>
      <p className="font-fraunces text-3xl font-bold text-ink">
        Redefinir senha
      </p>

      {isValid ? (
        <>
          <p className="mt-3 text-sm leading-6 text-ink-muted">
            Escolha uma nova senha para sua conta.
          </p>
          <ResetPasswordForm errorCode={query.error} token={token} />
        </>
      ) : (
        <>
          <p className="mt-3 text-sm leading-6 text-ink-muted">
            Este link é inválido ou já expirou.
          </p>
          <Link
            className="mt-6 inline-flex min-h-11 items-center justify-center rounded-md bg-ink px-5 text-sm font-semibold text-white transition hover:bg-ink/80"
            href="/esqueci-senha"
          >
            Solicitar novo link
          </Link>
        </>
      )}
    </>
  );
}
```

- [ ] **Step 3: Checar tipos, lint e testar manualmente**

Run: `npx tsc && npm run lint`
Expected: nenhum erro.

Run: `npm run dev`. Solicitar reset em `/esqueci-senha`, copiar o link do e-mail recebido (ou ler o token direto no Prisma Studio com `npm run prisma:studio` se o e-mail não chegar), acessar `/redefinir-senha/[token]`.
Expected:

- Token válido mostra o formulário de nova senha.
- Definir nova senha redireciona para `/login?reset=1` e o login antigo deixa de funcionar; o novo funciona.
- Acessar `/redefinir-senha/token-invalido-qualquer` mostra "Este link é inválido ou já expirou." com botão para solicitar novo link.
- Reusar o mesmo link depois de já ter sido usado uma vez também mostra a mensagem de inválido/expirado (token foi apagado).

- [ ] **Step 4: Commit**

```bash
git add components/auth/ResetPasswordForm.tsx "app/(auth)/redefinir-senha"
git commit -m "feat(auth): add reset password page"
```

---

## Task 12: Verificação completa e teste manual do fluxo

**Files:**

- Nenhum arquivo novo — task de verificação.

- [ ] **Step 1: Lint completo**

Run: `npm run lint`
Expected: sem erros.

- [ ] **Step 2: Type-check completo**

Run: `npx tsc`
Expected: sem erros.

- [ ] **Step 3: Build de produção**

Run: `npm run build`
Expected: build conclui sem erros (`Compiled successfully`).

- [ ] **Step 4: Validação do schema Prisma**

Run: `npx prisma validate`
Expected: `The schema at prisma/schema.prisma is valid 🚀`.

- [ ] **Step 5: Teste manual completo (seguindo o padrão de `docs/MVP_FLOW.md`)**

Com `npm run dev` rodando, validar cada item:

1. `/login` não mostra mais nada de GitHub — só Google e e-mail/senha.
2. Cadastro novo em `/cadastro` cria conta e loga automaticamente em `/dashboard`.
3. Logout (`/dashboard` → "Sair") e login de novo em `/login` com o mesmo e-mail/senha funciona.
4. Tentar logar com senha errada mostra "E-mail ou senha incorretos.".
5. Tentar cadastrar com e-mail já usado mostra "Este e-mail já está cadastrado.".
6. Login com Google (precisa de `AUTH_GOOGLE_ID`/`AUTH_GOOGLE_SECRET` reais configurados) cria/loga o usuário normalmente.
7. Login com Google usando um e-mail que já tem conta por senha é bloqueado e cai de volta em `/login` com uma mensagem de erro (não numa página feia do Auth.js).
8. Fluxo completo de "esqueci minha senha" → reset → login com a senha nova.
9. O resto do MVP (perfil, serviços, pedidos, propostas) continua funcionando normalmente após a troca de sessão para JWT — repetir rapidamente os passos 3–13 de `docs/MVP_FLOW.md`.

- [ ] **Step 6: Commit (se necessário, só para fechar a etapa)**

Se todos os passos acima passarem sem precisar de nenhum ajuste de código, não há nada para commitar nesta task — ela é só verificação. Se algum ajuste for necessário, comitar como um fix pontual antes de seguir para a Task 13.

---

## Task 13: Atualizar documentação

**Files:**

- Modify: `docs/AUTH.md`
- Modify: `docs/AI_HANDOFF.md`
- Modify: `docs/ROADMAP.md`

**Interfaces:** nenhuma — task de documentação.

- [ ] **Step 1: Reescrever `docs/AUTH.md`**

Substituir o conteúdo de `docs/AUTH.md` para refletir Google + Credentials + reset de senha + sessão JWT, seguindo a mesma estrutura de seções que o arquivo já usa hoje (Como funciona, Provider(s), Arquivos envolvidos, Variáveis de ambiente, Configuração central, Proteção do dashboard, Testar login/logout, Produção, Observações).

Pontos que precisam aparecer no texto novo:

- Providers: Google (OAuth) e Credentials (e-mail/senha).
- Sessão `jwt` (não mais `database`), e por quê (exigência do Credentials provider).
- Campo `User.password` (hash bcrypt, `null` para contas Google).
- Model `PasswordResetToken`, expiração de 1 hora, uso único.
- Rotas novas: `/cadastro`, `/esqueci-senha`, `/redefinir-senha/[token]`.
- Bloqueio de e-mail duplicado entre métodos (`OAuthAccountNotLinked` do lado Google; erro customizado do lado Credentials).
- Variáveis de ambiente: remover `AUTH_GITHUB_ID`/`AUTH_GITHUB_SECRET`, adicionar `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `RESEND_API_KEY`.
- Observação sobre `onboarding@resend.dev` ser sandbox.

- [ ] **Step 2: Atualizar `docs/AI_HANDOFF.md`**

Nas seções "Restrições importantes" e "Cuidados para não quebrar", trocar qualquer menção a GitHub/login único por:

- Login: Google OAuth + e-mail/senha (sem GitHub).
- Sessão é `jwt`, não `database`.
- Senha sempre hash bcrypt, nunca texto puro.
- Reset de senha não revela se o e-mail existe.

- [ ] **Step 3: Atualizar `docs/ROADMAP.md`**

Mover "Login com Google e cadastro por e-mail/senha" para a seção `## Concluído`. Se fizer sentido, adicionar em "Melhorias de curto prazo": "Verificação de e-mail no cadastro" e "Vínculo de contas entre métodos de login diferentes" como itens futuros (não implementados nesta etapa).

- [ ] **Step 4: Commit**

```bash
git add docs/AUTH.md docs/AI_HANDOFF.md docs/ROADMAP.md
git commit -m "docs: update auth docs for Google OAuth and email/password login"
```
