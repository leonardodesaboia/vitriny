import { describe, it, expect, vi, beforeEach } from "vitest";

const paymentSearch = vi.fn();
vi.mock("mercadopago", () => ({
  MercadoPagoConfig: vi.fn(),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Payment: vi.fn(function (this: any) {
    this.search = paymentSearch;
  })
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
});

describe("GET /api/billing/invoices", () => {
  it("retorna os pagamentos do Mercado Pago ordenados por data (mais recente primeiro)", async () => {
    findUnique.mockResolvedValue({ id: "p1" });
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

    expect(paymentSearch).toHaveBeenCalledWith({
      options: { external_reference: "p1", sort: "date_created", criteria: "desc", limit: 10 }
    });
    expect(json.invoices).toEqual([
      {
        id: "123456",
        created: Math.floor(new Date("2026-08-01T12:00:00.000-03:00").getTime() / 1000),
        amountPaid: 1990,
        currency: "brl",
        status: "approved",
        hostedUrl: null
      }
    ]);
  });

  it("perfil sem pagamentos ainda responde com lista vazia", async () => {
    findUnique.mockResolvedValue({ id: "p1" });
    paymentSearch.mockResolvedValue({ results: [] });

    const { GET } = await import("@/app/api/billing/invoices/route");
    const response = await GET();
    const json = await response.json();

    expect(paymentSearch).toHaveBeenCalledWith({
      options: { external_reference: "p1", sort: "date_created", criteria: "desc", limit: 10 }
    });
    expect(json.invoices).toEqual([]);
  });

  it("falha ao buscar pagamentos MP nao derruba a rota (retorna lista vazia e 200)", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    findUnique.mockResolvedValue({ id: "p1" });
    paymentSearch.mockRejectedValue(new Error("network error"));

    const { GET } = await import("@/app/api/billing/invoices/route");
    const response = await GET();
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.invoices).toEqual([]);
    expect(consoleErrorSpy).toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });
});
