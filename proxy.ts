import NextAuth from "next-auth";
import { authConfig } from "./auth.config";
import { NextResponse, type NextRequest } from "next/server";

const { auth } = NextAuth(authConfig);

// In-memory sliding window rate limiter.
// For multi-instance deployments, replace this Map with a Redis/Upstash store.
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

interface RateLimitRule {
  limit: number;
  windowMs: number;
}

const RATE_LIMIT_RULES: Record<string, RateLimitRule> = {
  // Login por credenciais (POST direto no callback do Auth.js)
  "/api/auth/callback/credentials": { limit: 10, windowMs: 60_000 },
  // Login pela UI: a Server Action posta em /login e o signIn() roda
  // in-process, sem passar pelo callback acima — precisa de regra própria.
  "/login": { limit: 10, windowMs: 60_000 },
  // Requisição de reset de senha (Server Action em /esqueci-senha)
  "/esqueci-senha": { limit: 5, windowMs: 300_000 },
  // Submissão da nova senha (Server Action em /redefinir-senha/[token]) — evita
  // abuso de bcrypt e brute force do token.
  "/redefinir-senha": { limit: 5, windowMs: 300_000 },
  // Criação de conta (Server Action em /cadastro)
  "/cadastro": { limit: 5, windowMs: 300_000 },
  // Reenvio e confirmação de e-mail
  "/verifique-seu-email": { limit: 5, windowMs: 300_000 },
  "/verificar-email": { limit: 10, windowMs: 300_000 },
  // Formulário público de pedido (Server Action em /u/*/orcamento)
  "/u/orcamento": { limit: 20, windowMs: 60_000 },
};

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown"
  );
}

function isRateLimited(key: string, rule: RateLimitRule): boolean {
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry || now >= entry.resetAt) {
    rateLimitStore.set(key, { count: 1, resetAt: now + rule.windowMs });
    return false;
  }

  if (entry.count >= rule.limit) return true;

  entry.count++;
  return false;
}

function matchRateLimitRule(pathname: string, method: string): RateLimitRule | null {
  if (method !== "POST") return null;

  for (const [pattern, rule] of Object.entries(RATE_LIMIT_RULES)) {
    if (pattern === "/u/orcamento") {
      // Matches /u/[slug]/orcamento
      if (/^\/u\/[^/]+\/orcamento/.test(pathname)) return rule;
      continue;
    }
    if (pathname === pattern || pathname.startsWith(pattern + "/")) return rule;
  }

  return null;
}

export default auth((request) => {
  const { pathname } = request.nextUrl;
  const method = request.method;

  // Rate limiting (POST only — Server Actions and auth callbacks)
  const rule = matchRateLimitRule(pathname, method);
  if (rule) {
    const ip = getClientIp(request);
    const key = `${ip}:${pathname}`;
    if (isRateLimited(key, rule)) {
      return new NextResponse("Muitas tentativas. Aguarde um momento e tente novamente.", {
        status: 429,
        headers: { "Retry-After": String(Math.ceil(rule.windowMs / 1000)) }
      });
    }
  }

  // Dashboard auth protection
  if (!request.auth && pathname.startsWith("/dashboard")) {
    const loginUrl = new URL("/login", request.nextUrl);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/api/auth/callback/credentials",
    "/login",
    "/esqueci-senha",
    "/cadastro",
    "/verifique-seu-email",
    "/verificar-email/:path*",
    "/redefinir-senha/:path*",
    "/u/:slug/orcamento",
  ],
};
