import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeFormData, makeSession, makePrismaMock, type PrismaMock } from "../helpers";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: {} }));

let db: PrismaMock;

beforeEach(async () => {
  vi.resetModules();
  const { auth } = await import("@/auth");
  const prismaModule = await import("@/lib/prisma");
  db = makePrismaMock();
  Object.assign(prismaModule.prisma, db);
  vi.mocked(auth).mockResolvedValue(makeSession("user-1") as never);
  db.providerProfile.findUnique.mockResolvedValue(null);
  db.providerProfile.upsert.mockResolvedValue({});
});

const validProfileForm = () =>
  makeFormData({
    businessName: "Pinturas Silva",
    slug: "pinturas-silva",
    description: "",
    phone: "",
    email: "",
    city: "",
    state: "",
    isPublished: "on"
  });

describe("saveProviderProfile", () => {
  it("salva perfil e redireciona para /dashboard em caso de sucesso", async () => {
    const { saveProviderProfile } = await import("@/lib/actions/provider-profile");
    await expect(saveProviderProfile(undefined, validProfileForm())).rejects.toThrow("/dashboard");

    expect(db.providerProfile.upsert).toHaveBeenCalledOnce();
  });

  it("redireciona para /login quando não há sessão", async () => {
    const { auth } = await import("@/auth");
    vi.mocked(auth).mockResolvedValue(null as never);

    const { saveProviderProfile } = await import("@/lib/actions/provider-profile");
    await expect(saveProviderProfile(undefined, validProfileForm())).rejects.toThrow("/login");
  });

  it("retorna erro de validação quando businessName está vazio", async () => {
    const form = makeFormData({
      businessName: "",
      slug: "pinturas-silva",
      description: "",
      phone: "",
      email: "",
      city: "",
      state: ""
    });

    const { saveProviderProfile } = await import("@/lib/actions/provider-profile");
    const result = await saveProviderProfile(undefined, form);

    expect(result).toEqual({ error: expect.stringContaining("inválido") });
    expect(db.providerProfile.upsert).not.toHaveBeenCalled();
  });

  it("retorna erro quando slug tem formato inválido", async () => {
    const form = makeFormData({
      businessName: "Pinturas Silva",
      slug: "slug com espaço",
      description: "",
      phone: "",
      email: "",
      city: "",
      state: ""
    });

    const { saveProviderProfile } = await import("@/lib/actions/provider-profile");
    const result = await saveProviderProfile(undefined, form);

    expect(result).toEqual({ error: expect.stringContaining("inválido") });
  });

  it("retorna erro de slug em uso quando outro usuário já tem o slug", async () => {
    db.providerProfile.findUnique.mockResolvedValue({ userId: "outro-usuario" });

    const { saveProviderProfile } = await import("@/lib/actions/provider-profile");
    const result = await saveProviderProfile(undefined, validProfileForm());

    expect(result).toEqual({ error: expect.stringContaining("slug") });
    expect(db.providerProfile.upsert).not.toHaveBeenCalled();
  });

  it("permite atualizar o próprio slug (mesmo userId)", async () => {
    db.providerProfile.findUnique.mockResolvedValue({ userId: "user-1" });
    db.providerProfile.upsert.mockResolvedValue({});

    const { saveProviderProfile } = await import("@/lib/actions/provider-profile");
    await expect(saveProviderProfile(undefined, validProfileForm())).rejects.toThrow("/dashboard");

    expect(db.providerProfile.upsert).toHaveBeenCalledOnce();
  });

  it("faz upsert com o userId correto", async () => {
    const { saveProviderProfile } = await import("@/lib/actions/provider-profile");
    await expect(saveProviderProfile(undefined, validProfileForm())).rejects.toThrow("/dashboard");

    expect(db.providerProfile.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: "user-1" },
        create: expect.objectContaining({ userId: "user-1" })
      })
    );
  });

  it("isPublished é false quando o checkbox não está marcado", async () => {
    const form = makeFormData({
      businessName: "Pinturas Silva",
      slug: "pinturas-silva",
      description: "",
      phone: "",
      email: "",
      city: "",
      state: ""
    });

    const { saveProviderProfile } = await import("@/lib/actions/provider-profile");
    await expect(saveProviderProfile(undefined, form)).rejects.toThrow("/dashboard");

    expect(db.providerProfile.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ isPublished: false })
      })
    );
  });
});
