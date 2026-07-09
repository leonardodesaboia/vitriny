import { beforeEach, describe, expect, it, vi } from "vitest";

import { makeFormData, makePrismaMock, type PrismaMock } from "../helpers";
import { hashEmailVerificationToken } from "@/lib/auth/email-verification";

const cookieStore = vi.hoisted(() => ({
  delete: vi.fn(),
  get: vi.fn(),
  set: vi.fn(),
}));

vi.mock("@/auth", () => ({ signIn: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: {} }));
vi.mock("next/headers", () => ({ cookies: vi.fn(async () => cookieStore) }));
vi.mock("next-auth", () => ({
  AuthError: class AuthError extends Error {},
  CredentialsSignin: class CredentialsSignin extends Error {
    code = "credentials";
  },
}));
vi.mock("@/lib/email", () => ({
  sendEmailVerificationEmail: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
}));

let db: PrismaMock;

const validRegistration = () =>
  makeFormData({
    name: "Ana Silva",
    email: "ana@example.com",
    password: "password123",
    confirmPassword: "password123",
  });

beforeEach(async () => {
  vi.resetModules();
  process.env.NEXT_PUBLIC_APP_URL = "https://app.test";

  const prismaModule = await import("@/lib/prisma");
  const { sendEmailVerificationEmail, sendPasswordResetEmail } = await import(
    "@/lib/email"
  );

  db = makePrismaMock();
  Object.assign(prismaModule.prisma, db);
  vi.mocked(sendEmailVerificationEmail).mockResolvedValue(undefined);
  vi.mocked(sendPasswordResetEmail).mockResolvedValue(undefined);
});

describe("registerUser", () => {
  it("cria conta pendente, token com hash e envia confirmação sem fazer login", async () => {
    db.user.findUnique.mockResolvedValue(null);
    db.user.create.mockResolvedValue({ id: "user-1", email: "ana@example.com" });

    const { signIn } = await import("@/auth");
    const { sendEmailVerificationEmail } = await import("@/lib/email");
    const { registerUser } = await import("@/lib/actions/auth");

    await expect(registerUser(validRegistration())).rejects.toThrow(
      "/verifique-seu-email?sent=1",
    );

    expect(db.user.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        email: "ana@example.com",
        emailVerified: null,
        password: expect.any(String),
      }),
    });
    expect(db.emailVerificationToken.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: "user-1",
        tokenHash: expect.stringMatching(/^[a-f0-9]{64}$/),
        expiresAt: expect.any(Date),
      }),
    });
    expect(sendEmailVerificationEmail).toHaveBeenCalledWith(
      "ana@example.com",
      expect.stringMatching(/^https:\/\/app\.test\/verificar-email\/[a-f0-9]{64}$/),
    );
    expect(cookieStore.set).toHaveBeenCalledWith(
      "vitriny_pending_verification_email",
      "ana@example.com",
      expect.objectContaining({ httpOnly: true, maxAge: 86_400 }),
    );
    expect(signIn).not.toHaveBeenCalled();
  });

  it("mantém a conta pendente e oferece reenvio quando o provedor de e-mail falha", async () => {
    const { sendEmailVerificationEmail } = await import("@/lib/email");
    vi.mocked(sendEmailVerificationEmail).mockRejectedValue(new Error("resend failed"));
    db.user.findUnique.mockResolvedValue(null);
    db.user.create.mockResolvedValue({ id: "user-1", email: "ana@example.com" });

    const { registerUser } = await import("@/lib/actions/auth");

    await expect(registerUser(validRegistration())).rejects.toThrow(
      "/verifique-seu-email?error=delivery",
    );
    expect(db.emailVerificationToken.create).toHaveBeenCalledOnce();
  });
});

describe("confirmEmail", () => {
  it("confirma token válido e o remove na mesma transação", async () => {
    const token = "a".repeat(64);
    db.emailVerificationToken.findUnique.mockResolvedValue({
      id: "verification-1",
      userId: "user-1",
      tokenHash: hashEmailVerificationToken(token),
      expiresAt: new Date(Date.now() + 60_000),
    });

    const { confirmEmail } = await import("@/lib/actions/auth");

    await expect(
      confirmEmail(makeFormData({ token })),
    ).rejects.toThrow("/login?verified=1");
    expect(db.user.update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { emailVerified: expect.any(Date) },
    });
    expect(db.emailVerificationToken.deleteMany).toHaveBeenCalledWith({
      where: { userId: "user-1" },
    });
    expect(cookieStore.delete).toHaveBeenCalledWith(
      "vitriny_pending_verification_email",
    );
  });

  it("recusa token expirado sem verificar o usuário", async () => {
    const token = "b".repeat(64);
    db.emailVerificationToken.findUnique.mockResolvedValue({
      id: "verification-1",
      userId: "user-1",
      tokenHash: hashEmailVerificationToken(token),
      expiresAt: new Date(Date.now() - 60_000),
    });

    const { confirmEmail } = await import("@/lib/actions/auth");

    await expect(confirmEmail(makeFormData({ token }))).rejects.toThrow(
      "/verifique-seu-email?error=invalid",
    );
    expect(db.user.update).not.toHaveBeenCalled();
  });

  it("recusa token válido no formato, mas ausente ou já consumido", async () => {
    db.emailVerificationToken.findUnique.mockResolvedValue(null);

    const { confirmEmail } = await import("@/lib/actions/auth");

    await expect(
      confirmEmail(makeFormData({ token: "c".repeat(64) })),
    ).rejects.toThrow("/verifique-seu-email?error=invalid");
    expect(db.user.update).not.toHaveBeenCalled();
  });
});

