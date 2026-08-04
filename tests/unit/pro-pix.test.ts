import { describe, it, expect, vi, beforeEach } from "vitest";
import { makePrismaMock, type PrismaMock } from "../helpers";

vi.mock("@/lib/prisma", () => ({ prisma: {} }));

let db: PrismaMock;

beforeEach(async () => {
  vi.resetModules();
  const prismaModule = await import("@/lib/prisma");
  db = makePrismaMock();
  Object.assign(prismaModule.prisma, db);
});

describe("nextProPeriodEnd", () => {
  it("estende a partir de agora quando já venceu", async () => {
    const { nextProPeriodEnd } = await import("@/lib/pro-pix");
    const now = new Date("2026-08-04T00:00:00.000Z");
    expect(nextProPeriodEnd(new Date("2020-01-01T00:00:00.000Z"), now)).toEqual(
      new Date("2026-09-03T00:00:00.000Z")
    );
  });

  it("estende a partir do que resta quando ainda não venceu", async () => {
    const { nextProPeriodEnd } = await import("@/lib/pro-pix");
    const now = new Date("2026-08-04T00:00:00.000Z");
    const future = new Date("2026-08-20T00:00:00.000Z");
    expect(nextProPeriodEnd(future, now)).toEqual(new Date("2026-09-19T00:00:00.000Z"));
  });

  it("usa agora quando currentPeriodEnd é null", async () => {
    const { nextProPeriodEnd } = await import("@/lib/pro-pix");
    const now = new Date("2026-08-04T00:00:00.000Z");
    expect(nextProPeriodEnd(null, now)).toEqual(new Date("2026-09-03T00:00:00.000Z"));
  });
});

describe("grantProPixPeriodFromMp", () => {
  it("retorna not_found quando o pagamento não existe", async () => {
    db.proPixPayment.findUnique.mockResolvedValue(null);
    const { grantProPixPeriodFromMp } = await import("@/lib/pro-pix");
    expect(await grantProPixPeriodFromMp("pix-x")).toBe("not_found");
    expect(db.proPixPayment.updateMany).not.toHaveBeenCalled();
  });

  it("retorna already quando já confirmado", async () => {
    db.proPixPayment.findUnique.mockResolvedValue({
      id: "pix-1", providerProfileId: "profile-1", confirmedAt: new Date("2026-01-01")
    });
    const { grantProPixPeriodFromMp } = await import("@/lib/pro-pix");
    expect(await grantProPixPeriodFromMp("pix-1")).toBe("already");
    expect(db.proPixPayment.updateMany).not.toHaveBeenCalled();
  });

  it("concede 30 dias e ativa PRO", async () => {
    db.proPixPayment.findUnique.mockResolvedValue({
      id: "pix-1", providerProfileId: "profile-1", confirmedAt: null
    });
    db.proPixPayment.updateMany.mockResolvedValue({ count: 1 });
    db.providerProfile.findUnique.mockResolvedValue({ currentPeriodEnd: null });
    db.providerProfile.update.mockResolvedValue({});

    const { grantProPixPeriodFromMp } = await import("@/lib/pro-pix");
    expect(await grantProPixPeriodFromMp("pix-1")).toBe("granted");
    expect(db.$transaction).toHaveBeenCalledTimes(1);
    expect(db.proPixPayment.updateMany).toHaveBeenCalledWith({
      where: { id: "pix-1", confirmedAt: null },
      data: { confirmedAt: expect.any(Date) }
    });
    const call = db.providerProfile.update.mock.calls[0][0];
    expect(call.where).toEqual({ id: "profile-1" });
    expect(call.data.plan).toBe("PRO");
    expect(call.data.currentPeriodEnd.getTime()).toBeGreaterThan(Date.now());
  });

  it("retorna already quando a trava atômica perde a corrida", async () => {
    db.proPixPayment.findUnique.mockResolvedValue({
      id: "pix-1", providerProfileId: "profile-1", confirmedAt: null
    });
    db.proPixPayment.updateMany.mockResolvedValue({ count: 0 });
    const { grantProPixPeriodFromMp } = await import("@/lib/pro-pix");
    expect(await grantProPixPeriodFromMp("pix-1")).toBe("already");
    expect(db.providerProfile.update).not.toHaveBeenCalled();
  });
});
