"use server";

import crypto from "crypto";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { AuthError, CredentialsSignin } from "next-auth";

import { signIn } from "@/auth";
import { prisma } from "@/lib/prisma";
import { sendPasswordResetEmail } from "@/lib/email";
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema
} from "@/lib/validations/auth";

const PASSWORD_RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

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

  await prisma.user.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      password: passwordHash
    }
  });

  await signInWithCredentials(parsed.data.email, parsed.data.password, "/cadastro");
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
    select: { id: true, password: true }
  });

  if (user?.password) {
    const token = crypto.randomBytes(32).toString("hex");

    await prisma.$transaction([
      prisma.passwordResetToken.deleteMany({ where: { userId: user.id } }),
      prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          token,
          expiresAt: new Date(Date.now() + PASSWORD_RESET_TOKEN_TTL_MS)
        }
      })
    ]);

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.AUTH_URL ?? "";
    await sendPasswordResetEmail(
      parsed.data.email,
      `${appUrl.replace(/\/$/, "")}/redefinir-senha/${token}`
    );
  }

  redirect("/esqueci-senha?sent=1");
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
    where: { token: parsed.data.token }
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
