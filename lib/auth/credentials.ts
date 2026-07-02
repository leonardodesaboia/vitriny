import bcrypt from "bcryptjs";
import { CredentialsSignin } from "next-auth";

import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/lib/validations/auth";

export class InvalidCredentialsError extends CredentialsSignin {
  code = "invalid-credentials";
}

export class GoogleOnlyAccountError extends CredentialsSignin {
  code = "google-account";
}

export class EmailNotVerifiedError extends CredentialsSignin {
  code = "email-not-verified";
}

export async function authorizeCredentials(credentials: unknown) {
  const parsed = loginSchema.safeParse(credentials);

  if (!parsed.success) {
    throw new InvalidCredentialsError();
  }

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email },
  });

  if (!user || user.deletedAt) {
    throw new InvalidCredentialsError();
  }

  if (!user.password) {
    throw new GoogleOnlyAccountError();
  }

  const valid = await bcrypt.compare(parsed.data.password, user.password);

  if (!valid) {
    throw new InvalidCredentialsError();
  }

  if (!user.emailVerified) {
    throw new EmailNotVerifiedError();
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
  };
}
