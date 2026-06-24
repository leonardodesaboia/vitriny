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

describe("updateQuoteRequestStatus (integração)", () => {
  it("persiste novo status no banco de dados", async () => {
    const { updateQuoteRequestStatus } = await import(
      "@/lib/actions/quote-request-status"
    );
    await expect(
      updateQuoteRequestStatus(makeFormData({ requestId: quoteRequestId, status: "REVIEWING" }))
    ).rejects.toThrow("/dashboard/pedidos");

    const qr = await testDb.quoteRequest.findUnique({ where: { id: quoteRequestId } });
    expect(qr?.status).toBe("REVIEWING");
  });

  it("registra entrada no histórico de status com ator PROVIDER", async () => {
    const { updateQuoteRequestStatus } = await import(
      "@/lib/actions/quote-request-status"
    );
    await expect(
      updateQuoteRequestStatus(makeFormData({ requestId: quoteRequestId, status: "REVIEWING" }))
    ).rejects.toThrow("/dashboard/pedidos");

    const history = await testDb.quoteRequestStatusHistory.findFirst({
      where: { quoteRequestId }
    });

    expect(history?.fromStatus).toBe("NEW");
    expect(history?.toStatus).toBe("REVIEWING");
    expect(history?.actor).toBe("PROVIDER");
    expect(history?.note).toBeTruthy();
  });

  it("não cria histórico duplicado ao atualizar para o mesmo status", async () => {
    const { updateQuoteRequestStatus: update1 } = await import(
      "@/lib/actions/quote-request-status"
    );
    await expect(
      update1(makeFormData({ requestId: quoteRequestId, status: "REVIEWING" }))
    ).rejects.toThrow("/dashboard/pedidos");

    vi.resetModules();
    const { auth } = await import("@/auth");
    vi.mocked(auth).mockResolvedValue({ user: { id: userId } } as never);

    const { updateQuoteRequestStatus: update2 } = await import(
      "@/lib/actions/quote-request-status"
    );
    await expect(
      update2(makeFormData({ requestId: quoteRequestId, status: "REVIEWING" }))
    ).rejects.toThrow("/dashboard/pedidos");

    const count = await testDb.quoteRequestStatusHistory.count({ where: { quoteRequestId } });
    expect(count).toBe(1);
  });

  it("registra transição completa NEW → REVIEWING → CLOSED", async () => {
    const { updateQuoteRequestStatus: toReviewing } = await import(
      "@/lib/actions/quote-request-status"
    );
    await expect(
      toReviewing(makeFormData({ requestId: quoteRequestId, status: "REVIEWING" }))
    ).rejects.toThrow("/dashboard/pedidos");

    vi.resetModules();
    const { auth } = await import("@/auth");
    vi.mocked(auth).mockResolvedValue({ user: { id: userId } } as never);

    const { updateQuoteRequestStatus: toClosed } = await import(
      "@/lib/actions/quote-request-status"
    );
    await expect(
      toClosed(makeFormData({ requestId: quoteRequestId, status: "CLOSED" }))
    ).rejects.toThrow("/dashboard/pedidos");

    const history = await testDb.quoteRequestStatusHistory.findMany({
      where: { quoteRequestId },
      orderBy: { createdAt: "asc" }
    });

    expect(history).toHaveLength(2);
    expect(history[0].fromStatus).toBe("NEW");
    expect(history[0].toStatus).toBe("REVIEWING");
    expect(history[1].fromStatus).toBe("REVIEWING");
    expect(history[1].toStatus).toBe("CLOSED");

    const qr = await testDb.quoteRequest.findUnique({ where: { id: quoteRequestId } });
    expect(qr?.status).toBe("CLOSED");
  });

  it("redireciona com not-found quando pedido pertence a outro prestador", async () => {
    const otherUser = await seedUser("other@test.com");
    const otherProfile = await seedProfile(otherUser.id);
    const otherQr = await seedQuoteRequest(otherProfile.id);

    const { updateQuoteRequestStatus } = await import(
      "@/lib/actions/quote-request-status"
    );
    await expect(
      updateQuoteRequestStatus(makeFormData({ requestId: otherQr.id, status: "REVIEWING" }))
    ).rejects.toThrow("not-found");

    const qr = await testDb.quoteRequest.findUnique({ where: { id: otherQr.id } });
    expect(qr?.status).toBe("NEW");
  });
});
