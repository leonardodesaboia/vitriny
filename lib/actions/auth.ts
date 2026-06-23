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
    redirect(
      existingUser.password ? "/cadastro?error=email-exists" : "/cadastro?error=google-account"
    );
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
