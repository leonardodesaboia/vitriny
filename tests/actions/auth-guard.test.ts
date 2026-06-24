import { describe, it, expect, vi } from "vitest";
import { makeSession, makeProfile, makePrismaMock } from "../helpers";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: {} }));

async function setup() {
  const { auth } = await import("@/auth");
  const prismaModule = await import("@/lib/prisma");
  const db = makePrismaMock();
  Object.assign(prismaModule.prisma, db);
  return { auth: vi.mocked(auth), db };
}

describe("requireAuth", () => {
  it("retorna o userId quando a sessão é válida", async () => {
    const { auth } = await setup();
    auth.mockResolvedValue(makeSession("user-abc") as never);

    const { requireAuth } = await import("@/lib/actions/auth-guard");
    const userId = await requireAuth();

    expect(userId).toBe("user-abc");
  });

  it("redireciona para /login quando não há sessão", async () => {
    const { auth } = await setup();
    auth.mockResolvedValue(null as never);

    const { requireAuth } = await import("@/lib/actions/auth-guard");
    await expect(requireAuth()).rejects.toThrow("/login");
  });

  it("redireciona para /login quando a sessão não tem userId", async () => {
    const { auth } = await setup();
    auth.mockResolvedValue({ user: {} } as never);

    const { requireAuth } = await import("@/lib/actions/auth-guard");
    await expect(requireAuth()).rejects.toThrow("/login");
  });
});

describe("requireProviderProfile", () => {
  it("retorna userId e profile quando ambos existem", async () => {
    const { auth, db } = await setup();
    auth.mockResolvedValue(makeSession("user-1") as never);
    db.providerProfile.findUnique.mockResolvedValue(makeProfile({ id: "profile-1", plan: "FREE" }));

    const { requireProviderProfile } = await import("@/lib/actions/auth-guard");
    const result = await requireProviderProfile();

    expect(result.userId).toBe("user-1");
    expect(result.profile).toMatchObject({ id: "profile-1", plan: "FREE" });
  });

  it("retorna profile null quando prestador ainda não criou perfil", async () => {
    const { auth, db } = await setup();
    auth.mockResolvedValue(makeSession("user-1") as never);
    db.providerProfile.findUnique.mockResolvedValue(null);

    const { requireProviderProfile } = await import("@/lib/actions/auth-guard");
    const result = await requireProviderProfile();

    expect(result.profile).toBeNull();
    expect(result.userId).toBe("user-1");
  });

  it("redireciona para /login quando não há sessão", async () => {
    const { auth } = await setup();
    auth.mockResolvedValue(null as never);

    const { requireProviderProfile } = await import("@/lib/actions/auth-guard");
    await expect(requireProviderProfile()).rejects.toThrow("/login");
  });

  it("busca o perfil pelo userId correto da sessão", async () => {
    const { auth, db } = await setup();
    auth.mockResolvedValue(makeSession("user-xyz") as never);
    db.providerProfile.findUnique.mockResolvedValue(null);

    const { requireProviderProfile } = await import("@/lib/actions/auth-guard");
    await requireProviderProfile();

    expect(db.providerProfile.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: "user-xyz" } })
    );
  });
});
