import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeFormData, makeSession, makeProfile, makePrismaMock, type PrismaMock } from "../helpers";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: {} }));

let db: PrismaMock;

const validRequestId = "cm000000000000000000000000";

beforeEach(async () => {
  vi.resetModules();
  const { auth } = await import("@/auth");
  const prismaModule = await import("@/lib/prisma");
  db = makePrismaMock();
  Object.assign(prismaModule.prisma, db);
  vi.mocked(auth).mockResolvedValue(makeSession("user-1") as never);
  db.providerProfile.findUnique.mockResolvedValue(makeProfile());
});

describe("createQuoteRequestNote", () => {
  beforeEach(() => {
    db.quoteRequest.findFirst.mockResolvedValue({ id: validRequestId });
    db.quoteRequestInternalNote.create.mockResolvedValue({});
  });

  it("cria nota e retorna sem redirecionar em caso de sucesso", async () => {
    const form = makeFormData({ requestId: validRequestId, content: "Cliente confirmou visita." });

    const { createQuoteRequestNote } = await import("@/lib/actions/quote-request-notes");
    await expect(createQuoteRequestNote(form)).resolves.toBeUndefined();

    expect(db.quoteRequestInternalNote.create).toHaveBeenCalledOnce();
  });

  it("redireciona para /login quando não há sessão", async () => {
    const { auth } = await import("@/auth");
    vi.mocked(auth).mockResolvedValue(null as never);
    const form = makeFormData({ requestId: "request-1", content: "Nota qualquer." });

    const { createQuoteRequestNote } = await import("@/lib/actions/quote-request-notes");
    await expect(createQuoteRequestNote(form)).rejects.toThrow("/login");
  });

  it("redireciona com ?error=profile quando não há perfil", async () => {
    db.providerProfile.findUnique.mockResolvedValue(null);
    const form = makeFormData({ requestId: "request-1", content: "Nota." });

    const { createQuoteRequestNote } = await import("@/lib/actions/quote-request-notes");
    await expect(createQuoteRequestNote(form)).rejects.toThrow(
      "/dashboard/pedidos?error=profile"
    );
  });

  it("redireciona com ?error=invalid quando dados são inválidos", async () => {
    const form = makeFormData({ requestId: "nao-é-cuid", content: "" });

    const { createQuoteRequestNote } = await import("@/lib/actions/quote-request-notes");
    await expect(createQuoteRequestNote(form)).rejects.toThrow(
      "/dashboard/pedidos?error=invalid"
    );
  });

  it("redireciona com ?error=not-found quando pedido não pertence ao prestador", async () => {
    db.quoteRequest.findFirst.mockResolvedValue(null);
    const form = makeFormData({ requestId: validRequestId, content: "Nota qualquer." });

    const { createQuoteRequestNote } = await import("@/lib/actions/quote-request-notes");
    await expect(createQuoteRequestNote(form)).rejects.toThrow(
      "/dashboard/pedidos?error=not-found"
    );
  });

  it("vincula a nota ao userId do autor e ao pedido correto", async () => {
    const form = makeFormData({ requestId: validRequestId, content: "Precisa de orçamento urgente." });

    const { createQuoteRequestNote } = await import("@/lib/actions/quote-request-notes");
    await createQuoteRequestNote(form);

    expect(db.quoteRequestInternalNote.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          authorUserId: "user-1",
          quoteRequestId: validRequestId
        })
      })
    );
  });
});

describe("deleteQuoteRequestNote", () => {
  beforeEach(() => {
    db.quoteRequestInternalNote.findFirst.mockResolvedValue({ id: "note-1" });
    db.quoteRequestInternalNote.delete.mockResolvedValue({});
  });

  it("deleta nota e redireciona em caso de sucesso", async () => {
    const form = makeFormData({ noteId: "note-1" });

    const { deleteQuoteRequestNote } = await import("@/lib/actions/quote-request-notes");
    await expect(deleteQuoteRequestNote(form)).rejects.toThrow("/dashboard/pedidos");

    expect(db.quoteRequestInternalNote.delete).toHaveBeenCalledWith({ where: { id: "note-1" } });
  });

  it("redireciona com ?error=invalid quando noteId está ausente", async () => {
    const form = makeFormData({});

    const { deleteQuoteRequestNote } = await import("@/lib/actions/quote-request-notes");
    await expect(deleteQuoteRequestNote(form)).rejects.toThrow(
      "/dashboard/pedidos?error=invalid"
    );
  });

  it("redireciona com ?error=not-found quando nota não pertence ao prestador", async () => {
    db.quoteRequestInternalNote.findFirst.mockResolvedValue(null);
    const form = makeFormData({ noteId: "note-1" });

    const { deleteQuoteRequestNote } = await import("@/lib/actions/quote-request-notes");
    await expect(deleteQuoteRequestNote(form)).rejects.toThrow(
      "/dashboard/pedidos?error=not-found"
    );
  });
});
