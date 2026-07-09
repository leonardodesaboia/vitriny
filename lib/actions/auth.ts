"use server";

import crypto from "crypto";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
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

async function signInWithCredentials(
  email: string,
  password: string,
  errorBasePath: string
) {
  try {
    await signIn("credentials", {
      email,
      password,
      redirectTo: "/dashboard"
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
    confirmPassword: formData.get("confirmPassword")
  });

  if (!parsed.success) {
    redirect("/cadastro?error=invalid");
  }

  const existingUser = await prisma.user.findUnique({
    where: { email: parsed.data.email },
    select: { password: true }
  });

  if (existingUser) {
    redirect("/cadastro?error=email-exists");
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
      redirect("/cadastro?error=email-exists");
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

export async function loginWithCredentials(formData: FormData) {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password")
  });

  if (!parsed.success) {
    redirect("/login?error=invalid-credentials");
  }

  await signInWithCredentials(parsed.data.email, parsed.data.password, "/login");
}

export async function requestPasswordReset(formData: FormData) {
  const parsed = forgotPasswordSchema.safeParse({
    email: formData.get("email")
  });

  if (!parsed.success) {
    redirect("/esqueci-senha?error=invalid");
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

    try {
      await sendPasswordResetEmail(
        parsed.data.email,
        `${appUrl.replace(/\/$/, "")}/redefinir-senha/${token}`
      );
    } catch (error) {
      // A resposta precisa ser idêntica em todos os casos para não revelar
      // quais e-mails têm conta; falha de envio não pode virar erro visível.
      console.error("Falha ao enviar e-mail de redefinição de senha.", {
        error
      });
    }
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

    try {
      await sendEmailVerificationEmail(
        user.email,
        getEmailVerificationUrl(appUrl, verification.token),
      );
    } catch (error) {
      console.error("Falha ao reenviar confirmação de cadastro.", {
        error,
        userId: user.id,
      });
    }
  }

  redirect("/verifique-seu-email?sent=1");
}

export async function resetPassword(formData: FormData) {
  const parsed = resetPasswordSchema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword")
  });

  if (!parsed.success) {
    const token = String(formData.get("token") ?? "");
    redirect(`/redefinir-senha/${token}?error=invalid`);
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
