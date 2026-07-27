import { describe, it, expect, vi, beforeEach } from "vitest";
import { cleanDatabase, testDb } from "./setup";
import { makeFormData, seedProfile, seedService, seedUser } from "./helpers";

vi.mock("@/auth", () => ({ auth: vi.fn() }));

let userId: string;
let profileId: string;

beforeEach(async () => {
  vi.resetModules();
  await cleanDatabase();

  const user = await seedUser();
  userId = user.id;
  const profile = await seedProfile(userId);
  profileId = profile.id;

  const { auth } = await import("@/auth");
  vi.mocked(auth).mockResolvedValue({
    user: { id: userId, email: "integration@test.com" }
  } as never);
});

describe("createService (integração)", () => {
  it("mantém SERVICE como padrão para itens antigos sem itemType explícito", async () => {
    const service = await seedService(profileId, { name: "Item legado" });

    expect(service.itemType).toBe("SERVICE");
  });

  it("persiste PRODUCT sem alterar pricingType", async () => {
    const { createService } = await import("@/lib/actions/services");
    const form = makeFormData({
      name: "Kit presenteável",
      description: "Produto personalizado",
      basePrice: "150.00",
      isActive: "on",
      itemType: "PRODUCT",
      pricingType: "FIXED",
      fixedServiceCheckoutMode: "REQUEST_ONLY"
    });

    await createService(undefined, form);

    const service = await testDb.service.findFirst({ where: { providerId: profileId } });
    expect(service?.itemType).toBe("PRODUCT");
    expect(service?.pricingType).toBe("FIXED");
  });

  it("persiste serviço no banco com os dados corretos", async () => {
    const { createService } = await import("@/lib/actions/services");
    const form = makeFormData({
      name: "Pintura residencial",
      description: "Serviço completo",
      basePrice: "500.00",
      isActive: "on",
      itemType: "SERVICE",
      pricingType: "FIXED",
      fixedServiceCheckoutMode: "REQUEST_ONLY"
    });

    const result = await createService(undefined, form);
    expect(result).toEqual({ serviceId: expect.any(String) });

    const service = await testDb.service.findFirst({ where: { providerId: profileId } });
    expect(service?.name).toBe("Pintura residencial");
    expect(service?.description).toBe("Serviço completo");
    expect(service?.basePrice?.toString()).toBe("500");
    expect(service?.isActive).toBe(true);
  });

  it("bloqueia criação quando limite FREE de 3 serviços ativos é atingido", async () => {
    await seedService(profileId, { name: "Serviço 1" });
    await seedService(profileId, { name: "Serviço 2" });
    await seedService(profileId, { name: "Serviço 3" });

    const { createService } = await import("@/lib/actions/services");
    const form = makeFormData({
      name: "Serviço 4",
      description: "",
      basePrice: "",
      isActive: "on",
      itemType: "SERVICE",
      pricingType: "CUSTOM"
    });

    const result = await createService(undefined, form);
    expect(result).toEqual({ error: expect.any(String) });

    const count = await testDb.service.count({ where: { providerId: profileId } });
    expect(count).toBe(3);
  });

  it("plano PRO ultrapassa limite de 3 serviços ativos", async () => {
    await testDb.providerProfile.update({
      where: { id: profileId },
      data: { plan: "PRO" }
    });
    for (let i = 1; i <= 3; i++) {
      await seedService(profileId, { name: `Serviço ${i}` });
    }

    const { createService } = await import("@/lib/actions/services");
    const form = makeFormData({
      name: "Serviço 4 PRO",
      description: "",
      basePrice: "",
      isActive: "on",
      itemType: "SERVICE",
      pricingType: "CUSTOM"
    });

    const result = await createService(undefined, form);
    expect(result).toEqual({ serviceId: expect.any(String) });

    const count = await testDb.service.count({
      where: { providerId: profileId, isActive: true }
    });
    expect(count).toBe(4);
  });

  it("cria serviço inativo sem verificar limite de plano", async () => {
    for (let i = 1; i <= 3; i++) {
      await seedService(profileId, { name: `Ativo ${i}` });
    }

    const { createService } = await import("@/lib/actions/services");
    const form = makeFormData({
      name: "Serviço Inativo",
      description: "",
      basePrice: "",
      itemType: "SERVICE",
      pricingType: "CUSTOM"
    });

    const result = await createService(undefined, form);
    expect(result).toEqual({ serviceId: expect.any(String) });

    const inactive = await testDb.service.findFirst({
      where: { providerId: profileId, isActive: false }
    });
    expect(inactive?.name).toBe("Serviço Inativo");
  });
});

