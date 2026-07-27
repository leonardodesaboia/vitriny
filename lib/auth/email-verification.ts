import crypto from "node:crypto";

import { hashToken } from "@/lib/auth/tokens";

const EMAIL_VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000;

export const PENDING_VERIFICATION_EMAIL_COOKIE =
  "vitriny_pending_verification_email";
export const PENDING_VERIFICATION_EMAIL_MAX_AGE = 24 * 60 * 60;

export function hashEmailVerificationToken(token: string): string {
  return hashToken(token);
}

export function createEmailVerificationToken(now = new Date()) {
  const token = crypto.randomBytes(32).toString("hex");

  return {
    token,
    tokenHash: hashEmailVerificationToken(token),
    expiresAt: new Date(now.getTime() + EMAIL_VERIFICATION_TTL_MS),
  };
}

export function getEmailVerificationUrl(baseUrl: string, token: string): string {
  if (!baseUrl.trim()) {
    throw new Error("URL pública da aplicação não configurada.");
  }

  return `${baseUrl.replace(/\/$/, "")}/verificar-email/${token}`;
}
