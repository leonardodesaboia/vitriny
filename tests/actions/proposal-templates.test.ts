import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeFormData, makeSession, makeProfile, makePrismaMock, type PrismaMock } from "../helpers";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: {} }));

let db: PrismaMock;
const templatesPath = "/dashboard/propostas/templates";

beforeEach(async () => {
  vi.resetModules();
  const { auth } = await import("@/auth");
  const prismaModule = await import("@/lib/prisma");
  db = makePrismaMock();
  Object.assign(prismaModule.prisma, db);
  vi.mocked(auth).mockResolvedValue(makeSession() as never);
  db.providerProfile.findUnique.mockResolvedValue(makeProfile());
  db.proposalTemplate.count.mockResolvedValue(0);
  db.proposalTemplate.create.mockResolvedValue({});
});

const validTemplateForm = () =>
  makeFormData({
    name: "Template Padrão",
    title: "Proposta de Serviço",
    description: "",
    itemDescription: ["Mão de obra"],
    itemQuantity: ["1"],
    itemUnitPrice: ["200.00"]
  });

describe("createProposalTemplate", () => {
  it("cria template e redireciona em caso de sucesso", async () => {
    const { createProposalTemplate } = await import("@/lib/actions/proposal-templates");
    await expect(createProposalTemplate(undefined, validTemplateForm())).rejects.toThrow(
      templatesPath
    );

    expect(db.proposalTemplate.create).toHaveBeenCalledOnce();
  });

  it("redireciona para /login quando não há sessão", async () => {
    const { auth } = await import("@/auth");
    vi.mocked(auth).mockResolvedValue(null as never);

    const { createProposalTemplate } = await import("@/lib/actions/proposal-templates");
    await expect(createProposalTemplate(undefined, validTemplateForm())).rejects.toThrow("/login");
  });

  it("redireciona com ?error=profile quando não há perfil", async () => {
    db.providerProfile.findUnique.mockResolvedValue(null);

    const { createProposalTemplate } = await import("@/lib/actions/proposal-templates");
    await expect(createProposalTemplate(undefined, validTemplateForm())).rejects.toThrow(
      `${templatesPath}?error=profile`
    );
  });

  it("retorna erro de validação quando nome está vazio", async () => {
    const form = makeFormData({
      name: "",
      title: "Proposta de Serviço",
      description: "",
      itemDescription: ["Mão de obra"],
      itemQuantity: ["1"],
      itemUnitPrice: ["200.00"]
    });

    const { createProposalTemplate } = await import("@/lib/actions/proposal-templates");
    const result = await createProposalTemplate(undefined, form);

    expect(result).toEqual({ error: expect.stringContaining("inválido") });
    expect(db.proposalTemplate.create).not.toHaveBeenCalled();
  });

  it("retorna erro quando limite de templates FREE (1) é atingido", async () => {
    db.proposalTemplate.count.mockResolvedValue(1);

    const { createProposalTemplate } = await import("@/lib/actions/proposal-templates");
    const result = await createProposalTemplate(undefined, validTemplateForm());

    expect(result).toEqual({ error: expect.any(String) });
    expect(db.proposalTemplate.create).not.toHaveBeenCalled();
  });

  it("prestador PRO cria template mesmo com 10+ existentes", async () => {
    db.providerProfile.findUnique.mockResolvedValue(makeProfile({ plan: "PRO" }));
    db.proposalTemplate.count.mockResolvedValue(50);

    const { createProposalTemplate } = await import("@/lib/actions/proposal-templates");
    await expect(createProposalTemplate(undefined, validTemplateForm())).rejects.toThrow(
      templatesPath
    );

    expect(db.proposalTemplate.create).toHaveBeenCalledOnce();
  });

  it("filtra itens com descrição e preço vazios", async () => {
    const form = makeFormData({
      name: "Template",
      title: "Proposta",
      description: "",
      itemDescription: ["Mão de obra", ""],
      itemQuantity: ["1", "1"],
      itemUnitPrice: ["200.00", ""]
    });

    const { createProposalTemplate } = await import("@/lib/actions/proposal-templates");
    await expect(createProposalTemplate(undefined, form)).rejects.toThrow(templatesPath);

    const callArg = db.proposalTemplate.create.mock.calls[0]?.[0];
    expect(callArg?.data?.items?.create).toHaveLength(1);
  });
});

