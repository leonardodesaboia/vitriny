import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/actions/mp-billing", () => ({
  cancelMpSubscription: vi.fn(),
  createMpPixPayment: vi.fn(),
  createMpPixSubscription: vi.fn()
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() })
}));
vi.mock("@mercadopago/sdk-react", () => ({
  initMercadoPago: vi.fn(),
  CardPayment: () => null
}));

const baseProps = {
  plan: "PRO" as const,
  subscriptionStatus: "CANCELED" as const,
  currentPeriodEnd: new Date("2026-09-03"),
  cancelAtPeriodEnd: true,
  hasActiveSubscription: true,
  payerEmail: "profile@test.com",
  proAmount: 19.9,
  pixAvailable: false,
  mpPixAvailable: false
};

describe("BillingCard - reativacao", () => {
  it("assinante MP cancelado ve o botao de reativar (reabre o Card Brick)", async () => {
    const { BillingCard } = await import("@/components/billing/BillingCard");

    const html = renderToStaticMarkup(createElement(BillingCard, baseProps));

    expect(html).toContain("Reativar assinatura");
  });
});

describe("opcoes de pagamento da assinatura FREE", () => {
  const freeProps = {
    plan: "FREE" as const,
    subscriptionStatus: null,
    currentPeriodEnd: null,
    cancelAtPeriodEnd: false,
    hasActiveSubscription: false,
    payerEmail: "profile@test.com",
    proAmount: 19.9,
    mpPixAvailable: false
  };

  it("mostra cartao sempre e Pix so quando pixAvailable", async () => {
    const { BillingCard } = await import("@/components/billing/BillingCard");

    const withoutPix = renderToStaticMarkup(
      createElement(BillingCard, { ...freeProps, pixAvailable: false })
    );
    expect(withoutPix).toContain("Assinar com cart");
    expect(withoutPix).not.toContain("Assinar com Pix");

    const withPix = renderToStaticMarkup(
      createElement(BillingCard, { ...freeProps, pixAvailable: true })
    );
    expect(withPix).toContain("Assinar com Pix");
  });
});
