import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: { providerProfile: { findMany: vi.fn() } },
}));

function profile(overrides: Record<string, unknown>) {
  return {
    slug: "x",
    updatedAt: new Date("2026-01-01"),
    description: null,
    city: null,
    state: null,
    address: null,
    phone: null,
    email: null,
    services: [],
    ...overrides,
  };
}

describe("sitemap", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.NEXT_PUBLIC_APP_URL = "https://vitriny.example";
  });

  it("inclui landing + institucionais e só vitrines com conteúdo suficiente", async () => {
    const { prisma } = await import("@/lib/prisma");
    vi.mocked(prisma.providerProfile.findMany).mockResolvedValue([
      profile({ slug: "com-itens", services: [{ id: "1" }] }),
      profile({ slug: "vazia" }),
    ] as never);

    const sitemap = (await import("@/app/sitemap")).default;
    const urls = (await sitemap()).map((route) => route.url);

    expect(urls).toContain("https://vitriny.example");
    expect(urls).toContain("https://vitriny.example/termos");
    expect(urls).toContain("https://vitriny.example/privacidade");
    expect(urls).toContain("https://vitriny.example/u/com-itens");
    expect(urls).not.toContain("https://vitriny.example/u/vazia");
  });
});
