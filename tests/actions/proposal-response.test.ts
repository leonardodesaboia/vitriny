import { beforeEach, describe, expect, it, vi } from "vitest";
import { makePrismaMock, type PrismaMock } from "../helpers";

vi.mock("@/lib/prisma", () => ({ prisma: {} }));
vi.mock("@/lib/email", () => ({
  sendProposalResponseEmail: vi.fn()
}));

let db: PrismaMock;

beforeEach(async () => {
  vi.resetModules();
  const prismaModule = await import("@/lib/prisma");
  db = makePrismaMock();
  Object.assign(prismaModule.prisma, db);
  db.proposal.findUnique.mockResolvedValue({
    id: "proposal-1",
    quoteRequestId: "request-1",
    status: "SENT",
    validUntil: null,
    quoteRequest: {
      status: "PROPOSAL_SENT",
      customerName: "Maria"
    },
    provider: {
      businessName: "OrçaFácil Serviços",
      email: "perfil@example.com",
      user: { email: "conta@example.com" }
    }
  });
  db.proposal.updateMany.mockResolvedValue({ count: 1 });
  db.proposalStatusHistory.create.mockResolvedValue({});
  db.quoteRequest.update.mockResolvedValue({});
  db.quoteRequestStatusHistory.create.mockResolvedValue({});
});

describe("respondToProposal", () => {
  it("envia e-mail ao prestador quando cliente aprova proposta", async () => {
    const { sendProposalResponseEmail } = await import("@/lib/email");
    const { respondToProposal } = await import("@/lib/actions/proposal-response");

    await expect(respondToProposal("token-publico", "APPROVED")).rejects.toThrow(
      "/proposta/token-publico?response=approved"
    );

    expect(sendProposalResponseEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "perfil@example.com",
        businessName: "OrçaFácil Serviços",
        customerName: "Maria",
        response: "APPROVED",
        proposalUrl: expect.stringContaining("/proposta/token-publico")
      })
    );
  });
});
