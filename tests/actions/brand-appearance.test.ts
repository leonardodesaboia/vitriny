import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  makePrismaMock,
  makeSession,
  type PrismaMock,
} from "../helpers";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: {} }));

let db: PrismaMock;

beforeEach(async () => {
  vi.resetModules();
  const { auth } = await import("@/auth");
  const prismaModule = await import("@/lib/prisma");
  db = makePrismaMock();
  Object.assign(prismaModule.prisma, db);
  db.user.findUnique.mockResolvedValue({ deletedAt: null });
  vi.mocked(auth).mockResolvedValue(makeSession("user-1") as never);
});

describe("brand appearance actions", () => {
  it("salva a última combinação escolhida para perfil PRO", async () => {
    db.providerProfile.findUnique.mockResolvedValue({
      plan: "PRO",
      slug: "estudio-aurora",
      brandColor: "FOREST",
      brandFont: "CLASSIC",
    });

    const { saveBrandAppearance } = await import(
      "@/lib/actions/brand-appearance"
    );

    await expect(
      saveBrandAppearance({
        brandColor: "ROSE",
        brandFont: "ELEGANT",
      }),
    ).resolves.toEqual({ success: true });
    expect(db.providerProfile.update).toHaveBeenCalledWith({
      where: { userId: "user-1" },
      data: { brandColor: "ROSE", brandFont: "ELEGANT" },
    });
  });

  it("não escreve nem revalida quando a combinação já está salva", async () => {
    db.providerProfile.findUnique.mockResolvedValue({
      plan: "PRO",
      slug: "estudio-aurora",
      brandColor: "OCEAN",
      brandFont: "MODERN",
    });

    const { revalidatePath } = await import("next/cache");
    const { saveBrandAppearance } = await import(
      "@/lib/actions/brand-appearance"
    );

    await expect(
      saveBrandAppearance({
        brandColor: "OCEAN",
        brandFont: "MODERN",
      }),
    ).resolves.toEqual({ success: true });
    expect(db.providerProfile.update).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("bloqueia tentativa de personalização no FREE", async () => {
    db.providerProfile.findUnique.mockResolvedValue({
      plan: "FREE",
      slug: "estudio-aurora",
      brandColor: "FOREST",
      brandFont: "CLASSIC",
    });

    const { saveBrandAppearance } = await import(
      "@/lib/actions/brand-appearance"
    );

    await expect(
      saveBrandAppearance({
        brandColor: "GOLD",
        brandFont: "EDITORIAL",
      }),
    ).resolves.toEqual({ error: expect.stringContaining("PRO") });
    expect(db.providerProfile.update).not.toHaveBeenCalled();
  });

  it("rejeita IDs arbitrários antes de atualizar o banco", async () => {
    const { saveBrandAppearance } = await import(
      "@/lib/actions/brand-appearance"
    );

    await expect(
      saveBrandAppearance({
        brandColor: "FOREST",
        brandFont: "https://example.com/font.woff2",
      } as never),
    ).resolves.toEqual({ error: expect.stringContaining("inválida") });
    expect(db.providerProfile.update).not.toHaveBeenCalled();
  });

  it("não revalida rotas ao salvar (páginas são force-dynamic)", async () => {
    // Revalidar dispararia refresh da rota atual e reverteria a UI otimista da
    // aba de aparência; as páginas que leem a aparência são force-dynamic.
    db.providerProfile.findUnique.mockResolvedValue({
      plan: "PRO",
      slug: "estudio-aurora",
      brandColor: "FOREST",
      brandFont: "CLASSIC",
    });
    const { revalidatePath } = await import("next/cache");
    const { saveBrandAppearance } = await import(
      "@/lib/actions/brand-appearance"
    );

    await saveBrandAppearance({
      brandColor: "LAVENDER",
      brandFont: "FRIENDLY",
    });

    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("permite ao FREE salvar uma cor liberada com a fonte padrão", async () => {
    db.providerProfile.findUnique.mockResolvedValue({
      plan: "FREE",
      slug: "estudio-aurora",
      brandColor: "FOREST",
      brandFont: "CLASSIC",
    });

    const { saveBrandAppearance } = await import(
      "@/lib/actions/brand-appearance"
    );

    await expect(
      saveBrandAppearance({
        brandColor: "OCEAN",
        brandFont: "CLASSIC",
      }),
    ).resolves.toEqual({ success: true });
    expect(db.providerProfile.update).toHaveBeenCalledWith({
      where: { userId: "user-1" },
      data: { brandColor: "OCEAN", brandFont: "CLASSIC" },
    });
  });

  it("bloqueia fonte PRO no FREE mesmo com cor liberada", async () => {
    db.providerProfile.findUnique.mockResolvedValue({
      plan: "FREE",
      slug: "estudio-aurora",
      brandColor: "FOREST",
      brandFont: "CLASSIC",
    });

    const { saveBrandAppearance } = await import(
      "@/lib/actions/brand-appearance"
    );

    // OCEAN faz parte do kit FREE, mas ELEGANT é PRO → rejeita a combinação.
    await expect(
      saveBrandAppearance({
        brandColor: "OCEAN",
        brandFont: "ELEGANT",
      }),
    ).resolves.toEqual({ error: expect.stringContaining("PRO") });
    expect(db.providerProfile.update).not.toHaveBeenCalled();
  });
});
