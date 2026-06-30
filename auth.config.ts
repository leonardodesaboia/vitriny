import type { NextAuthConfig } from "next-auth";

// Edge-safe auth config — no Prisma, no bcrypt, no native Node.js modules.
// Used by the middleware (proxy.ts) which runs in the Edge Runtime.
// The full auth config (auth.ts) extends this with the PrismaAdapter and providers.
export const authConfig = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [],
  callbacks: {
    jwt({ token, user }) {
      if (user) token.sub = user.id;
      return token;
    },
    session({ session, token }) {
      if (session.user && token.sub) session.user.id = token.sub;
      return session;
    }
  }
} satisfies NextAuthConfig;