describe("updateProposalTemplate", () => {
  const templateId = "cm000000000000000000000000";

  beforeEach(() => {
    db.proposalTemplate.findFirst.mockResolvedValue({ id: templateId });
    db.proposalTemplateItem.deleteMany.mockResolvedValue({});
    db.proposalTemplateItem.createMany.mockResolvedValue({});
  });

  const validUpdateForm = () =>
    makeFormData({
      templateId,
      name: "Template Atualizado",
      title: "Proposta Atualizada",
      description: "",
      itemDescription: ["Mão de obra"],
      itemQuantity: ["1"],
      itemUnitPrice: ["300.00"]
    });

  it("atualiza template e redireciona em caso de sucesso", async () => {
    const { updateProposalTemplate } = await import("@/lib/actions/proposal-templates");
    await expect(updateProposalTemplate(undefined, validUpdateForm())).rejects.toThrow(
      templatesPath
    );

    expect(db.proposalTemplateItem.deleteMany).toHaveBeenCalledOnce();
    expect(db.proposalTemplateItem.createMany).toHaveBeenCalledOnce();
  });

  it("retorna erro de validação quando dados são inválidos", async () => {
    const form = makeFormData({
      templateId,
      name: "",
      title: "Proposta",
      description: "",
      itemDescription: ["Item"],
      itemQuantity: ["1"],
      itemUnitPrice: ["100.00"]
    });

    const { updateProposalTemplate } = await import("@/lib/actions/proposal-templates");
    const result = await updateProposalTemplate(undefined, form);

    expect(result).toEqual({ error: expect.stringContaining("inválido") });
    expect(db.proposalTemplateItem.deleteMany).not.toHaveBeenCalled();
  });

  it("redireciona com ?error=not-found quando template não pertence ao prestador", async () => {
    db.proposalTemplate.findFirst.mockResolvedValue(null);

    const { updateProposalTemplate } = await import("@/lib/actions/proposal-templates");
    await expect(updateProposalTemplate(undefined, validUpdateForm())).rejects.toThrow(
      `${templatesPath}?error=not-found`
    );
  });
});

describe("deleteProposalTemplate", () => {
  const templateId = "cm000000000000000000000000";

  beforeEach(() => {
    db.proposalTemplate.findFirst.mockResolvedValue({ id: templateId });
    db.proposalTemplate.delete.mockResolvedValue({});
  });

  it("deleta template e redireciona em caso de sucesso", async () => {
    const form = makeFormData({ templateId });

    const { deleteProposalTemplate } = await import("@/lib/actions/proposal-templates");
    await expect(deleteProposalTemplate(form)).rejects.toThrow(templatesPath);

    expect(db.proposalTemplate.delete).toHaveBeenCalledWith({ where: { id: templateId } });
  });

  it("redireciona com ?error=invalid quando templateId está ausente", async () => {
    const form = makeFormData({});

    const { deleteProposalTemplate } = await import("@/lib/actions/proposal-templates");
    await expect(deleteProposalTemplate(form)).rejects.toThrow(
      `${templatesPath}?error=invalid`
    );
  });

  it("redireciona com ?error=not-found quando template não pertence ao prestador", async () => {
    db.proposalTemplate.findFirst.mockResolvedValue(null);
    const form = makeFormData({ templateId });

    const { deleteProposalTemplate } = await import("@/lib/actions/proposal-templates");
    await expect(deleteProposalTemplate(form)).rejects.toThrow(
      `${templatesPath}?error=not-found`
    );
  });
});
