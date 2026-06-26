import { randomUUID } from "node:crypto";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { cleanDatabase, testDb } from "./setup";
import { makeFormData, seedProfile, seedQuoteRequest, seedUser } from "./helpers";

vi.mock("@/auth", () => ({ auth: vi.fn() }));

let userId: string;
let profileId: string;
let quoteRequestId: string;

beforeEach(async () => {
  vi.resetModules();
  await cleanDatabase();

  const user = await seedUser();
  userId = user.id;
  const profile = await seedProfile(userId);
  profileId = profile.id;
  const qr = await seedQuoteRequest(profileId);
  quoteRequestId = qr.id;

  const { auth } = await import("@/auth");
  vi.mocked(auth).mockResolvedValue({ user: { id: userId } } as never);
});

const validForm = (requestId: string) =>
  makeFormData({
    requestId,
    title: "Proposta de Pintura",
    description: "",
    validUntil: "",
    itemDescription: ["Mão de obra"],
    itemQuantity: ["2"],
    itemUnitPrice: ["150.00"]
  });

describe("createProposal (integração)", () => {
  it("persiste proposta com status SENT e itens corretos", async () => {
    const { createProposal } = await import("@/lib/actions/proposals");
    await expect(createProposal(undefined, validForm(quoteRequestId))).rejects.toThrow(
      "/dashboard/pedidos"
    );

    const proposal = await testDb.proposal.findFirst({
      where: { quoteRequestId },
      include: { items: true }
    });

    expect(proposal?.status).toBe("SENT");
    expect(proposal?.title).toBe("Proposta de Pintura");
    expect(proposal?.items).toHaveLength(1);
    expect(proposal?.items[0].description).toBe("Mão de obra");
    expect(proposal?.items[0].quantity).toBe(2);
  });

  it("calcula totalAmount corretamente com base nos itens", async () => {
    const { createProposal } = await import("@/lib/actions/proposals");
    await expect(createProposal(undefined, validForm(quoteRequestId))).rejects.toThrow(
      "/dashboard/pedidos"
    );

    const proposal = await testDb.proposal.findFirst({ where: { quoteRequestId } });
    expect(Number(proposal?.totalAmount)).toBe(300);
  });

  it("calcula totalAmount corretamente com múltiplos itens", async () => {
    const form = makeFormData({
      requestId: quoteRequestId,
      title: "Proposta",
      description: "",
      validUntil: "",
      itemDescription: ["Mão de obra", "Tinta"],
      itemQuantity: ["3", "5"],
      itemUnitPrice: ["100.00", "20.00"]
    });

    const { createProposal } = await import("@/lib/actions/proposals");
    await expect(createProposal(undefined, form)).rejects.toThrow("/dashboard/pedidos");

    const proposal = await testDb.proposal.findFirst({ where: { quoteRequestId } });
    expect(Number(proposal?.totalAmount)).toBe(400);
  });

  it("atualiza status do pedido para PROPOSAL_SENT", async () => {
    const { createProposal } = await import("@/lib/actions/proposals");
    await expect(createProposal(undefined, validForm(quoteRequestId))).rejects.toThrow(
      "/dashboard/pedidos"
    );

    const qr = await testDb.quoteRequest.findUnique({ where: { id: quoteRequestId } });
    expect(qr?.status).toBe("PROPOSAL_SENT");
  });

  it("registra histórico do pedido com transição para PROPOSAL_SENT", async () => {
    const { createProposal } = await import("@/lib/actions/proposals");
    await expect(createProposal(undefined, validForm(quoteRequestId))).rejects.toThrow(
      "/dashboard/pedidos"
    );

    const history = await testDb.quoteRequestStatusHistory.findFirst({
      where: { quoteRequestId }
    });
    expect(history?.fromStatus).toBe("NEW");
    expect(history?.toStatus).toBe("PROPOSAL_SENT");
    expect(history?.actor).toBe("PROVIDER");
  });

  it("gera publicToken único para cada proposta", async () => {
    const qr2 = await seedQuoteRequest(profileId);

    const { createProposal: create1 } = await import("@/lib/actions/proposals");
    await expect(create1(undefined, validForm(quoteRequestId))).rejects.toThrow("/dashboard/pedidos");

    vi.resetModules();
    const { auth } = await import("@/auth");
    vi.mocked(auth).mockResolvedValue({ user: { id: userId } } as never);

    const { createProposal: create2 } = await import("@/lib/actions/proposals");
    await expect(create2(undefined, validForm(qr2.id))).rejects.toThrow("/dashboard/pedidos");

    const proposals = await testDb.proposal.findMany({ where: { providerId: profileId } });
    expect(proposals).toHaveLength(2);
    expect(proposals[0].publicToken).not.toBe(proposals[1].publicToken);
  });

  it("bloqueia criação quando limite FREE de 5 propostas mensais é atingido", async () => {
    for (let i = 0; i < 5; i++) {
      const qr = await seedQuoteRequest(profileId);
      await testDb.proposal.create({
        data: {
          providerId: profileId,
          quoteRequestId: qr.id,
          title: `Proposta ${i}`,
          totalAmount: 100,
          status: "SENT",
          publicToken: randomUUID()
        }
      });
    }

    const { createProposal } = await import("@/lib/actions/proposals");
    await expect(createProposal(undefined, validForm(quoteRequestId))).rejects.toThrow(
      "limit-monthly-proposals"
    );

    const total = await testDb.proposal.count({ where: { providerId: profileId } });
    expect(total).toBe(5);
  });

  it("plano PRO cria proposta mesmo acima do limite FREE", async () => {
    await testDb.providerProfile.update({
      where: { id: profileId },
      data: { plan: "PRO" }
    });

    for (let i = 0; i < 10; i++) {
      const qr = await seedQuoteRequest(profileId);
      await testDb.proposal.create({
        data: {
          providerId: profileId,
          quoteRequestId: qr.id,
          title: `Proposta ${i}`,
          totalAmount: 100,
          status: "SENT",
          publicToken: randomUUID()
        }
      });
    }

    const { createProposal } = await import("@/lib/actions/proposals");
    await expect(createProposal(undefined, validForm(quoteRequestId))).rejects.toThrow(
      "/dashboard/pedidos"
    );

    const total = await testDb.proposal.count({ where: { providerId: profileId } });
    expect(total).toBe(11);
  });

  it("rejeita segundo envio para pedido que já tem proposta", async () => {
    const { createProposal: firstCreate } = await import("@/lib/actions/proposals");
    await expect(firstCreate(undefined, validForm(quoteRequestId))).rejects.toThrow("/dashboard/pedidos");

    vi.resetModules();
    const { auth } = await import("@/auth");
    vi.mocked(auth).mockResolvedValue({ user: { id: userId } } as never);

    const { createProposal: secondCreate } = await import("@/lib/actions/proposals");
    expect(await secondCreate(undefined, validForm(quoteRequestId))).toEqual({ error: expect.any(String) });

    const count = await testDb.proposal.count({ where: { quoteRequestId } });
    expect(count).toBe(1);
  });
});
