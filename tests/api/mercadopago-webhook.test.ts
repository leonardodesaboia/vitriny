import { describe, it, expect, vi, beforeEach } from "vitest";

const preApprovalGet = vi.fn();
const validate = vi.fn();

class FakeInvalidWebhookSignatureError extends Error {}

vi.mock("mercadopago", () => ({
  MercadoPagoConfig: vi.fn(),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  PreApproval: vi.fn(function (this: any) {
    this.get = preApprovalGet;
  }),
  WebhookSignatureValidator: { validate },
  InvalidWebhookSignatureError: FakeInvalidWebhookSignatureError
}));

const updateMany = vi.fn();
vi.mock("@/lib/prisma", () => ({
  prisma: { providerProfile: { updateMany } }
}));

vi.mock("@/lib/mercadopago", () => ({
  getMercadoPago: vi.fn(() => ({}))
}));

beforeEach(() => {
  vi.clearAllMocks();
  validate.mockImplementation(() => undefined);
  updateMany.mockResolvedValue({ count: 1 });
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
});
