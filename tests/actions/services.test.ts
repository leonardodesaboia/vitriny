import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeFormData, makeSession, makeProfile, makePrismaMock, type PrismaMock } from "../helpers";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: {} }));

let db: PrismaMock;

beforeEach(async () => {
  vi.resetModules();
  const { auth } = await import("@/auth");
  const prismaModule = await import("@/lib/prisma");
  db = makePrismaMock();
  Object.assign(prismaModule.prisma, db);
  vi.mocked(auth).mockResolvedValue(makeSession() as never);
  db.providerProfile.findUnique.mockResolvedValue(makeProfile());
});

const validServiceForm = () =>
  makeFormData({ name: "Pintura residencial", description: "", basePrice: "", isActive: "on", itemType: "SERVICE", pricingType: "CUSTOM" });

describe("createService", () => {
  it("cria serviço e retorna serviceId em caso de sucesso", async () => {
    db.service.count.mockResolvedValue(0);
    db.service.create.mockResolvedValue({ id: "new-service-id" });

    const { createService } = await import("@/lib/actions/services");
    const result = await createService(undefined, validServiceForm());

    expect(result).toEqual({ serviceId: "new-service-id" });
    expect(db.service.create).toHaveBeenCalledOnce();
  });

  it("persiste PRODUCT sem alterar as regras de precificação", async () => {
    db.service.count.mockResolvedValue(0);
    db.service.create.mockResolvedValue({ id: "new-product-id" });

    const form = makeFormData({
      name: "Kit presenteável",
      description: "",
      basePrice: "120,00",
      isActive: "on",
      itemType: "PRODUCT",
      pricingType: "FIXED",
      fixedServiceCheckoutMode: "REQUEST_ONLY"
    });
    const { createService } = await import("@/lib/actions/services");
    const result = await createService(undefined, form);

    expect(result).toEqual({ serviceId: "new-product-id" });
    expect(db.service.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          itemType: "PRODUCT",
          pricingType: "FIXED",
          fixedServiceCheckoutMode: "REQUEST_ONLY"
        })
      })
    );
  });

  it("redireciona para /login quando não há sessão", async () => {
    const { auth } = await import("@/auth");
    vi.mocked(auth).mockResolvedValue(null as never);

    const { createService } = await import("@/lib/actions/services");
    await expect(createService(undefined, validServiceForm())).rejects.toThrow("/login");
  });

  it("redireciona com ?error=profile quando o prestador não tem perfil", async () => {
    db.providerProfile.findUnique.mockResolvedValue(null);

    const { createService } = await import("@/lib/actions/services");
    await expect(createService(undefined, validServiceForm())).rejects.toThrow(
      "/dashboard/servicos?error=profile"
    );
  });

  it("retorna erro de validação quando o nome é inválido", async () => {
    const form = makeFormData({ name: "A", description: "", basePrice: "", isActive: "on" });

    const { createService } = await import("@/lib/actions/services");
    const result = await createService(undefined, form);

    expect(result).toEqual({ error: expect.stringContaining("inválido") });
    expect(db.service.create).not.toHaveBeenCalled();
  });

  it("retorna erro quando o limite de serviços ativos (FREE) é atingido", async () => {
    db.service.count.mockResolvedValue(3);

    const { createService } = await import("@/lib/actions/services");
    const result = await createService(undefined, validServiceForm());

    expect(result).toEqual({ error: expect.any(String) });
    expect(db.service.create).not.toHaveBeenCalled();
  });

  it("não verifica limite de plano ao criar serviço inativo", async () => {
    const inactiveForm = makeFormData({
      name: "Pintura residencial",
      description: "",
      basePrice: "",
      pricingType: "CUSTOM"
    });

    db.service.create.mockResolvedValue({ id: "new-service-1" });

    const { createService } = await import("@/lib/actions/services");
    const result = await createService(undefined, inactiveForm);

    expect(result).toEqual({ serviceId: "new-service-1" });
    expect(db.service.count).not.toHaveBeenCalled();
  });

  it("prestador PRO cria serviço mesmo com 3+ serviços ativos", async () => {
    db.providerProfile.findUnique.mockResolvedValue(makeProfile({ plan: "PRO" }));
    db.service.count.mockResolvedValue(100);
    db.service.create.mockResolvedValue({ id: "new-service-2" });

    const { createService } = await import("@/lib/actions/services");
    const result = await createService(undefined, validServiceForm());

    expect(result).toEqual({ serviceId: "new-service-2" });
    expect(db.service.create).toHaveBeenCalledOnce();
  });

  it("cria serviço FIXED com pagamento Pix obrigatório quando o perfil tem Pix", async () => {
    db.providerProfile.findUnique
      .mockResolvedValueOnce(makeProfile())
      .mockResolvedValueOnce({
        pixKey: "11999999999",
        pixHolderName: "Vitriny Serviços",
        pixCity: "Fortaleza"
      });
    db.service.count.mockResolvedValue(0);
    db.service.create.mockResolvedValue({ id: "new-service-pix" });

    const form = makeFormData({
      name: "Pintura residencial",
      description: "",
      basePrice: "500,00",
      isActive: "on",
      pricingType: "FIXED",
      fixedServiceCheckoutMode: "REQUIRE_PIX_PAYMENT"
    });
    const { createService } = await import("@/lib/actions/services");
    const result = await createService(undefined, form);

    expect(result).toEqual({ serviceId: "new-service-pix" });
    expect(db.service.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          fixedServiceCheckoutMode: "REQUIRE_PIX_PAYMENT"
        })
      })
    );
  });

  it("impede pagamento Pix obrigatório quando o perfil não tem Pix", async () => {
    db.providerProfile.findUnique
      .mockResolvedValueOnce(makeProfile())
      .mockResolvedValueOnce({ pixKey: null, pixHolderName: null, pixCity: null });

    const form = makeFormData({
      name: "Pintura residencial",
      description: "",
      basePrice: "500,00",
      isActive: "on",
      pricingType: "FIXED",
      fixedServiceCheckoutMode: "REQUIRE_PIX_PAYMENT"
    });
    const { createService } = await import("@/lib/actions/services");
    const result = await createService(undefined, form);

    expect(result).toEqual({ error: expect.stringContaining("Configure sua chave Pix") });
    expect(db.service.create).not.toHaveBeenCalled();
  });
});

