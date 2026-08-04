import { describe, it, expect, vi, beforeEach } from "vitest";

const paymentSearch = vi.fn();
vi.mock("mercadopago", () => ({
  MercadoPagoConfig: vi.fn(),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Payment: vi.fn(function (this: any) {
    this.search = paymentSearch;
  })
}));

const stripeInvoicesList = vi.fn();
vi.mock("@/lib/stripe", () => ({
  stripe: { invoices: { list: stripeInvoicesList } }
}));

const findUnique = vi.fn();
vi.mock("@/lib/prisma", () => ({
  prisma: { providerProfile: { findUnique } }
}));

vi.mock("@/auth", () => ({ auth: vi.fn(async () => ({ user: { id: "u1" } })) }));
vi.mock("@/lib/mercadopago", () => ({ getMercadoPago: vi.fn(() => ({})) }));

beforeEach(() => {
  vi.clearAllMocks();
  paymentSearch.mockResolvedValue({ results: [] });
  stripeInvoicesList.mockResolvedValue({ data: [] });
});

describe("GET /api/billing/invoices", () => {
  it("mescla faturas Stripe e pagamentos MP ordenados por data (mais recente primeiro)", async () => {
    findUnique.mockResolvedValue({ id: "p1", stripeCustomerId: "cus_1" });
    stripeInvoicesList.mockResolvedValue({
      data: [
        {
          id: "in_1",
          created: 1750000000,
          amount_paid: 1990,
          currency: "brl",
          status: "paid",
          hosted_invoice_url: "https://stripe.test/in_1"
        }
      ]
    });
    paymentSearch.mockResolvedValue({
      results: [
        {
          id: 123456,
          date_created: "2026-08-01T12:00:00.000-03:00",
          transaction_amount: 19.9,
          currency_id: "BRL",
          status: "approved"
        }
      ]
    });

    const { GET } = await import("@/app/api/billing/invoices/route");
    const response = await GET();
    const json = await response.json();

    expect(json.invoices).toEqual([
      {
        id: "123456",
        created: Math.floor(new Date("2026-08-01T12:00:00.000-03:00").getTime() / 1000),
        amountPaid: 1990,
        currency: "brl",
        status: "approved",
        hostedUrl: null
      },
      {
        id: "in_1",
        created: 1750000000,
        amountPaid: 1990,
        currency: "brl",
        status: "paid",
        hostedUrl: "https://stripe.test/in_1"
      }
    ]);
  });

  it("perfil sem stripeCustomerId ainda busca pagamentos MP", async () => {
    findUnique.mockResolvedValue({ id: "p1", stripeCustomerId: null });
    paymentSearch.mockResolvedValue({ results: [] });

    const { GET } = await import("@/app/api/billing/invoices/route");
    const response = await GET();
    const json = await response.json();

    expect(stripeInvoicesList).not.toHaveBeenCalled();
    expect(paymentSearch).toHaveBeenCalledWith({
      options: { external_reference: "p1", sort: "date_created", criteria: "desc", limit: 10 }
    });
    expect(json.invoices).toEqual([]);
  });

  it("falha ao buscar pagamentos MP nao derruba a rota, faturas Stripe continuam aparecendo", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    findUnique.mockResolvedValue({ id: "p1", stripeCustomerId: "cus_1" });
    stripeInvoicesList.mockResolvedValue({
      data: [
        {
          id: "in_1",
          created: 1750000000,
          amount_paid: 1990,
          currency: "brl",
          status: "paid",
          hosted_invoice_url: "https://stripe.test/in_1"
        }
      ]
    });
    paymentSearch.mockRejectedValue(new Error("network error"));

    const { GET } = await import("@/app/api/billing/invoices/route");
    const response = await GET();
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.invoices).toEqual([
      {
        id: "in_1",
        created: 1750000000,
        amountPaid: 1990,
        currency: "brl",
        status: "paid",
        hostedUrl: "https://stripe.test/in_1"
      }
    ]);
    expect(consoleErrorSpy).toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });
});
