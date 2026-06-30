import NextAuth, { CredentialsSignin } from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";

import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/lib/validations/auth";
import { authConfig } from "./auth.config";

class InvalidCredentialsError extends CredentialsSignin {
  code = "invalid-credentials";
}

class GoogleOnlyAccountError extends CredentialsSignin {
  code = "google-account";
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  providers: [
    Google,
    Credentials({
      credentials: {
        email: {},
        password: {}
      },
      authorize: async (credentials) => {
        const parsed = loginSchema.safeParse(credentials);

        if (!parsed.success) {
          throw new InvalidCredentialsError();
        }

        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email }
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
          email: user.email
        };
      }
    })
  ]
});
