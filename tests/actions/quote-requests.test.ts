import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeFormData, makePrismaMock, type PrismaMock } from "../helpers";

vi.mock("@/lib/prisma", () => ({ prisma: {} }));
vi.mock("@/lib/actions/auth-guard", () => ({
  requireProviderProfile: vi.fn()
}));
vi.mock("@/lib/email", () => ({
  sendQuoteRequestReceivedEmail: vi.fn()
}));

let db: PrismaMock;
const serviceId = "cm000000000000000000000000";

beforeEach(async () => {
  vi.resetModules();
  const prismaModule = await import("@/lib/prisma");
  db = makePrismaMock();
  Object.assign(prismaModule.prisma, db);
  db.providerProfile.findUnique.mockResolvedValue({
    id: "profile-1",
    plan: "FREE",
    isPublished: true,
    businessName: "OrçaFácil Serviços",
    email: "perfil@example.com",
    user: { email: "conta@example.com" }
  });
  db.service.findFirst.mockResolvedValue({
    id: serviceId,
    name: "Pintura"
  });
  db.quoteRequest.count.mockResolvedValue(0);
  db.quoteRequest.create.mockResolvedValue({
    id: "request-1",
    customerName: "Maria"
  });
});

describe("createQuoteRequest", () => {
  it("envia e-mail ao prestador quando um pedido público é criado", async () => {
    const { sendQuoteRequestReceivedEmail } = await import("@/lib/email");
    const { createQuoteRequest } = await import("@/lib/actions/quote-requests");

    await expect(
      createQuoteRequest(
        "orcafacil",
        makeFormData({
          customerName: "Maria",
          customerEmail: "maria@example.com",
          customerPhone: "11999999999",
          serviceId,
          description: "Preciso pintar a sala."
        })
      )
    ).rejects.toThrow("/u/orcafacil/orcamento?success=1");

    expect(sendQuoteRequestReceivedEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "perfil@example.com",
        businessName: "OrçaFácil Serviços",
        customerName: "Maria",
        serviceName: "Pintura",
        dashboardUrl: expect.stringContaining("/dashboard/pedidos")
      })
    );
  });
});
