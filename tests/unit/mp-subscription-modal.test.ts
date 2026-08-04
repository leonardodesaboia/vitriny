import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  cardPaymentProps: null as Record<string, unknown> | null,
  createMpCardSubscription: vi.fn()
}));

vi.mock("@mercadopago/sdk-react", () => ({
  initMercadoPago: vi.fn(),
  CardPayment: (props: Record<string, unknown>) => {
    mocks.cardPaymentProps = props;
    return null;
  }
}));

vi.mock("@/lib/actions/mp-billing", () => ({
  createMpCardSubscription: mocks.createMpCardSubscription
}));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.cardPaymentProps = null;
});

describe("MpSubscriptionModal", () => {
  const mockCardToken = ["card", "token", "abc"].join("-");

  it("permite rolagem e preserva espaco util em telas pequenas", async () => {
    const { MpSubscriptionModal } = await import("@/components/billing/MpSubscriptionModal");

    const html = renderToStaticMarkup(
      createElement(MpSubscriptionModal, {
        amount: 19.9,
        payerEmail: "profile@test.com",
        onClose: vi.fn(),
        onSuccess: vi.fn(),
        onError: vi.fn()
      })
    );

    expect(html).toContain("max-h-[calc(100dvh-1rem)]");
    expect(html).toContain("overflow-y-auto");
    expect(html).toContain("rounded-xl bg-white p-4 shadow-xl");
    expect(html).toContain("sm:p-6");
    expect(html).toContain("min-h-11 min-w-11");
  });

  it("no modo padrao mostra 'Assinar PRO' e nenhum aviso de cobranca imediata", async () => {
    const { MpSubscriptionModal } = await import("@/components/billing/MpSubscriptionModal");

    const html = renderToStaticMarkup(
      createElement(MpSubscriptionModal, {
        amount: 19.9,
        payerEmail: "profile@test.com",
        onClose: vi.fn(),
        onSuccess: vi.fn(),
        onError: vi.fn()
      })
    );

    expect(html).toContain("Assinar PRO");
    expect(html).not.toContain("Reativar assinatura PRO");
    expect(html).not.toContain("cobrado por um novo ciclo");
  });

  it("no modo reativacao avisa que cobra um ciclo novo e perde os dias restantes", async () => {
    const { MpSubscriptionModal } = await import("@/components/billing/MpSubscriptionModal");

    const html = renderToStaticMarkup(
      createElement(MpSubscriptionModal, {
        amount: 19.9,
        payerEmail: "profile@test.com",
        onClose: vi.fn(),
        onSuccess: vi.fn(),
        onError: vi.fn(),
        mode: "reactivate" as const
      })
    );

    expect(html).toContain("Reativar assinatura PRO");
    expect(html).toContain("cobrado por um novo ciclo");
    expect(html).toContain("dias que restavam do per");
  });

  it("envia para o backend o email preenchido no Card Brick", async () => {
    mocks.createMpCardSubscription.mockResolvedValue({ success: true });
    const onSuccess = vi.fn();
    const { MpSubscriptionModal } = await import("@/components/billing/MpSubscriptionModal");

    renderToStaticMarkup(
      createElement(MpSubscriptionModal, {
        amount: 19.9,
        payerEmail: "profile@test.com",
        onClose: vi.fn(),
        onSuccess,
        onError: vi.fn()
      })
    );

    const onSubmit = mocks.cardPaymentProps?.onSubmit as
      | ((formData: { token: string; payer: { email?: string } }) => Promise<void>)
      | undefined;

    expect(onSubmit).toBeTypeOf("function");
    await onSubmit?.({
      token: mockCardToken,
      payer: { email: "buyer@testuser.com" }
    });

    expect(mocks.createMpCardSubscription).toHaveBeenCalledWith(
      mockCardToken,
      "buyer@testuser.com"
    );
    expect(onSuccess).toHaveBeenCalledOnce();
  });

  it("mostra erro amigável se a Server Action lançar uma exceção", async () => {
    mocks.createMpCardSubscription.mockRejectedValue(new Error("network failure"));
    const onError = vi.fn();
    const { MpSubscriptionModal } = await import("@/components/billing/MpSubscriptionModal");

    renderToStaticMarkup(
      createElement(MpSubscriptionModal, {
        amount: 19.9,
        payerEmail: "profile@test.com",
        onClose: vi.fn(),
        onSuccess: vi.fn(),
        onError
      })
    );

    const onSubmit = mocks.cardPaymentProps?.onSubmit as
      | ((formData: { token: string; payer: { email?: string } }) => Promise<void>)
      | undefined;

    await expect(
      onSubmit?.({ token: mockCardToken, payer: { email: "buyer@testuser.com" } })
    ).resolves.toBeUndefined();
    expect(onError).toHaveBeenCalledWith(
      "Não foi possível processar o pagamento. Tente novamente."
    );
  });
});
