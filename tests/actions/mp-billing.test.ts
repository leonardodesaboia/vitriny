import { describe, it, expect, vi, beforeEach } from "vitest";

const preApprovalCreate = vi.fn();
const preApprovalUpdate = vi.fn();
const paymentCreate = vi.fn();
const paymentGet = vi.fn();
vi.mock("mercadopago", () => ({
  MercadoPagoConfig: vi.fn(),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  PreApproval: vi.fn(function (this: any) { this.create = preApprovalCreate; this.update = preApprovalUpdate; }),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Payment: vi.fn(function (this: any) { this.create = paymentCreate; this.get = paymentGet; })
}));

const findUnique = vi.fn();
const update = vi.fn();
const updateMany = vi.fn();
const proPixCreate = vi.fn();
const proPixFindFirst = vi.fn();
const proPixFindUnique = vi.fn();
const proPixUpdate = vi.fn();
const proPixDelete = vi.fn();
vi.mock("@/lib/prisma", () => ({
  prisma: {
    providerProfile: { findUnique, update, updateMany },
    proPixPayment: { create: proPixCreate, findFirst: proPixFindFirst, findUnique: proPixFindUnique, update: proPixUpdate, delete: proPixDelete }
  }
}));

vi.mock("@/auth", () => ({ auth: vi.fn(async () => ({ user: { id: "u1" } })) }));

vi.mock("@/lib/mercadopago", () => ({
  getMercadoPago: vi.fn(() => ({}))
}));

beforeEach(() => {
  vi.clearAllMocks();
  preApprovalCreate.mockReset();
  preApprovalUpdate.mockReset();
  paymentCreate.mockReset();
  paymentGet.mockReset();
  proPixCreate.mockReset();
  proPixFindFirst.mockReset();
  proPixFindUnique.mockReset();
  proPixUpdate.mockReset();
  proPixDelete.mockReset();
  updateMany.mockReset();
  updateMany.mockResolvedValue({ count: 1 });
  process.env.MP_PRO_AMOUNT = "19.90";
  process.env.NEXT_PUBLIC_APP_URL = "https://app.test";
  delete process.env.MP_PRO_PLAN_INIT_POINT;
});