describe("resendEmailVerification", () => {
  it("invalida o token anterior e envia outro para conta pendente", async () => {
    db.user.findUnique.mockResolvedValue({
      id: "user-1",
      email: "ana@example.com",
      password: "hash",
      emailVerified: null,
    });

    const { sendEmailVerificationEmail } = await import("@/lib/email");
    const { resendEmailVerification } = await import("@/lib/actions/auth");

    await expect(
      resendEmailVerification(makeFormData({ email: "ana@example.com" })),
    ).rejects.toThrow("/verifique-seu-email?sent=1");
    expect(db.emailVerificationToken.upsert).toHaveBeenCalledWith({
      where: { userId: "user-1" },
      update: expect.objectContaining({ tokenHash: expect.any(String) }),
      create: expect.objectContaining({
        userId: "user-1",
        tokenHash: expect.any(String),
      }),
    });
    expect(sendEmailVerificationEmail).toHaveBeenCalledOnce();
  });

  it("retorna a mesma resposta quando a conta não existe", async () => {
    db.user.findUnique.mockResolvedValue(null);

    const { sendEmailVerificationEmail } = await import("@/lib/email");
    const { resendEmailVerification } = await import("@/lib/actions/auth");

    await expect(
      resendEmailVerification(makeFormData({ email: "ausente@example.com" })),
    ).rejects.toThrow("/verifique-seu-email?sent=1");
    expect(sendEmailVerificationEmail).not.toHaveBeenCalled();
  });

  it("não envia confirmação para conta que já foi verificada", async () => {
    db.user.findUnique.mockResolvedValue({
      id: "user-1",
      email: "ana@example.com",
      password: "hash",
      emailVerified: new Date(),
    });

    const { sendEmailVerificationEmail } = await import("@/lib/email");
    const { resendEmailVerification } = await import("@/lib/actions/auth");

    await expect(
      resendEmailVerification(makeFormData({ email: "ana@example.com" })),
    ).rejects.toThrow("/verifique-seu-email?sent=1");
    expect(sendEmailVerificationEmail).not.toHaveBeenCalled();
  });
});

describe("requestPasswordReset", () => {
  it("não envia redefinição para conta ainda não verificada", async () => {
    db.user.findUnique.mockResolvedValue({
      id: "user-1",
      password: "hash",
      emailVerified: null,
    });

    const { sendPasswordResetEmail } = await import("@/lib/email");
    const { requestPasswordReset } = await import("@/lib/actions/auth");

    await expect(
      requestPasswordReset(makeFormData({ email: "ana@example.com" })),
    ).rejects.toThrow("/esqueci-senha?sent=1");
    expect(db.passwordResetToken.create).not.toHaveBeenCalled();
    expect(sendPasswordResetEmail).not.toHaveBeenCalled();
  });

  it("grava o hash do token, nunca o token puro", async () => {
    db.user.findUnique.mockResolvedValue({
      id: "user-1",
      password: "hash",
      emailVerified: new Date(),
    });
    const { requestPasswordReset } = await import("@/lib/actions/auth");

    await expect(
      requestPasswordReset(makeFormData({ email: "ana@example.com" })),
    ).rejects.toThrow("/esqueci-senha?sent=1");

    const createArg = db.passwordResetToken.create.mock.calls[0][0];
    expect(createArg.data.tokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(createArg.data.token).toBeUndefined();
  });
});

describe("resetPassword", () => {
  it("busca o token pelo hash", async () => {
    const { hashToken } = await import("@/lib/auth/tokens");
    db.passwordResetToken.findUnique.mockResolvedValue({
      userId: "user-1",
      expiresAt: new Date(Date.now() + 60_000),
    });
    db.user.update.mockResolvedValue({});
    db.passwordResetToken.deleteMany.mockResolvedValue({});
    const { resetPassword } = await import("@/lib/actions/auth");

    await expect(
      resetPassword(
        makeFormData({
          token: "tok-puro",
          password: "SenhaForte1",
          confirmPassword: "SenhaForte1",
        }),
      ),
    ).rejects.toThrow("/login?reset=1");

    expect(db.passwordResetToken.findUnique).toHaveBeenCalledWith({
      where: { tokenHash: hashToken("tok-puro") },
    });
  });
});
