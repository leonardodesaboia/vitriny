import { describe, it, expect, vi, beforeEach } from "vitest";

const preApprovalGet = vi.fn();
const paymentGet = vi.fn();
const validate = vi.fn();

class FakeInvalidWebhookSignatureError extends Error {}

vi.mock("mercadopago", () => ({
  MercadoPagoConfig: vi.fn(),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  PreApproval: vi.fn(function (this: any) {
    this.get = preApprovalGet;
  }),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Payment: vi.fn(function (this: any) {
    this.get = paymentGet;
  }),
  WebhookSignatureValidator: { validate },
  InvalidWebhookSignatureError: FakeInvalidWebhookSignatureError
}));

const updateMany = vi.fn();
const proPixFindUnique = vi.fn();
const grantProPixPeriodFromMp = vi.fn();
vi.mock("@/lib/prisma", () => ({
  prisma: {
    providerProfile: { updateMany },
    proPixPayment: { findUnique: proPixFindUnique }
  }
}));

vi.mock("@/lib/mercadopago", () => ({
  getMercadoPago: vi.fn(() => ({}))
}));
vi.mock("@/lib/pro-pix", () => ({ grantProPixPeriodFromMp }));

beforeEach(() => {
  vi.clearAllMocks();
  validate.mockImplementation(() => undefined);
  updateMany.mockResolvedValue({ count: 1 });
  proPixFindUnique.mockReset();
  proPixFindUnique.mockResolvedValue(null);
  grantProPixPeriodFromMp.mockReset();
  grantProPixPeriodFromMp.mockResolvedValue("granted");
  process.env.MP_WEBHOOK_SECRET = "test-secret";
});

function makeRequest(body: unknown) {
  return new Request("https://app.test/api/mercadopago/webhook?data.id=preapproval-1", {
    method: "POST",
    headers: {
      "x-signature": "ts=1,v1=abc",
      "x-request-id": "req-1",
      "content-type": "application/json"
    },
    body: JSON.stringify(body)
  });
}

