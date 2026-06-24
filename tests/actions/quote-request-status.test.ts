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

describe("updateQuoteRequestStatus", () => {
  const validForm = (status = "REVIEWING") =>
    makeFormData({ requestId: "request-1", status });

  beforeEach(() => {
    db.quoteRequest.findFirst.mockResolvedValue({ id: "request-1", status: "NEW" });
    db.quoteRequest.update.mockResolvedValue({});
    db.quoteRequestStatusHistory.create.mockResolvedValue({});
  });

  it("atualiza status e redireciona para /dashboard/pedidos em caso de sucesso", async () => {
    const { updateQuoteRequestStatus } = await import("@/lib/actions/quote-request-status");
    await expect(updateQuoteRequestStatus(validForm())).rejects.toThrow("/dashboard/pedidos");

    expect(db.quoteRequest.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: "REVIEWING" } })
    );
  });

  it("redireciona para /login quando não há sessão", async () => {
    const { auth } = await import("@/auth");
    vi.mocked(auth).mockResolvedValue(null as never);

    const { updateQuoteRequestStatus } = await import("@/lib/actions/quote-request-status");
    await expect(updateQuoteRequestStatus(validForm())).rejects.toThrow("/login");
  });

  it("redireciona com ?error=profile quando não há perfil", async () => {
    db.providerProfile.findUnique.mockResolvedValue(null);

    const { updateQuoteRequestStatus } = await import("@/lib/actions/quote-request-status");
    await expect(updateQuoteRequestStatus(validForm())).rejects.toThrow(
      "/dashboard/pedidos?error=profile"
    );
  });

  it("redireciona com ?error=invalid quando requestId está ausente", async () => {
    const form = makeFormData({ status: "REVIEWING" });

    const { updateQuoteRequestStatus } = await import("@/lib/actions/quote-request-status");
    await expect(updateQuoteRequestStatus(form)).rejects.toThrow(
      "/dashboard/pedidos?error=invalid"
    );
  });

  it("redireciona com ?error=invalid quando status é inválido", async () => {
    const form = makeFormData({ requestId: "request-1", status: "STATUS_INVALIDO" });

    const { updateQuoteRequestStatus } = await import("@/lib/actions/quote-request-status");
    await expect(updateQuoteRequestStatus(form)).rejects.toThrow(
      "/dashboard/pedidos?error=invalid"
    );
  });

  it("redireciona com ?error=not-found quando pedido não pertence ao prestador", async () => {
    db.quoteRequest.findFirst.mockResolvedValue(null);

    const { updateQuoteRequestStatus } = await import("@/lib/actions/quote-request-status");
    await expect(updateQuoteRequestStatus(validForm())).rejects.toThrow(
      "/dashboard/pedidos?error=not-found"
    );
  });

  it("não atualiza quando o status é o mesmo que o atual", async () => {
    db.quoteRequest.findFirst.mockResolvedValue({ id: "request-1", status: "REVIEWING" });

    const { updateQuoteRequestStatus } = await import("@/lib/actions/quote-request-status");
    await expect(updateQuoteRequestStatus(validForm("REVIEWING"))).rejects.toThrow(
      "/dashboard/pedidos"
    );

    expect(db.quoteRequest.update).not.toHaveBeenCalled();
    expect(db.quoteRequestStatusHistory.create).not.toHaveBeenCalled();
  });

  it("registra histórico de mudança de status com ator PROVIDER", async () => {
    const { updateQuoteRequestStatus } = await import("@/lib/actions/quote-request-status");
    await expect(updateQuoteRequestStatus(validForm())).rejects.toThrow("/dashboard/pedidos");

    expect(db.quoteRequestStatusHistory.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          fromStatus: "NEW",
          toStatus: "REVIEWING",
          actor: "PROVIDER"
        })
      })
    );
  });

  it("aceita todos os status válidos: REVIEWING, CLOSED", async () => {
    const { updateQuoteRequestStatus } = await import("@/lib/actions/quote-request-status");

    for (const status of ["REVIEWING", "CLOSED"]) {
      db.quoteRequest.update.mockClear();
      await expect(updateQuoteRequestStatus(validForm(status))).rejects.toThrow(
        "/dashboard/pedidos"
      );
    }
  });
});
