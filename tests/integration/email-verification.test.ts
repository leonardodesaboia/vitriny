import { beforeEach, describe, expect, it, vi } from "vitest";

import { makeFormData } from "../helpers";
import { cleanDatabase, testDb } from "./setup";

const cookieStore = vi.hoisted(() => ({
  delete: vi.fn(),
  get: vi.fn(),
  set: vi.fn(),
}));

vi.mock("@/auth", () => ({ signIn: vi.fn() }));
vi.mock("next/headers", () => ({ cookies: vi.fn(async () => cookieStore) }));
vi.mock("@/lib/email", () => ({
  sendEmailVerificationEmail: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
}));
vi.mock("next-auth", () => ({
  AuthError: class AuthError extends Error {},
  CredentialsSignin: class CredentialsSignin extends Error {
    code = "credentials";
  },
}));

beforeEach(async () => {
  vi.resetModules();
  await cleanDatabase();
  const { sendEmailVerificationEmail } = await import("@/lib/email");
  vi.mocked(sendEmailVerificationEmail).mockResolvedValue(undefined);
});

describe("verificação de e-mail (integração)", () => {
  it("cria conta pendente e ativa somente após consumir o token", async () => {
    const { sendEmailVerificationEmail } = await import("@/lib/email");
    const { registerUser, confirmEmail } = await import("@/lib/actions/auth");

    await expect(
      registerUser(
        {},
        makeFormData({
          name: "Ana Silva",
          email: "ana@example.com",
          password: "password123",
          confirmPassword: "password123",
        }),
      ),
    ).rejects.toThrow("/verifique-seu-email?sent=1");

    const pendingUser = await testDb.user.findUnique({
      where: { email: "ana@example.com" },
    });
    expect(pendingUser?.emailVerified).toBeNull();

    const verificationUrl = vi.mocked(sendEmailVerificationEmail).mock.calls[0]?.[1];
    const token = verificationUrl?.split("/").pop();
    expect(token).toMatch(/^[a-f0-9]{64}$/);

    await expect(
      confirmEmail(makeFormData({ token: token ?? "" })),
    ).rejects.toThrow("/login?verified=1");

    const verifiedUser = await testDb.user.findUnique({
      where: { email: "ana@example.com" },
    });
    expect(verifiedUser?.emailVerified).toBeInstanceOf(Date);
    await expect(
      testDb.emailVerificationToken.findUnique({
        where: { userId: pendingUser?.id ?? "" },
      }),
    ).resolves.toBeNull();
  });
});