describe("updateService", () => {
  const validForm = () =>
    makeFormData({
      serviceId: "service-1",
      name: "Pintura residencial",
      description: "",
      basePrice: "",
      isActive: "on",
      itemType: "SERVICE",
      pricingType: "CUSTOM"
    });

  beforeEach(() => {
    db.service.findFirst.mockResolvedValue({ id: "service-1", isActive: false });
    db.service.count.mockResolvedValue(0);
    db.service.update.mockResolvedValue({});
  });

  it("atualiza serviço e retorna serviceId em caso de sucesso", async () => {
    const { updateService } = await import("@/lib/actions/services");
    const result = await updateService(undefined, validForm());

    expect(result).toEqual({ serviceId: "service-1" });
    expect(db.service.update).toHaveBeenCalledOnce();
  });

  it("atualiza a classificação para PRODUCT", async () => {
    const form = makeFormData({
      serviceId: "service-1",
      name: "Produto personalizado",
      description: "",
      basePrice: "",
      isActive: "on",
      itemType: "PRODUCT",
      pricingType: "CUSTOM"
    });
    const { updateService } = await import("@/lib/actions/services");
    const result = await updateService(undefined, form);

    expect(result).toEqual({ serviceId: "service-1" });
    expect(db.service.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ itemType: "PRODUCT" })
      })
    );
  });

  it("retorna erro de validação quando o nome é inválido", async () => {
    const form = makeFormData({
      serviceId: "service-1",
      name: "A",
      description: "",
      basePrice: "",
      isActive: "on"
    });

    const { updateService } = await import("@/lib/actions/services");
    const result = await updateService(undefined, form);

    expect(result).toEqual({ error: expect.stringContaining("inválido") });
    expect(db.service.update).not.toHaveBeenCalled();
  });

  it("retorna erro quando serviceId está ausente", async () => {
    const form = makeFormData({ name: "Pintura", description: "", basePrice: "", isActive: "on" });

    const { updateService } = await import("@/lib/actions/services");
    const result = await updateService(undefined, form);

    expect(result).toEqual({ error: expect.any(String) });
  });

  it("redireciona com ?error=not-found quando serviço não pertence ao prestador", async () => {
    db.service.findFirst.mockResolvedValue(null);

    const { updateService } = await import("@/lib/actions/services");
    await expect(updateService(undefined, validForm())).rejects.toThrow(
      "/dashboard/servicos?error=not-found"
    );
  });

  it("retorna erro de limite ao ativar serviço quando FREE já tem 3 ativos", async () => {
    db.service.findFirst.mockResolvedValue({ id: "service-1", isActive: false });
    db.service.count.mockResolvedValue(3);

    const { updateService } = await import("@/lib/actions/services");
    const result = await updateService(undefined, validForm());

    expect(result).toEqual({ error: expect.any(String) });
    expect(db.service.update).not.toHaveBeenCalled();
  });

  it("não verifica limite ao editar serviço que já estava ativo", async () => {
    db.service.findFirst.mockResolvedValue({ id: "service-1", isActive: true });
    db.service.update.mockResolvedValue({});

    const { updateService } = await import("@/lib/actions/services");
    const result = await updateService(undefined, validForm());

    expect(result).toEqual({ serviceId: "service-1" });
    expect(db.service.count).not.toHaveBeenCalled();
  });
});

describe("toggleServiceStatus", () => {
  const validForm = (nextStatus: "true" | "false") =>
    makeFormData({ serviceId: "service-1", nextStatus });

  beforeEach(() => {
    db.service.findFirst.mockResolvedValue({ id: "service-1", isActive: true });
    db.service.update.mockResolvedValue({});
  });

  it("ativa serviço e redireciona em caso de sucesso", async () => {
    db.service.findFirst.mockResolvedValue({ id: "service-1", isActive: false });
    db.service.count.mockResolvedValue(0);

    const { toggleServiceStatus } = await import("@/lib/actions/services");
    await expect(toggleServiceStatus(validForm("true"))).rejects.toThrow("/dashboard/servicos");

    expect(db.service.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { isActive: true } })
    );
  });

  it("desativa serviço sem verificar limite de plano", async () => {
    const { toggleServiceStatus } = await import("@/lib/actions/services");
    await expect(toggleServiceStatus(validForm("false"))).rejects.toThrow("/dashboard/servicos");

    expect(db.service.count).not.toHaveBeenCalled();
  });

  it("redireciona com erro de limite ao tentar ativar serviço no FREE com 3 ativos", async () => {
    db.service.findFirst.mockResolvedValue({ id: "service-1", isActive: false });
    db.service.count.mockResolvedValue(3);

    const { toggleServiceStatus } = await import("@/lib/actions/services");
    await expect(toggleServiceStatus(validForm("true"))).rejects.toThrow("limit-active-services");
  });

  it("redireciona com ?error=not-found quando serviço não existe", async () => {
    db.service.findFirst.mockResolvedValue(null);

    const { toggleServiceStatus } = await import("@/lib/actions/services");
    await expect(toggleServiceStatus(validForm("true"))).rejects.toThrow(
      "/dashboard/servicos?error=not-found"
    );
  });
});
