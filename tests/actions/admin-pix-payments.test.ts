import { beforeEach, describe, expect, it, vi } from "vitest";
import { makePrismaMock, type PrismaMock } from "../helpers";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: {} }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

let db: PrismaMock;

beforeEach(async () => {
  vi.resetModules();
  process.env.ADMIN_EMAIL = "admin@vitriny.app";

  const prismaModule = await import("@/lib/prisma");
  db = makePrismaMock();
  Object.assign(prismaModule.prisma, db);

  const authModule = await import("@/auth");
  vi.mocked(authModule.auth).mockResolvedValue(
    { user: { id: "user-1", email: "admin@vitriny.app" } } as never
  );
});

describe("confirmProPixPayment", () => {
  it("rejeita quando o e-mail da sessão não é admin", async () => {
    const { auth } = await import("@/auth");
    vi.mocked(auth).mockResolvedValue({ user: { id: "user-2", email: "outro@x.com" } } as never);

    const { confirmProPixPayment } = await import("@/lib/actions/admin-pix-payments");
    expect(await confirmProPixPayment("pix-1")).toEqual({ error: "Não autorizado." });
  });

  it("retorna erro quando o pagamento não existe", async () => {
    db.proPixPayment.findFirst.mockResolvedValue(null);

    const { confirmProPixPayment } = await import("@/lib/actions/admin-pix-payments");
    expect(await confirmProPixPayment("pix-inexistente")).toEqual({
      error: "Pagamento não encontrado."
    });
  });

  it("é idempotente quando já foi confirmado", async () => {
    db.proPixPayment.findFirst.mockResolvedValue({
      id: "pix-1",
      confirmedAt: new Date("2026-01-01"),
      providerProfileId: "profile-1"
    });

    const { confirmProPixPayment } = await import("@/lib/actions/admin-pix-payments");
    expect(await confirmProPixPayment("pix-1")).toEqual({ success: true });
    expect(db.proPixPayment.update).not.toHaveBeenCalled();
  });

  it("confirma e estende currentPeriodEnd a partir de agora quando já venceu", async () => {
    db.proPixPayment.findFirst.mockResolvedValue({
      id: "pix-1",
      confirmedAt: null,
      providerProfileId: "profile-1"
    });
    db.proPixPayment.update.mockResolvedValue({});
    db.providerProfile.findUnique.mockResolvedValue({
      id: "profile-1",
      currentPeriodEnd: new Date("2020-01-01")
    });
    db.providerProfile.update.mockResolvedValue({});

    const { confirmProPixPayment } = await import("@/lib/actions/admin-pix-payments");
    expect(await confirmProPixPayment("pix-1")).toEqual({ success: true });

    expect(db.proPixPayment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "pix-1" },
        data: expect.objectContaining({ confirmedAt: expect.any(Date) })
      })
    );
    const updateCall = db.providerProfile.update.mock.calls[0][0];
    expect(updateCall.data.plan).toBe("PRO");
    expect(updateCall.data.currentPeriodEnd.getTime()).toBeGreaterThan(Date.now());
  });

  it("estende currentPeriodEnd a partir do que resta quando ainda não venceu", async () => {
    const future = new Date(Date.now() + 1000 * 60 * 60 * 24 * 10); // 10 dias no futuro
    db.proPixPayment.findFirst.mockResolvedValue({
      id: "pix-1",
      confirmedAt: null,
      providerProfileId: "profile-1"
    });
    db.proPixPayment.update.mockResolvedValue({});
    db.providerProfile.findUnique.mockResolvedValue({
      id: "profile-1",
      currentPeriodEnd: future
    });
    db.providerProfile.update.mockResolvedValue({});

    const { confirmProPixPayment } = await import("@/lib/actions/admin-pix-payments");
    await confirmProPixPayment("pix-1");

    const updateCall = db.providerProfile.update.mock.calls[0][0];
    const expectedMinimum = future.getTime() + 1000 * 60 * 60 * 24 * 29; // ~30 dias a partir do future
    expect(updateCall.data.currentPeriodEnd.getTime()).toBeGreaterThan(expectedMinimum);
  });
});

describe("listPendingProPixPayments", () => {
  it("lança quando o e-mail da sessão não é admin", async () => {
    const { auth } = await import("@/auth");
    vi.mocked(auth).mockResolvedValue({ user: { id: "user-2", email: "outro@x.com" } } as never);

    const { listPendingProPixPayments } = await import("@/lib/actions/admin-pix-payments");
    await expect(listPendingProPixPayments()).rejects.toThrow("/login");
  });

  it("busca pagamentos com clientPaidAt preenchido e confirmedAt vazio", async () => {
    db.proPixPayment.findMany.mockResolvedValue([]);

    const { listPendingProPixPayments } = await import("@/lib/actions/admin-pix-payments");
    await listPendingProPixPayments();

    expect(db.proPixPayment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { clientPaidAt: { not: null }, confirmedAt: null }
      })
    );
  });
});
