import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeFormData, makeSession, makeProfile, makePrismaMock, type PrismaMock } from "../helpers";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: {} }));
vi.mock("@/lib/email", () => ({
  sendProposalSentEmail: vi.fn()
}));

let db: PrismaMock;

const validRequestId = "cm000000000000000000000000";

beforeEach(async () => {
  vi.resetModules();
  const { auth } = await import("@/auth");
  const prismaModule = await import("@/lib/prisma");
  db = makePrismaMock();
  Object.assign(prismaModule.prisma, db);
  vi.mocked(auth).mockResolvedValue(makeSession() as never);
  db.providerProfile.findUnique.mockResolvedValue(makeProfile());
  db.quoteRequest.findFirst.mockResolvedValue({
    id: validRequestId,
    status: "NEW",
    proposal: null
  });
  db.proposal.count.mockResolvedValue(0);
  db.proposal.create.mockResolvedValue({});
  db.quoteRequest.update.mockResolvedValue({});
  db.quoteRequestStatusHistory.create.mockResolvedValue({});
});

const validProposalForm = () =>
  makeFormData({
    pricingMode: "ITEMIZED",
    requestId: validRequestId,
    title: "Proposta de Pintura",
    description: "",
    validUntil: "",
    itemDescription: ["Mão de obra"],
    itemQuantity: ["2"],
    itemUnitPrice: ["150.00"]
  });

