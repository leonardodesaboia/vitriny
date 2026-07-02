import { beforeEach, describe, expect, it, vi } from "vitest";

import { makePrismaMock, type PrismaMock } from "../helpers";

vi.mock("@/lib/prisma", () => ({ prisma: {} }));
vi.mock("bcryptjs", () => ({ default: { compare: vi.fn() } }));
vi.mock("next-auth", () => ({
  CredentialsSignin: class CredentialsSignin extends Error {
    code = "credentials";
  },
}));

let db: PrismaMock;

beforeEach(async () => {
  vi.resetModules();
  const prismaModule = await import("@/lib/prisma");
  db = makePrismaMock();
  Object.assign(prismaModule.prisma, db);
});

describe("authorizeCredentials", () => {
  it("autoriza conta com senha correta e e-mail verificado", async () => {
    const bcrypt = (await import("bcryptjs")).default;
    vi.mocked(bcrypt.compare).mockResolvedValue(true as never);
    db.user.findUnique.mockResolvedValue({
      id: "user-1",
      name: "Ana",
      email: "ana@example.com",
      password: "hash",
      emailVerified: new Date(),
    });

    const { authorizeCredentials } = await import("@/lib/auth/credentials");

    await expect(
      authorizeCredentials({ email: "ana@example.com", password: "password123" }),
    ).resolves.toMatchObject({ id: "user-1", email: "ana@example.com" });
  });

  it("bloqueia conta não verificada somente depois de validar a senha", async () => {
    const bcrypt = (await import("bcryptjs")).default;
    vi.mocked(bcrypt.compare).mockResolvedValue(true as never);
    db.user.findUnique.mockResolvedValue({
      id: "user-1",
      name: "Ana",
      email: "ana@example.com",
      password: "hash",
      emailVerified: null,
    });

    const { authorizeCredentials } = await import("@/lib/auth/credentials");

    await expect(
      authorizeCredentials({ email: "ana@example.com", password: "password123" }),
    ).rejects.toMatchObject({ code: "email-not-verified" });
    expect(bcrypt.compare).toHaveBeenCalledWith("password123", "hash");
  });

  it("não revela conta pendente quando a senha está errada", async () => {
    const bcrypt = (await import("bcryptjs")).default;
    vi.mocked(bcrypt.compare).mockResolvedValue(false as never);
    db.user.findUnique.mockResolvedValue({
      id: "user-1",
      name: "Ana",
      email: "ana@example.com",
      password: "hash",
      emailVerified: null,
    });

    const { authorizeCredentials } = await import("@/lib/auth/credentials");

    await expect(
      authorizeCredentials({ email: "ana@example.com", password: "wrong-password" }),
    ).rejects.toMatchObject({ code: "invalid-credentials" });
  });
});