describe("createMpCardSubscription", () => {
  it("cria assinatura autorizada por cartao e ativa PRO", async () => {
    findUnique.mockResolvedValue({
      id: "p1", plan: "FREE", mpPreapprovalId: null, stripeSubscriptionId: null, cancelAtPeriodEnd: false
    });
    preApprovalCreate.mockResolvedValue({
      id: "2c93808",
      status: "authorized",
      payer_id: 123456,
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
    expect(updateMany).toHaveBeenCalledWith({
      where: {
        id: "p1",
        OR: [
          { mpSubscriptionLockedAt: null },
          { mpSubscriptionLockedAt: { lt: expect.any(Date) } }
        ]
      },
      data: { mpSubscriptionLockedAt: expect.any(Date) }
    });
    expect(update).toHaveBeenCalledWith({
      where: { id: "p1" },
      data: {
        mpPreapprovalId: "2c93808",
        mpPayerId: "123456",
        plan: "PRO",
        subscriptionStatus: "ACTIVE",
        cancelAtPeriodEnd: false,
        mpSubscriptionLockedAt: null,
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
    expect(update).toHaveBeenCalledWith({
      where: { id: "p1" },
      data: { mpSubscriptionLockedAt: null }
    });
  });

  it("retorna erro amigavel quando o SDK do MP falha", async () => {
    findUnique.mockResolvedValue({
      id: "p1", plan: "FREE", mpPreapprovalId: null, stripeSubscriptionId: null
    });
    preApprovalCreate.mockRejectedValue(new Error("mercado pago unavailable"));
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);

    const { createMpCardSubscription } = await import("@/lib/actions/mp-billing");
    const result = await createMpCardSubscription("card-token-abc", "payer@test.com");

    expect(result).toEqual({
      error: "Não foi possível processar o cartão agora. Tente novamente."
    });
    expect(update).toHaveBeenCalledWith({
      where: { id: "p1" },
      data: { mpSubscriptionLockedAt: null }
    });
    expect(consoleError).toHaveBeenCalledWith(
      "Erro ao criar assinatura Mercado Pago por cartão.",
      expect.objectContaining({
        profileId: "p1",
        errorName: "Error",
        errorMessage: "mercado pago unavailable"
      })
    );

    consoleError.mockRestore();
  });

  it("rejeita dados de cartão ou email inválidos antes de chamar o MP", async () => {
    findUnique.mockResolvedValue({
      id: "p1", plan: "FREE", mpPreapprovalId: null, stripeSubscriptionId: null
    });

    const { createMpCardSubscription } = await import("@/lib/actions/mp-billing");
    const result = await createMpCardSubscription("card-token-abc", "email-invalido");

    expect(result).toEqual({ error: "Confira os dados do cartão e do pagador." });
    expect(preApprovalCreate).not.toHaveBeenCalled();
  });

  it("cancela a preapproval se o banco falhar depois da autorização", async () => {
    findUnique.mockResolvedValue({
      id: "p1", plan: "FREE", mpPreapprovalId: null, stripeSubscriptionId: null
    });
    preApprovalCreate.mockResolvedValue({
      id: "mp-authorized-1",
      status: "authorized",
      next_payment_date: "2026-09-03T00:00:00.000Z"
    });
    update.mockRejectedValueOnce(new Error("database unavailable"));
    preApprovalUpdate.mockResolvedValue({ id: "mp-authorized-1", status: "cancelled" });
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);

    const { createMpCardSubscription } = await import("@/lib/actions/mp-billing");
    const result = await createMpCardSubscription("card-token-abc", "payer@test.com");

    expect(preApprovalUpdate).toHaveBeenCalledWith({
      id: "mp-authorized-1",
      body: { status: "cancelled" }
    });
    expect(result).toEqual({
      error:
        "A assinatura foi autorizada, mas não conseguimos atualizar seu plano. Não tente novamente agora; entre em contato com o suporte."
    });
    consoleError.mockRestore();
  });

  it("bloqueia quem ja e PRO com assinatura MP ativa", async () => {
    findUnique.mockResolvedValue({
      id: "p1", plan: "PRO", mpPreapprovalId: "2c93808", stripeSubscriptionId: null, cancelAtPeriodEnd: false
    });

    const { createMpCardSubscription } = await import("@/lib/actions/mp-billing");
    const result = await createMpCardSubscription("card-token-abc", "payer@test.com");

    expect("error" in result).toBe(true);
    expect(preApprovalCreate).not.toHaveBeenCalled();
  });

  it("permite reativar (nova preapproval) quando cancelAtPeriodEnd e true", async () => {
    findUnique.mockResolvedValue({
      id: "p1", plan: "PRO", mpPreapprovalId: "old-preapproval", stripeSubscriptionId: null, cancelAtPeriodEnd: true
    });
    preApprovalCreate.mockResolvedValue({
      id: "new-preapproval",
      status: "authorized",
      next_payment_date: "2026-09-03T00:00:00.000Z"
    });

    const { createMpCardSubscription } = await import("@/lib/actions/mp-billing");
    const result = await createMpCardSubscription("card-token-abc", "payer@test.com");

    expect(result).toEqual({ success: true });
    expect(preApprovalCreate).toHaveBeenCalled();
    expect(update).toHaveBeenCalledWith({
      where: { id: "p1" },
      data: expect.objectContaining({ mpPreapprovalId: "new-preapproval", cancelAtPeriodEnd: false })
    });
  });

  it("recusa nova tentativa quando ja ha uma assinatura em andamento (trava ativa)", async () => {
    findUnique.mockResolvedValue({
      id: "p1", plan: "FREE", mpPreapprovalId: null, stripeSubscriptionId: null, cancelAtPeriodEnd: false
    });
    updateMany.mockResolvedValue({ count: 0 });

    const { createMpCardSubscription } = await import("@/lib/actions/mp-billing");
    const result = await createMpCardSubscription("card-token-abc", "payer@test.com");

    expect(result).toEqual({
      error: "Já existe uma tentativa de assinatura em andamento. Aguarde um instante e tente novamente."
    });
    expect(preApprovalCreate).not.toHaveBeenCalled();
  });
});

describe("createMpPixSubscription", () => {
  it("bloqueia o fluxo enquanto Pix Automatico nao esta habilitado", async () => {
    findUnique.mockResolvedValue({
      id: "p1", plan: "FREE", mpPreapprovalId: null, stripeSubscriptionId: null
    });

    const { createMpPixSubscription } = await import("@/lib/actions/mp-billing");
    const result = await createMpPixSubscription("payer@test.com");

    expect(result).toEqual({
      error: "Pix Automático ainda não está disponível para esta assinatura."
    });
    expect(preApprovalCreate).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });

  it("retorna o initPoint do plano com external_reference quando o Pix por plano esta configurado", async () => {
    process.env.MP_PRO_PLAN_INIT_POINT =
      "https://www.mercadopago.com.br/subscriptions/checkout?preapproval_plan_id=plan-1";
    findUnique.mockResolvedValue({
      id: "p1", plan: "FREE", mpPreapprovalId: null, stripeSubscriptionId: null, cancelAtPeriodEnd: false
    });

    const { createMpPixSubscription } = await import("@/lib/actions/mp-billing");
    const result = await createMpPixSubscription("payer@test.com");

    expect(result).toEqual({
      initPoint:
        "https://www.mercadopago.com.br/subscriptions/checkout?preapproval_plan_id=plan-1&external_reference=p1"
    });
    expect(preApprovalCreate).not.toHaveBeenCalled();
  });

  it("rejeita email invalido mesmo com o Pix por plano configurado", async () => {
    process.env.MP_PRO_PLAN_INIT_POINT =
      "https://www.mercadopago.com.br/subscriptions/checkout?preapproval_plan_id=plan-1";
    findUnique.mockResolvedValue({
      id: "p1", plan: "FREE", mpPreapprovalId: null, stripeSubscriptionId: null, cancelAtPeriodEnd: false
    });

    const { createMpPixSubscription } = await import("@/lib/actions/mp-billing");
    const result = await createMpPixSubscription("email-invalido");

    expect(result).toEqual({ error: "Confira o e-mail do pagador." });
  });
});

describe("cancelMpSubscription", () => {
  it("cancela no MP e marca cancelAtPeriodEnd em vez de rebaixar na hora", async () => {
    findUnique.mockResolvedValue({ id: "p1", mpPreapprovalId: "2c93808" });
    preApprovalUpdate.mockResolvedValue({ id: "2c93808", status: "cancelled" });

    const { cancelMpSubscription } = await import("@/lib/actions/mp-billing");
    const result = await cancelMpSubscription();

    expect(result).toEqual({ success: true });
    expect(preApprovalUpdate).toHaveBeenCalledWith({
      id: "2c93808",
      body: { status: "cancelled" }
    });
    expect(update).toHaveBeenCalledWith({
      where: { id: "p1" },
      data: { cancelAtPeriodEnd: true, subscriptionStatus: "CANCELED" }
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

describe("createMpPixPayment", () => {
  it("cria pagamento Pix na MP e retorna QR", async () => {
    findUnique.mockResolvedValue({ id: "p1", plan: "FREE", mpPreapprovalId: null, stripeSubscriptionId: null, cancelAtPeriodEnd: false });
    proPixFindFirst.mockResolvedValue(null);
    proPixCreate.mockResolvedValue({ id: "row-1" });
    paymentCreate.mockResolvedValue({ id: 12345, status: "pending", point_of_interaction: { transaction_data: { qr_code: "COPIA-E-COLA", qr_code_base64: "BASE64PNG" } } });
    proPixUpdate.mockResolvedValue({});

    const { createMpPixPayment } = await import("@/lib/actions/mp-billing");
    const result = await createMpPixPayment("payer@test.com");
    expect(result).toEqual({ qrCode: "COPIA-E-COLA", qrCodeBase64: "BASE64PNG", paymentId: "row-1", expiresAt: expect.any(String) });
    expect(paymentCreate).toHaveBeenCalledWith(expect.objectContaining({ body: expect.objectContaining({ transaction_amount: 19.9, payment_method_id: "pix", payer: { email: "payer@test.com" }, external_reference: "p1", metadata: { pro_pix_payment_id: "row-1" } }), requestOptions: { idempotencyKey: "row-1" } }));
    expect(proPixUpdate).toHaveBeenCalledWith({ where: { id: "row-1" }, data: { mpPaymentId: "12345", expiresAt: expect.any(Date) } });
  });

  it("reaproveita o pendente não-expirado", async () => {
    findUnique.mockResolvedValue({ id: "p1", plan: "FREE", mpPreapprovalId: null, stripeSubscriptionId: null, cancelAtPeriodEnd: false });
    proPixFindFirst.mockResolvedValue({ id: "row-old", mpPaymentId: "999", expiresAt: new Date(Date.now() + 60000) });
    paymentGet.mockResolvedValue({ id: 999, point_of_interaction: { transaction_data: { qr_code: "OLD-COPIA", qr_code_base64: "OLD-BASE64" } } });
    const { createMpPixPayment } = await import("@/lib/actions/mp-billing");
    expect(await createMpPixPayment("payer@test.com")).toEqual({ qrCode: "OLD-COPIA", qrCodeBase64: "OLD-BASE64", paymentId: "row-old", expiresAt: expect.any(String) });
    expect(paymentCreate).not.toHaveBeenCalled();
    expect(paymentGet).toHaveBeenCalledWith({ id: "999" });
  });

  it("bloqueia quem já é PRO", async () => {
    findUnique.mockResolvedValue({ id: "p1", plan: "PRO", mpPreapprovalId: "sub-1", stripeSubscriptionId: null, cancelAtPeriodEnd: false });
    const { createMpPixPayment } = await import("@/lib/actions/mp-billing");
    expect("error" in (await createMpPixPayment("payer@test.com"))).toBe(true);
    expect(paymentCreate).not.toHaveBeenCalled();
  });

  it("rejeita email inválido antes de chamar a MP", async () => {
    findUnique.mockResolvedValue({ id: "p1", plan: "FREE", mpPreapprovalId: null, stripeSubscriptionId: null, cancelAtPeriodEnd: false });
    const { createMpPixPayment } = await import("@/lib/actions/mp-billing");
    expect(await createMpPixPayment("email-invalido")).toEqual({ error: "Confira o e-mail do pagador." });
    expect(paymentCreate).not.toHaveBeenCalled();
  });

  it("remove a row local quando a MP falha ao criar o pagamento", async () => {
    findUnique.mockResolvedValue({ id: "p1", plan: "FREE", mpPreapprovalId: null, stripeSubscriptionId: null, cancelAtPeriodEnd: false });
    proPixFindFirst.mockResolvedValue(null);
    proPixCreate.mockResolvedValue({ id: "row-1" });
    paymentCreate.mockRejectedValue(new Error("MP indisponível"));
    proPixDelete.mockResolvedValue({});
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);

    const { createMpPixPayment } = await import("@/lib/actions/mp-billing");
    expect(await createMpPixPayment("payer@test.com")).toEqual({
      error: "Não foi possível gerar o Pix agora. Tente novamente."
    });
    expect(proPixDelete).toHaveBeenCalledWith({ where: { id: "row-1" } });
    consoleError.mockRestore();
  });
});

describe("getMpPixPaymentStatus", () => {
  it("retorna confirmed", async () => {
    findUnique.mockResolvedValue({ id: "p1" });
    proPixFindFirst.mockResolvedValue({ id: "row-1", confirmedAt: new Date(), expiresAt: new Date(Date.now() + 60000) });
    const { getMpPixPaymentStatus } = await import("@/lib/actions/mp-billing");
    expect(await getMpPixPaymentStatus("row-1")).toEqual({ status: "confirmed" });
  });

  it("retorna expired", async () => {
    findUnique.mockResolvedValue({ id: "p1" });
    proPixFindFirst.mockResolvedValue({ id: "row-1", confirmedAt: null, expiresAt: new Date(Date.now() - 1000) });
    const { getMpPixPaymentStatus } = await import("@/lib/actions/mp-billing");
    expect(await getMpPixPaymentStatus("row-1")).toEqual({ status: "expired" });
  });

  it("retorna pending", async () => {
    findUnique.mockResolvedValue({ id: "p1" });
    proPixFindFirst.mockResolvedValue({ id: "row-1", confirmedAt: null, expiresAt: new Date(Date.now() + 60000) });
    const { getMpPixPaymentStatus } = await import("@/lib/actions/mp-billing");
    expect(await getMpPixPaymentStatus("row-1")).toEqual({ status: "pending" });
  });
});