describe("createProposal", () => {
  it("cria proposta e redireciona para /dashboard/pedidos em caso de sucesso", async () => {
    const { createProposal } = await import("@/lib/actions/proposals");
    await expect(createProposal(undefined, validProposalForm())).rejects.toThrow("/dashboard/pedidos");

    expect(db.proposal.create).toHaveBeenCalledOnce();
  });

  it("redireciona para /login quando não há sessão", async () => {
    const { auth } = await import("@/auth");
    vi.mocked(auth).mockResolvedValue(null as never);

    const { createProposal } = await import("@/lib/actions/proposals");
    await expect(createProposal(undefined, validProposalForm())).rejects.toThrow("/login");
  });

  it("redireciona com ?error=profile quando não há perfil", async () => {
    db.providerProfile.findUnique.mockResolvedValue(null);

    const { createProposal } = await import("@/lib/actions/proposals");
    await expect(createProposal(undefined, validProposalForm())).rejects.toThrow(
      "/dashboard/pedidos?error=profile"
    );
  });

  it("retorna erro quando os dados são inválidos (não redireciona)", async () => {
    const form = makeFormData({
      pricingMode: "ITEMIZED",
      requestId: "nao-e-um-cuid-valido",
      description: "",
      validUntil: "",
      itemDescription: ["Item"],
      itemQuantity: ["1"],
      itemUnitPrice: ["100.00"]
    });

    const { createProposal } = await import("@/lib/actions/proposals");
    expect(await createProposal(undefined, form)).toEqual({ error: expect.any(String) });

    expect(db.proposal.create).not.toHaveBeenCalled();
  });

  it("redireciona com ?error=not-found quando o pedido não pertence ao prestador", async () => {
    db.quoteRequest.findFirst.mockResolvedValue(null);

    const { createProposal } = await import("@/lib/actions/proposals");
    await expect(createProposal(undefined, validProposalForm())).rejects.toThrow(
      "/dashboard/pedidos?error=not-found"
    );
  });

  it("retorna erro quando o pedido já tem proposta (não redireciona)", async () => {
    db.quoteRequest.findFirst.mockResolvedValue({
      id: validRequestId,
      status: "PROPOSAL_SENT",
      proposal: { id: "proposal-existente" }
    });

    const { createProposal } = await import("@/lib/actions/proposals");
    expect(await createProposal(undefined, validProposalForm())).toEqual({ error: expect.any(String) });
  });

  it("retorna erro e não cria proposta quando o pedido é de serviço com preço fixo", async () => {
    db.quoteRequest.findFirst.mockResolvedValue({
      id: validRequestId,
      status: "NEW",
      proposal: null,
      service: { pricingType: "FIXED" }
    });

    const { createProposal } = await import("@/lib/actions/proposals");
    expect(await createProposal(undefined, validProposalForm())).toEqual({ error: expect.any(String) });

    expect(db.proposal.create).not.toHaveBeenCalled();
  });

  it("calcula totalAmount corretamente: quantidade × preço unitário", async () => {
    const { createProposal } = await import("@/lib/actions/proposals");
    await expect(createProposal(undefined, validProposalForm())).rejects.toThrow("/dashboard/pedidos");

    const callArg = db.proposal.create.mock.calls[0]?.[0];
    expect(callArg?.data?.totalAmount?.toString()).toBe("300");
  });

  it("calcula totalAmount com múltiplos itens", async () => {
    const form = makeFormData({
      requestId: validRequestId,
      title: "Proposta",
      description: "",
      validUntil: "",
      itemDescription: ["Mão de obra", "Tinta"],
      itemQuantity: ["2", "5"],
      itemUnitPrice: ["100.00", "30.00"]
    });

    const { createProposal } = await import("@/lib/actions/proposals");
    await expect(createProposal(undefined, form)).rejects.toThrow("/dashboard/pedidos");

    const callArg = db.proposal.create.mock.calls[0]?.[0];
    expect(callArg?.data?.totalAmount?.toString()).toBe("350");
  });

  it("não cria proposta quando limite mensal FREE (5) é atingido", async () => {
    db.proposal.count.mockResolvedValue(5);

    const { createProposal } = await import("@/lib/actions/proposals");
    await expect(createProposal(undefined, validProposalForm())).rejects.toThrow(
      "limit-monthly-proposals"
    );

    expect(db.proposal.create).not.toHaveBeenCalled();
  });

  it("prestador PRO cria proposta mesmo com 100+ no mês", async () => {
    db.providerProfile.findUnique.mockResolvedValue(makeProfile({ plan: "PRO" }));
    db.proposal.count.mockResolvedValue(100);

    const { createProposal } = await import("@/lib/actions/proposals");
    await expect(createProposal(undefined, validProposalForm())).rejects.toThrow("/dashboard/pedidos");

    expect(db.proposal.create).toHaveBeenCalledOnce();
  });

  it("atualiza status do pedido para PROPOSAL_SENT após criar proposta", async () => {
    const { createProposal } = await import("@/lib/actions/proposals");
    await expect(createProposal(undefined, validProposalForm())).rejects.toThrow("/dashboard/pedidos");

    expect(db.quoteRequest.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: "PROPOSAL_SENT" } })
    );
  });

  it("cria proposta com status SENT (não DRAFT)", async () => {
    const { createProposal } = await import("@/lib/actions/proposals");
    await expect(createProposal(undefined, validProposalForm())).rejects.toThrow("/dashboard/pedidos");

    const callArg = db.proposal.create.mock.calls[0]?.[0];
    expect(callArg?.data?.status).toBe("SENT");
  });

  it("envia e-mail ao cliente quando cria proposta para pedido com e-mail", async () => {
    const { sendProposalSentEmail } = await import("@/lib/email");
    db.providerProfile.findUnique.mockResolvedValue(
      makeProfile({ businessName: "OrçaFácil Serviços" })
    );
    db.quoteRequest.findFirst.mockResolvedValue({
      id: validRequestId,
      status: "NEW",
      customerName: "Maria",
      customerEmail: "maria@example.com",
      proposal: null,
      service: { pricingType: "CUSTOM" }
    });
    db.proposal.create.mockResolvedValue({
      id: "proposal-1",
      publicToken: "token-publico"
    });

    const { createProposal } = await import("@/lib/actions/proposals");
    await expect(createProposal(undefined, validProposalForm())).rejects.toThrow(
      "notice=proposal-email-sent"
    );

    expect(sendProposalSentEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "maria@example.com",
        businessName: "OrçaFácil Serviços",
        customerName: "Maria",
        proposalUrl: expect.stringContaining("/proposta/token-publico")
      })
    );
  });

  it("avisa quando o pedido não tem e-mail do cliente", async () => {
    db.quoteRequest.findFirst.mockResolvedValue({
      id: validRequestId,
      status: "NEW",
      customerName: "Maria",
      customerEmail: null,
      proposal: null,
      service: { pricingType: "CUSTOM" }
    });
    db.proposal.create.mockResolvedValue({
      id: "proposal-1",
      publicToken: "token-publico"
    });

    const { createProposal } = await import("@/lib/actions/proposals");
    await expect(createProposal(undefined, validProposalForm())).rejects.toThrow(
      "warning=proposal-email-missing"
    );
  });

  it("avisa quando o envio de e-mail da proposta falha", async () => {
    const { sendProposalSentEmail } = await import("@/lib/email");
    vi.mocked(sendProposalSentEmail).mockRejectedValueOnce(new Error("resend failed"));
    db.quoteRequest.findFirst.mockResolvedValue({
      id: validRequestId,
      status: "NEW",
      customerName: "Maria",
      customerEmail: "maria@example.com",
      proposal: null,
      service: { pricingType: "CUSTOM" }
    });
    db.proposal.create.mockResolvedValue({
      id: "proposal-1",
      publicToken: "token-publico"
    });

    const { createProposal } = await import("@/lib/actions/proposals");
    await expect(createProposal(undefined, validProposalForm())).rejects.toThrow(
      "warning=proposal-email-failed"
    );
  });
});
