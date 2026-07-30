"use server";

import crypto from "crypto";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { after } from "next/server";
import { AuthError, CredentialsSignin } from "next-auth";
import { Prisma } from "@prisma/client";

import { signIn } from "@/auth";
import {
  createEmailVerificationToken,
  getEmailVerificationUrl,
  hashEmailVerificationToken,
  PENDING_VERIFICATION_EMAIL_COOKIE,
  PENDING_VERIFICATION_EMAIL_MAX_AGE,
} from "@/lib/auth/email-verification";
import { hashToken } from "@/lib/auth/tokens";
import { prisma } from "@/lib/prisma";
import {
  sendEmailVerificationEmail,
  sendPasswordResetEmail,
} from "@/lib/email";
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verificationTokenSchema,
} from "@/lib/validations/auth";

const PASSWORD_RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

// Estado retornado pelos forms de auth via `useActionState`. Em vez de
// `redirect(?error=)` — que recarrega a página e apaga o que foi digitado —, o
// erro volta como estado: mensagem por campo + valores para repovoar os inputs.
// A senha NUNCA é ecoada de volta.
export type AuthFormState = {
  error?: string;
  fieldErrors?: Partial<Record<string, string>>;
  values?: { name?: string; email?: string };
};

function toFieldErrors(
  error: import("zod").ZodError,
): Partial<Record<string, string>> {
  const flattened = error.flatten().fieldErrors as Record<
    string,
    string[] | undefined
  >;
  const result: Record<string, string> = {};
  for (const [field, messages] of Object.entries(flattened)) {
    const first = messages?.[0];
    if (first) result[field] = first;
  }
  return result;
}

function asString(value: FormDataEntryValue | null): string | undefined {
  return typeof value === "string" ? value : undefined;
}

async function rememberPendingVerificationEmail(email: string) {
  const cookieStore = await cookies();
  cookieStore.set(PENDING_VERIFICATION_EMAIL_COOKIE, email, {
    httpOnly: true,
    maxAge: PENDING_VERIFICATION_EMAIL_MAX_AGE,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}


export async function registerUser(
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const name = asString(formData.get("name"));
  const email = asString(formData.get("email"));
  const values = { name, email };

  const parsed = registerSchema.safeParse({
    name,
    email,
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword")
  });

  if (!parsed.success) {
    return { fieldErrors: toFieldErrors(parsed.error), values };
  }

  const existingUser = await prisma.user.findUnique({
    where: { email: parsed.data.email },
    select: { password: true }
  });

  if (existingUser) {
    return { error: "email-exists", values };
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  const verification = createEmailVerificationToken();
  let user: { id: string; email: string | null };

  try {
    user = await prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          name: parsed.data.name,
          email: parsed.data.email,
          emailVerified: null,
          password: passwordHash,
        },
      });

      await tx.emailVerificationToken.create({
        data: {
          userId: createdUser.id,
          tokenHash: verification.tokenHash,
          expiresAt: verification.expiresAt,
        },
      });

      return createdUser;
    });
  } catch (error) {
    // Corrida com outro cadastro do mesmo e-mail entre o find e o create.
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return { error: "email-exists", values };
    }
    throw error;
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.AUTH_URL ?? "";
  await rememberPendingVerificationEmail(user.email ?? parsed.data.email);

  try {
    await sendEmailVerificationEmail(
      user.email ?? parsed.data.email,
      getEmailVerificationUrl(appUrl, verification.token),
    );
  } catch (error) {
    console.error("Falha ao enviar e-mail de confirmação de cadastro.", {
      error,
      userId: user.id,
    });
    redirect("/verifique-seu-email?error=delivery");
  }

  redirect("/verifique-seu-email?sent=1");
}

export async function loginWithCredentials(
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = asString(formData.get("email"));
  const parsed = loginSchema.safeParse({
    email,
    password: formData.get("password")
  });

  if (!parsed.success) {
    return { fieldErrors: toFieldErrors(parsed.error), values: { email } };
  }

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: "/dashboard"
    });
  } catch (error) {
    // Sucesso: signIn lança NEXT_REDIRECT, que cai no `throw` e redireciona.
    if (error instanceof CredentialsSignin) {
      return { error: error.code, values: { email } };
    }
    if (error instanceof AuthError) {
      return { error: "auth", values: { email } };
    }
    throw error;
  }

  return {};
}

