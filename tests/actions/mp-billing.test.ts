import { describe, it, expect, vi, beforeEach } from "vitest";

const preApprovalCreate = vi.fn();
const preApprovalUpdate = vi.fn();
vi.mock("mercadopago", () => ({
  MercadoPagoConfig: vi.fn(),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  PreApproval: vi.fn(function (this: any) { this.create = preApprovalCreate; this.update = preApprovalUpdate; })
}));

const findUnique = vi.fn();
const update = vi.fn();
vi.mock("@/lib/prisma", () => ({
  prisma: { providerProfile: { findUnique, update } }
}));

vi.mock("@/auth", () => ({ auth: vi.fn(async () => ({ user: { id: "u1" } })) }));

vi.mock("@/lib/mercadopago", () => ({
  getMercadoPago: vi.fn(() => ({}))
}));

beforeEach(() => {
  vi.clearAllMocks();
  process.env.MP_PRO_AMOUNT = "19.90";
  process.env.NEXT_PUBLIC_APP_URL = "https://app.test";
});

describe("createMpCardSubscription", () => {
  it("cria assinatura autorizada por cartao e ativa PRO", async () => {
    findUnique.mockResolvedValue({
      id: "p1", plan: "FREE", mpPreapprovalId: null, stripeSubscriptionId: null
    });
    preApprovalCreate.mockResolvedValue({
      id: "2c93808",
      status: "authorized",
      next_payment_date: "2026-09-03T00:00:00.000Z"
    });

    const { createMpCardSubscription } = await import("@/lib/actions/mp-billing");
    const result = await createMpCardSubscription("card-token-abc", "payer@test.com");

    expect(result).toEqual({ success: true });
    expect(preApprovalCreate).toHaveBeenCalledWith({
      body: expect.objectContaining({
        card_token_id: "card-token-abc",
        status: "authorized",
        payer_email: "payer@test.com",
        external_reference: "p1"
      })
    });
    expect(update).toHaveBeenCalledWith({
      where: { id: "p1" },
      data: {
        mpPreapprovalId: "2c93808",
        plan: "PRO",
        subscriptionStatus: "ACTIVE",
        currentPeriodEnd: new Date("2026-09-03T00:00:00.000Z")
      }
    });
  });

  it("retorna erro quando o MP nao autoriza o cartao", async () => {
    findUnique.mockResolvedValue({
      id: "p1", plan: "FREE", mpPreapprovalId: null, stripeSubscriptionId: null
    });
    preApprovalCreate.mockResolvedValue({ id: "2c93808", status: "pending" });

    const { createMpCardSubscription } = await import("@/lib/actions/mp-billing");
    const result = await createMpCardSubscription("card-token-abc", "payer@test.com");

    expect("error" in result).toBe(true);
    expect(update).not.toHaveBeenCalled();
  });

  it("bloqueia quem ja e PRO com assinatura MP ativa", async () => {
    findUnique.mockResolvedValue({
      id: "p1", plan: "PRO", mpPreapprovalId: "2c93808", stripeSubscriptionId: null
    });

    const { createMpCardSubscription } = await import("@/lib/actions/mp-billing");
    const result = await createMpCardSubscription("card-token-abc", "payer@test.com");

    expect("error" in result).toBe(true);
    expect(preApprovalCreate).not.toHaveBeenCalled();
  });
});

describe("createMpPixSubscription", () => {
  it("cria preapproval pending e retorna initPoint", async () => {
    findUnique.mockResolvedValue({
      id: "p1", plan: "FREE", mpPreapprovalId: null, stripeSubscriptionId: null
    });
    preApprovalCreate.mockResolvedValue({
      id: "2c93808",
      init_point: "https://mp.test/checkout/2c93808"
    });

    const { createMpPixSubscription } = await import("@/lib/actions/mp-billing");
    const result = await createMpPixSubscription("payer@test.com");

    expect(result).toEqual({ initPoint: "https://mp.test/checkout/2c93808" });
    expect(update).toHaveBeenCalledWith({
      where: { id: "p1" },
      data: { mpPreapprovalId: "2c93808" }
    });
  });
});

describe("cancelMpSubscription", () => {
  it("chama update com status cancelled", async () => {
    findUnique.mockResolvedValue({ mpPreapprovalId: "2c93808" });
    preApprovalUpdate.mockResolvedValue({ id: "2c93808", status: "cancelled" });

    const { cancelMpSubscription } = await import("@/lib/actions/mp-billing");
    const result = await cancelMpSubscription();

    expect(result).toEqual({ success: true });
    expect(preApprovalUpdate).toHaveBeenCalledWith({
      id: "2c93808",
      body: { status: "cancelled" }
    });
  });

  it("erro quando nao ha assinatura MP", async () => {
    findUnique.mockResolvedValue({ mpPreapprovalId: null });

    const { cancelMpSubscription } = await import("@/lib/actions/mp-billing");
    const result = await cancelMpSubscription();

    expect("error" in result).toBe(true);
    expect(preApprovalUpdate).not.toHaveBeenCalled();
  });
});
