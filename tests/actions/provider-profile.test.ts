import { describe, it, expect, vi, beforeEach } from "vitest";
import { Prisma } from "@prisma/client";
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
  // requireAuth verifica soft delete; conta ativa por padrão nos testes.
  db.user.findUnique.mockResolvedValue({ deletedAt: null });
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
  it("não altera aparência ao salvar os demais dados do perfil", async () => {
    const form = validProfileForm();
    form.set("brandColor", "ROSE");
    form.set("brandFont", "GEOMETRIC");

    const { saveProviderProfile } = await import("@/lib/actions/provider-profile");
    await expect(saveProviderProfile(undefined, form)).rejects.toThrow(
      "/dashboard",
    );

    const upsert = db.providerProfile.upsert.mock.calls[0][0];
    expect(upsert.create).not.toHaveProperty("brandColor");
    expect(upsert.create).not.toHaveProperty("brandFont");
    expect(upsert.update).not.toHaveProperty("brandColor");
    expect(upsert.update).not.toHaveProperty("brandFont");
  });

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

    expect(result).toEqual(expect.objectContaining({ error: expect.stringContaining("inválido") }));
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

    expect(result).toEqual(expect.objectContaining({ error: expect.stringContaining("inválido") }));
  });

  it("retorna erro de slug em uso quando outro usuário já tem o slug", async () => {
    db.providerProfile.findUnique.mockResolvedValue({ userId: "outro-usuario" });

    const { saveProviderProfile } = await import("@/lib/actions/provider-profile");
    const result = await saveProviderProfile(undefined, validProfileForm());

    expect(result).toEqual(expect.objectContaining({ error: expect.stringContaining("em uso") }));
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

  it("salva telefone normalizado", async () => {
    const form = makeFormData({
      businessName: "Pinturas Silva",
      slug: "pinturas-silva",
      description: "",
      phone: "11999999999",
      email: "",
      city: "",
      state: ""
    });

    const { saveProviderProfile } = await import("@/lib/actions/provider-profile");
    await expect(saveProviderProfile(undefined, form)).rejects.toThrow("/dashboard");

    expect(db.providerProfile.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ phone: "(11) 99999-9999" }),
        update: expect.objectContaining({ phone: "(11) 99999-9999" })
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

  it("persiste campos de identidade: address, redes sociais e businessHours", async () => {
    const validHours = JSON.stringify([
      null,
      { open: "08:00", close: "18:00" },
      { open: "08:00", close: "18:00" },
      { open: "08:00", close: "18:00" },
      { open: "08:00", close: "18:00" },
      { open: "08:00", close: "18:00" },
      null
    ]);

    const form = makeFormData({
      businessName: "Pinturas Silva",
      slug: "pinturas-silva",
      description: "",
      phone: "",
      email: "",
      city: "",
      state: "",
      address: "Rua das Flores, 123",
      instagram: "@meunegocio",
      facebook: "",
      tiktok: "meunegocio",
      businessHours: validHours
    });

    const { saveProviderProfile } = await import("@/lib/actions/provider-profile");
    await expect(saveProviderProfile(undefined, form)).rejects.toThrow("/dashboard");

    const upsertCall = db.providerProfile.upsert.mock.calls[0][0];
    expect(upsertCall.create).toMatchObject({
      address: "Rua das Flores, 123",
      instagram: "@meunegocio",
      facebook: null,
      tiktok: "meunegocio"
    });
    expect(upsertCall.create.businessHours).toHaveLength(7);
    expect(upsertCall.create.businessHours[1]).toEqual({ open: "08:00", close: "18:00" });
    expect(upsertCall.update).toMatchObject({
      address: "Rua das Flores, 123",
      instagram: "@meunegocio",
      facebook: null,
      tiktok: "meunegocio"
    });
    expect(upsertCall.update.businessHours).toHaveLength(7);
    expect(upsertCall.update.businessHours[1]).toEqual({ open: "08:00", close: "18:00" });
  });

  it("businessHours ausente resulta em Prisma.DbNull no upsert", async () => {
    const form = makeFormData({
      businessName: "Pinturas Silva",
      slug: "pinturas-silva",
      description: "",
      phone: "",
      email: "",
      city: "",
      state: "",
      businessHours: ""
    });

    const { saveProviderProfile } = await import("@/lib/actions/provider-profile");
    await expect(saveProviderProfile(undefined, form)).rejects.toThrow("/dashboard");

    const upsertCall = db.providerProfile.upsert.mock.calls[0][0];
    expect(upsertCall.create.businessHours).toBe(Prisma.DbNull);
    expect(upsertCall.update.businessHours).toBe(Prisma.DbNull);
  });

  it("retorna erro quando businessHours é JSON malformado e não chama upsert", async () => {
    const form = makeFormData({
      businessName: "Pinturas Silva",
      slug: "pinturas-silva",
      description: "",
      phone: "",
      email: "",
      city: "",
      state: "",
      businessHours: "{oops"
    });

    const { saveProviderProfile } = await import("@/lib/actions/provider-profile");
    const result = await saveProviderProfile(undefined, form);

    expect(result).toEqual(
      expect.objectContaining({
        error: expect.stringContaining("inválido"),
        values: expect.objectContaining({ businessHours: "{oops" })
      })
    );
    expect(db.providerProfile.upsert).not.toHaveBeenCalled();
  });

  it("retorna erro quando instagram tem valor inválido e não chama upsert", async () => {
    const form = makeFormData({
      businessName: "Pinturas Silva",
      slug: "pinturas-silva",
      description: "",
      phone: "",
      email: "",
      city: "",
      state: "",
      instagram: "meu negocio inválido"
    });

    const { saveProviderProfile } = await import("@/lib/actions/provider-profile");
    const result = await saveProviderProfile(undefined, form);

    expect(result).toEqual(
      expect.objectContaining({
        error: expect.stringContaining("inválido"),
        values: expect.objectContaining({ instagram: "meu negocio inválido" })
      })
    );
    expect(db.providerProfile.upsert).not.toHaveBeenCalled();
  });
});