describe("updateService (integração)", () => {
  it("atualiza nome, descrição e preço no banco", async () => {
    const service = await seedService(profileId, { name: "Nome Antigo", isActive: true });

    const { updateService } = await import("@/lib/actions/services");
    const form = makeFormData({
      serviceId: service.id,
      name: "Nome Novo",
      description: "Desc atualizada",
      basePrice: "999.90",
      isActive: "on",
      itemType: "SERVICE",
      pricingType: "CUSTOM"
    });

    const result = await updateService(undefined, form);
    expect(result).toEqual({ serviceId: service.id });

    const updated = await testDb.service.findUnique({ where: { id: service.id } });
    expect(updated?.name).toBe("Nome Novo");
    expect(updated?.description).toBe("Desc atualizada");
    expect(Number(updated?.basePrice)).toBeCloseTo(999.9);
  });

  it("bloqueia ativação de serviço inativo quando FREE já tem 3 ativos", async () => {
    for (let i = 1; i <= 3; i++) {
      await seedService(profileId, { name: `Ativo ${i}`, isActive: true });
    }
    const inactive = await seedService(profileId, { name: "Inativo", isActive: false });

    const { updateService } = await import("@/lib/actions/services");
    const form = makeFormData({
      serviceId: inactive.id,
      name: "Inativo",
      description: "",
      basePrice: "",
      isActive: "on",
      itemType: "SERVICE",
      pricingType: "CUSTOM"
    });

    const result = await updateService(undefined, form);
    expect(result).toEqual({ error: expect.any(String) });

    const check = await testDb.service.findUnique({ where: { id: inactive.id } });
    expect(check?.isActive).toBe(false);
  });

  it("atualiza serviço já ativo sem verificar limite", async () => {
    for (let i = 1; i <= 3; i++) {
      await seedService(profileId, { name: `Ativo ${i}`, isActive: true });
    }
    const target = await seedService(profileId, { name: "Alvo", isActive: true });

    const { updateService } = await import("@/lib/actions/services");
    const form = makeFormData({
      serviceId: target.id,
      name: "Alvo Renomeado",
      description: "",
      basePrice: "",
      isActive: "on",
      itemType: "SERVICE",
      pricingType: "CUSTOM"
    });

    const result = await updateService(undefined, form);
    expect(result).toEqual({ serviceId: target.id });

    const updated = await testDb.service.findUnique({ where: { id: target.id } });
    expect(updated?.name).toBe("Alvo Renomeado");
  });
});

describe("toggleServiceStatus (integração)", () => {
  it("ativa serviço inativo no banco", async () => {
    const service = await seedService(profileId, { name: "Inativo", isActive: false });

    const { toggleServiceStatus } = await import("@/lib/actions/services");
    await expect(
      toggleServiceStatus(makeFormData({ serviceId: service.id, nextStatus: "true" }))
    ).rejects.toThrow("/dashboard/servicos");

    const updated = await testDb.service.findUnique({ where: { id: service.id } });
    expect(updated?.isActive).toBe(true);
  });

  it("desativa serviço ativo no banco", async () => {
    const service = await seedService(profileId, { name: "Ativo", isActive: true });

    const { toggleServiceStatus } = await import("@/lib/actions/services");
    await expect(
      toggleServiceStatus(makeFormData({ serviceId: service.id, nextStatus: "false" }))
    ).rejects.toThrow("/dashboard/servicos");

    const updated = await testDb.service.findUnique({ where: { id: service.id } });
    expect(updated?.isActive).toBe(false);
  });

  it("bloqueia ativação quando FREE já tem 3 serviços ativos (contagem real no banco)", async () => {
    for (let i = 1; i <= 3; i++) {
      await seedService(profileId, { name: `Ativo ${i}`, isActive: true });
    }
    const inactive = await seedService(profileId, { name: "Bloqueado", isActive: false });

    const { toggleServiceStatus } = await import("@/lib/actions/services");
    await expect(
      toggleServiceStatus(makeFormData({ serviceId: inactive.id, nextStatus: "true" }))
    ).rejects.toThrow("limit-active-services");

    const check = await testDb.service.findUnique({ where: { id: inactive.id } });
    expect(check?.isActive).toBe(false);
  });
});