export async function requestPasswordReset(
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = asString(formData.get("email"));
  const parsed = forgotPasswordSchema.safeParse({ email });

  if (!parsed.success) {
    return { fieldErrors: toFieldErrors(parsed.error), values: { email } };
  }

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email },
    select: { id: true, password: true, emailVerified: true }
  });

  if (user?.password && user.emailVerified) {
    const token = crypto.randomBytes(32).toString("hex");

    await prisma.$transaction([
      prisma.passwordResetToken.deleteMany({ where: { userId: user.id } }),
      prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          // Só o hash vai ao banco; o token puro vive apenas no link enviado.
          tokenHash: hashToken(token),
          expiresAt: new Date(Date.now() + PASSWORD_RESET_TOKEN_TTL_MS)
        }
      })
    ]);

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.AUTH_URL ?? "";
    const resetUrl = `${appUrl.replace(/\/$/, "")}/redefinir-senha/${token}`;

    // Envio fora do caminho de resposta: iguala o tempo de resposta entre conta
    // existente e inexistente (não enumera por timing) e não trava a UI. A
    // resposta é idêntica em todos os casos; falha de envio nunca vira erro visível.
    after(async () => {
      try {
        await sendPasswordResetEmail(parsed.data.email, resetUrl);
      } catch (error) {
        console.error("Falha ao enviar e-mail de redefinição de senha.", {
          error
        });
      }
    });
  }

  redirect("/esqueci-senha?sent=1");
}

export async function confirmEmail(formData: FormData) {
  const parsed = verificationTokenSchema.safeParse(formData.get("token"));

  if (!parsed.success) {
    redirect("/verifique-seu-email?error=invalid");
  }

  const tokenHash = hashEmailVerificationToken(parsed.data);
  const confirmed = await prisma.$transaction(async (tx) => {
    const verification = await tx.emailVerificationToken.findUnique({
      where: { tokenHash },
    });

    if (!verification || verification.expiresAt <= new Date()) {
      return false;
    }

    await tx.user.update({
      where: { id: verification.userId },
      data: { emailVerified: new Date() },
    });
    await tx.emailVerificationToken.deleteMany({
      where: { userId: verification.userId },
    });

    return true;
  });

  if (!confirmed) {
    redirect("/verifique-seu-email?error=invalid");
  }

  const cookieStore = await cookies();
  cookieStore.delete(PENDING_VERIFICATION_EMAIL_COOKIE);
  redirect("/login?verified=1");
}

export async function resendEmailVerification(formData: FormData) {
  const parsed = forgotPasswordSchema.safeParse({
    email: formData.get("email"),
  });

  if (!parsed.success) {
    redirect("/verifique-seu-email?sent=1");
  }

  await rememberPendingVerificationEmail(parsed.data.email);

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email },
    select: {
      id: true,
      email: true,
      password: true,
      emailVerified: true,
    },
  });

  if (user?.password && !user.emailVerified && user.email) {
    const verification = createEmailVerificationToken();

    await prisma.emailVerificationToken.upsert({
      where: { userId: user.id },
      update: {
        tokenHash: verification.tokenHash,
        expiresAt: verification.expiresAt,
      },
      create: {
        userId: user.id,
        tokenHash: verification.tokenHash,
        expiresAt: verification.expiresAt,
      },
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.AUTH_URL ?? "";
    const email = user.email;
    const verificationUrl = getEmailVerificationUrl(appUrl, verification.token);
    const userId = user.id;

    // Envio fora do caminho de resposta: iguala o tempo de resposta e não trava
    // a UI. Resposta idêntica para conta pendente, inexistente ou já verificada.
    after(async () => {
      try {
        await sendEmailVerificationEmail(email, verificationUrl);
      } catch (error) {
        console.error("Falha ao reenviar confirmação de cadastro.", {
          error,
          userId,
        });
      }
    });
  }

  redirect("/verifique-seu-email?sent=1");
}

export async function resetPassword(
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = resetPasswordSchema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword")
  });

  if (!parsed.success) {
    return { fieldErrors: toFieldErrors(parsed.error) };
  }

  const resetToken = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashToken(parsed.data.token) }
  });

  if (!resetToken || resetToken.expiresAt < new Date()) {
    redirect("/esqueci-senha?error=expired");
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: resetToken.userId },
      data: { password: passwordHash }
    }),
    prisma.passwordResetToken.deleteMany({
      where: { userId: resetToken.userId }
    })
  ]);

  redirect("/login?reset=1");
}
