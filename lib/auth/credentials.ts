import bcrypt from "bcryptjs";
import { CredentialsSignin } from "next-auth";

import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/lib/validations/auth";

export class InvalidCredentialsError extends CredentialsSignin {
  code = "invalid-credentials";
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

  // Conta sem senha é Google-only. Devolve o mesmo erro genérico do login
  // inválido: distinguir aqui (antes de validar a senha) revelaria a existência
  // e o método da conta, permitindo enumeração — mesma postura do "esqueci a senha".
  if (!user.password) {
    throw new InvalidCredentialsError();
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