describe("POST /api/mercadopago/webhook", () => {
  it("retorna 401 quando a assinatura e invalida", async () => {
    validate.mockImplementation(() => {
      throw new FakeInvalidWebhookSignatureError("invalid");
    });

    const { POST } = await import("@/app/api/mercadopago/webhook/route");
    const response = await POST(
      makeRequest({ type: "subscription_preapproval", data: { id: "preapproval-1" } })
    );

    expect(response.status).toBe(401);
    expect(updateMany).not.toHaveBeenCalled();
  });

  it("ignora tipos de evento desconhecidos", async () => {
    const { POST } = await import("@/app/api/mercadopago/webhook/route");
    const response = await POST(makeRequest({ type: "topic_claims_integration_wh", data: { id: "x" } }));

    expect(response.status).toBe(200);
    expect(updateMany).not.toHaveBeenCalled();
  });

  it("cancelamento marca cancelAtPeriodEnd em vez de rebaixar na hora", async () => {
    preApprovalGet.mockResolvedValue({ id: "preapproval-1", status: "cancelled" });

    const { POST } = await import("@/app/api/mercadopago/webhook/route");
    const response = await POST(
      makeRequest({ type: "subscription_preapproval", data: { id: "preapproval-1" } })
    );

    expect(response.status).toBe(200);
    expect(updateMany).toHaveBeenCalledWith({
      where: { mpPreapprovalId: "preapproval-1" },
      data: { cancelAtPeriodEnd: true, subscriptionStatus: "CANCELED" }
    });
  });

  it("autorizada ativa o plano e grava subscriptionStatus ACTIVE", async () => {
    preApprovalGet.mockResolvedValue({
      id: "preapproval-1",
      status: "authorized",
      next_payment_date: "2026-09-03T00:00:00.000Z"
    });

    const { POST } = await import("@/app/api/mercadopago/webhook/route");
    const response = await POST(
      makeRequest({ type: "subscription_preapproval", data: { id: "preapproval-1" } })
    );

    expect(response.status).toBe(200);
    expect(updateMany).toHaveBeenCalledWith({
      where: { mpPreapprovalId: "preapproval-1" },
      data: {
        plan: "PRO",
        subscriptionStatus: "ACTIVE",
        currentPeriodEnd: new Date("2026-09-03T00:00:00.000Z"),
        cancelAtPeriodEnd: false
      }
    });
  });

  it("pausada rebaixa na hora (nao e o mesmo caso do cancelamento voluntario)", async () => {
    preApprovalGet.mockResolvedValue({ id: "preapproval-1", status: "paused" });

    const { POST } = await import("@/app/api/mercadopago/webhook/route");
    const response = await POST(
      makeRequest({ type: "subscription_preapproval", data: { id: "preapproval-1" } })
    );

    expect(response.status).toBe(200);
    expect(updateMany).toHaveBeenCalledWith({
      where: { mpPreapprovalId: "preapproval-1" },
      data: {
        plan: "FREE",
        subscriptionStatus: "CANCELED",
        mpPreapprovalId: null,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false
      }
    });
  });

  it("pending nao mexe no perfil", async () => {
    preApprovalGet.mockResolvedValue({ id: "preapproval-1", status: "pending" });

    const { POST } = await import("@/app/api/mercadopago/webhook/route");
    const response = await POST(
      makeRequest({ type: "subscription_preapproval", data: { id: "preapproval-1" } })
    );

    expect(response.status).toBe(200);
    expect(updateMany).not.toHaveBeenCalled();
  });

  it("payment sem preapproval_id no metadata e ignorado (nao ha o que sincronizar)", async () => {
    paymentGet.mockResolvedValue({ id: "payment-1", metadata: {}, external_reference: "profile-1" });

    const { POST } = await import("@/app/api/mercadopago/webhook/route");
    const response = await POST(makeRequest({ type: "payment", data: { id: "payment-1" } }));

    expect(response.status).toBe(200);
    expect(preApprovalGet).not.toHaveBeenCalled();
    expect(updateMany).not.toHaveBeenCalled();
  });

  it("payment aprovado de Pix único concede 30 dias via helper", async () => {
    paymentGet.mockResolvedValue({ id: "payment-9", status: "approved", metadata: { pro_pix_payment_id: "row-1" }, external_reference: "profile-1" });
    const { POST } = await import("@/app/api/mercadopago/webhook/route");
    const response = await POST(makeRequest({ type: "payment", data: { id: "payment-9" } }));
    expect(response.status).toBe(200);
    expect(grantProPixPeriodFromMp).toHaveBeenCalledWith("row-1");
    expect(preApprovalGet).not.toHaveBeenCalled();
  });

  it("payment de Pix único ainda não aprovado não concede", async () => {
    paymentGet.mockResolvedValue({ id: "payment-9", status: "pending", metadata: { pro_pix_payment_id: "row-1" }, external_reference: "profile-1" });
    const { POST } = await import("@/app/api/mercadopago/webhook/route");
    const response = await POST(makeRequest({ type: "payment", data: { id: "payment-9" } }));
    expect(response.status).toBe(200);
    expect(grantProPixPeriodFromMp).not.toHaveBeenCalled();
  });

  it("payment aprovado sem metadata encontra o Pix pelo id da MP", async () => {
    paymentGet.mockResolvedValue({ id: "payment-9", status: "approved", metadata: {} });
    proPixFindUnique.mockResolvedValue({ id: "row-1" });

    const { POST } = await import("@/app/api/mercadopago/webhook/route");
    const response = await POST(makeRequest({ type: "payment", data: { id: "payment-9" } }));

    expect(response.status).toBe(200);
    expect(proPixFindUnique).toHaveBeenCalledWith({
      where: { mpPaymentId: "payment-9" },
      select: { id: true }
    });
    expect(grantProPixPeriodFromMp).toHaveBeenCalledWith("row-1");
  });

  it("subscription_authorized_payment com preapproval_id reivindica perfil ainda sem assinatura MP", async () => {
    paymentGet.mockResolvedValue({
      id: "payment-1",
      metadata: { preapproval_id: "preapproval-plan-1" },
      external_reference: "profile-1"
    });
    preApprovalGet.mockResolvedValue({
      id: "preapproval-plan-1",
      status: "authorized",
      external_reference: "profile-1",
      next_payment_date: "2026-09-03T00:00:00.000Z"
    });
    updateMany.mockResolvedValueOnce({ count: 0 });
    updateMany.mockResolvedValueOnce({ count: 1 });

    const { POST } = await import("@/app/api/mercadopago/webhook/route");
    const response = await POST(
      makeRequest({ type: "subscription_authorized_payment", data: { id: "payment-1" } })
    );

    expect(response.status).toBe(200);
    expect(updateMany).toHaveBeenNthCalledWith(1, {
      where: { mpPreapprovalId: "preapproval-plan-1" },
      data: {
        plan: "PRO",
        subscriptionStatus: "ACTIVE",
        currentPeriodEnd: new Date("2026-09-03T00:00:00.000Z"),
        cancelAtPeriodEnd: false
      }
    });
    expect(updateMany).toHaveBeenNthCalledWith(2, {
      where: { id: "profile-1", mpPreapprovalId: null },
      data: {
        mpPreapprovalId: "preapproval-plan-1",
        plan: "PRO",
        subscriptionStatus: "ACTIVE",
        currentPeriodEnd: new Date("2026-09-03T00:00:00.000Z"),
        cancelAtPeriodEnd: false
      }
    });
  });

  it("subscription_preapproval de cartao autorizado reivindica por external_reference quando a escrita local nunca chegou", async () => {
    // Fluxo de cartao: createMpCardSubscription tambem manda
    // external_reference = id do perfil. Se a preapproval autorizou no MP mas
    // o update local falhou, o perfil fica sem mpPreapprovalId — o webhook
    // cura isso pelo mesmo caminho de fallback usado pelo Pix por plano.
    preApprovalGet.mockResolvedValue({
      id: "preapproval-card-1",
      status: "authorized",
      external_reference: "profile-1",
      next_payment_date: "2026-09-03T00:00:00.000Z"
    });
    updateMany.mockResolvedValueOnce({ count: 0 });
    updateMany.mockResolvedValueOnce({ count: 1 });

    const { POST } = await import("@/app/api/mercadopago/webhook/route");
    const response = await POST(
      makeRequest({ type: "subscription_preapproval", data: { id: "preapproval-card-1" } })
    );

    expect(response.status).toBe(200);
    expect(paymentGet).not.toHaveBeenCalled();
    expect(updateMany).toHaveBeenNthCalledWith(1, {
      where: { mpPreapprovalId: "preapproval-card-1" },
      data: {
        plan: "PRO",
        subscriptionStatus: "ACTIVE",
        currentPeriodEnd: new Date("2026-09-03T00:00:00.000Z"),
        cancelAtPeriodEnd: false
      }
    });
    expect(updateMany).toHaveBeenNthCalledWith(2, {
      where: { id: "profile-1", mpPreapprovalId: null },
      data: {
        mpPreapprovalId: "preapproval-card-1",
        plan: "PRO",
        subscriptionStatus: "ACTIVE",
        currentPeriodEnd: new Date("2026-09-03T00:00:00.000Z"),
        cancelAtPeriodEnd: false
      }
    });
  });

  it("nao reivindica de novo quando o perfil ja tem essa mesma preapproval vinculada", async () => {
    paymentGet.mockResolvedValue({
      id: "payment-1",
      metadata: { preapproval_id: "preapproval-plan-1" },
      external_reference: "profile-1"
    });
    preApprovalGet.mockResolvedValue({
      id: "preapproval-plan-1",
      status: "authorized",
      external_reference: "profile-1",
      next_payment_date: "2026-09-03T00:00:00.000Z"
    });
    updateMany.mockResolvedValueOnce({ count: 1 });

    const { POST } = await import("@/app/api/mercadopago/webhook/route");
    const response = await POST(
      makeRequest({ type: "subscription_authorized_payment", data: { id: "payment-1" } })
    );

    expect(response.status).toBe(200);
    expect(updateMany).toHaveBeenCalledTimes(1);
  });
});
