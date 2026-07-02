import { describe, expect, it } from "vitest";

import {
  createEmailVerificationToken,
  getEmailVerificationUrl,
  hashEmailVerificationToken,
} from "@/lib/auth/email-verification";

describe("email verification token", () => {
  it("gera token aleatório, armazena hash e expira em 24 horas", () => {
    const now = new Date("2026-07-02T12:00:00.000Z");
    const result = createEmailVerificationToken(now);

    expect(result.token).toMatch(/^[a-f0-9]{64}$/);
    expect(result.tokenHash).toBe(hashEmailVerificationToken(result.token));
    expect(result.tokenHash).not.toBe(result.token);
    expect(result.expiresAt).toEqual(new Date("2026-07-03T12:00:00.000Z"));
  });

  it("monta a URL sem duplicar a barra final", () => {
    expect(getEmailVerificationUrl("https://app.test/", "abc123")).toBe(
      "https://app.test/verificar-email/abc123",
    );
  });

  it("rejeita URL base vazia", () => {
    expect(() => getEmailVerificationUrl("", "abc123")).toThrow(
      "URL pública da aplicação não configurada.",
    );
  });
});
