import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { makePrismaMock, makeSession, type PrismaMock } from "../helpers";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: {} }));
vi.mock("@/lib/stripe", () => ({ stripe: {} }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/pix", () => ({ createPixPayment: vi.fn() }));

let db: PrismaMock;
let stripeApi: Record<string, Record<string, ReturnType<typeof vi.fn>>>;

beforeEach(async () => {
  vi.resetModules();

  const prismaModule = await import("@/lib/prisma");
  db = makePrismaMock();
  Object.assign(prismaModule.prisma, db);

  const stripeModule = await import("@/lib/stripe");
  stripeApi = {
    subscriptions: { update: vi.fn() },
    setupIntents: { create: vi.fn() },
    paymentMethods: { retrieve: vi.fn() },
    customers: { create: vi.fn() },
    checkout: { sessions: { create: vi.fn() } },
    billingPortal: { sessions: { create: vi.fn() } },
    prices: { retrieve: vi.fn() }
  };
  Object.assign(stripeModule.stripe, stripeApi);

  const authModule = await import("@/auth");
  vi.mocked(authModule.auth).mockResolvedValue(makeSession() as never);
});

// ─── cancelSubscription ───────────────────────────────────────────────────────

describe("cancelSubscription", () => {
  it("retorna erro quando não autenticado", async () => {
    const { auth } = await import("@/auth");
    vi.mocked(auth).mockResolvedValue(null);

    const { cancelSubscription } = await import("@/lib/actions/billing");
    expect(await cancelSubscription()).toEqual({ error: "Não autenticado." });
  });

  it("retorna erro quando não há assinatura", async () => {
    db.providerProfile.findUnique.mockResolvedValue({ stripeSubscriptionId: null });

    const { cancelSubscription } = await import("@/lib/actions/billing");
    expect(await cancelSubscription()).toEqual({ error: "Assinatura não encontrada." });
  });

  it("agenda cancelamento no fim do período e retorna sucesso", async () => {
    db.providerProfile.findUnique.mockResolvedValue({
      stripeSubscriptionId: "sub_test"
    });
    db.providerProfile.update = vi.fn().mockResolvedValue({});
    stripeApi.subscriptions.update.mockResolvedValue({});

    const { cancelSubscription } = await import("@/lib/actions/billing");
    expect(await cancelSubscription()).toEqual({ success: true });

    expect(stripeApi.subscriptions.update).toHaveBeenCalledWith("sub_test", {
      cancel_at_period_end: true
    });
    expect(db.providerProfile.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { cancelAtPeriodEnd: true } })
    );
  });
});

// ─── reactivateSubscription ───────────────────────────────────────────────────

describe("reactivateSubscription", () => {
  it("retorna erro quando não há assinatura", async () => {
    db.providerProfile.findUnique.mockResolvedValue({ stripeSubscriptionId: null });

    const { reactivateSubscription } = await import("@/lib/actions/billing");
    expect(await reactivateSubscription()).toEqual({ error: "Assinatura não encontrada." });
  });

  it("remove agendamento de cancelamento e retorna sucesso", async () => {
    db.providerProfile.findUnique.mockResolvedValue({
      stripeSubscriptionId: "sub_test"
    });
    db.providerProfile.update = vi.fn().mockResolvedValue({});
    stripeApi.subscriptions.update.mockResolvedValue({});

    const { reactivateSubscription } = await import("@/lib/actions/billing");
    expect(await reactivateSubscription()).toEqual({ success: true });

    expect(stripeApi.subscriptions.update).toHaveBeenCalledWith("sub_test", {
      cancel_at_period_end: false
    });
    expect(db.providerProfile.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { cancelAtPeriodEnd: false } })
    );
  });
});

// ─── setDefaultPaymentMethod ──────────────────────────────────────────────────

describe("setDefaultPaymentMethod", () => {
  const PM_ID = "pm_test_123";
  const CUSTOMER_ID = "cus_test_456";
  const SUB_ID = "sub_test_789";

  beforeEach(() => {
    db.providerProfile.findUnique.mockResolvedValue({
      stripeCustomerId: CUSTOMER_ID,
      stripeSubscriptionId: SUB_ID
    });
  });

  it("retorna erro quando não autenticado", async () => {
    const { auth } = await import("@/auth");
    vi.mocked(auth).mockResolvedValue(null);

    const { setDefaultPaymentMethod } = await import("@/lib/actions/billing");
    expect(await setDefaultPaymentMethod(PM_ID)).toEqual({ error: "Não autenticado." });
  });

  it("retorna erro quando não há assinatura", async () => {
    db.providerProfile.findUnique.mockResolvedValue({
      stripeCustomerId: CUSTOMER_ID,
      stripeSubscriptionId: null
    });

    const { setDefaultPaymentMethod } = await import("@/lib/actions/billing");
    expect(await setDefaultPaymentMethod(PM_ID)).toEqual({
      error: "Assinatura não encontrada."
    });
  });

  it("rejeita payment method de outro customer", async () => {
    stripeApi.paymentMethods.retrieve.mockResolvedValue({
      customer: "cus_outro"
    });

    const { setDefaultPaymentMethod } = await import("@/lib/actions/billing");
    expect(await setDefaultPaymentMethod(PM_ID)).toEqual({
      error: "Forma de pagamento inválida."
    });
    expect(stripeApi.subscriptions.update).not.toHaveBeenCalled();
  });

  it("aplica PM e retorna sucesso quando o customer bate", async () => {
    stripeApi.paymentMethods.retrieve.mockResolvedValue({ customer: CUSTOMER_ID });
    stripeApi.subscriptions.update.mockResolvedValue({});

    const { setDefaultPaymentMethod } = await import("@/lib/actions/billing");
    expect(await setDefaultPaymentMethod(PM_ID)).toEqual({ success: true });

    expect(stripeApi.paymentMethods.retrieve).toHaveBeenCalledWith(PM_ID);
    expect(stripeApi.subscriptions.update).toHaveBeenCalledWith(SUB_ID, {
      default_payment_method: PM_ID
    });
  });
});

// ─── createSetupIntent ────────────────────────────────────────────────────────

describe("createSetupIntent", () => {
  it("retorna erro quando não há stripeCustomerId", async () => {
    db.providerProfile.findUnique.mockResolvedValue({ stripeCustomerId: null });

    const { createSetupIntent } = await import("@/lib/actions/billing");
    expect(await createSetupIntent()).toEqual({
      error: "Cliente Stripe não encontrado."
    });
  });

  it("retorna clientSecret do setup intent", async () => {
    db.providerProfile.findUnique.mockResolvedValue({ stripeCustomerId: "cus_test" });
    stripeApi.setupIntents.create.mockResolvedValue({ client_secret: "seti_secret" });

    const { createSetupIntent } = await import("@/lib/actions/billing");
    expect(await createSetupIntent()).toEqual({ clientSecret: "seti_secret" });

    expect(stripeApi.setupIntents.create).toHaveBeenCalledWith(
      expect.objectContaining({ customer: "cus_test", usage: "off_session" })
    );
  });
});

// ─── createCheckoutSession ────────────────────────────────────────────────────

describe("createCheckoutSession", () => {
  it("retorna erro se já é PRO", async () => {
    db.providerProfile.findUnique.mockResolvedValue({
      id: "profile-1",
      stripeCustomerId: "cus_test",
      plan: "PRO"
    });

    const { createCheckoutSession } = await import("@/lib/actions/billing");
    expect(await createCheckoutSession()).toEqual({ error: "Você já tem o plano PRO." });
    expect(stripeApi.checkout.sessions.create).not.toHaveBeenCalled();
  });

  it("cria customer Stripe quando não existe e retorna clientSecret", async () => {
    db.providerProfile.findUnique.mockResolvedValue({
      id: "profile-1",
      stripeCustomerId: null,
      plan: "FREE"
    });
    db.providerProfile.update = vi.fn().mockResolvedValue({});

    const findUser = vi.fn().mockResolvedValue({ email: "user@test.com", name: "User" });
    const prismaModule = await import("@/lib/prisma");
    (prismaModule.prisma as Record<string, unknown>).user = { findUnique: findUser };

    stripeApi.customers.create.mockResolvedValue({ id: "cus_novo" });
    stripeApi.checkout.sessions.create.mockResolvedValue({ client_secret: "cs_secret" });

    const { createCheckoutSession } = await import("@/lib/actions/billing");
    expect(await createCheckoutSession()).toEqual({ clientSecret: "cs_secret" });

    expect(stripeApi.customers.create).toHaveBeenCalledWith(
      expect.objectContaining({ email: "user@test.com" })
    );
    expect(stripeApi.checkout.sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({ customer: "cus_novo", mode: "subscription" })
    );
  });

  it("reutiliza customer existente", async () => {
    db.providerProfile.findUnique.mockResolvedValue({
      id: "profile-1",
      stripeCustomerId: "cus_existente",
      plan: "FREE"
    });
    stripeApi.checkout.sessions.create.mockResolvedValue({ client_secret: "cs_secret" });

    const { createCheckoutSession } = await import("@/lib/actions/billing");
    await createCheckoutSession();

    expect(stripeApi.customers.create).not.toHaveBeenCalled();
    expect(stripeApi.checkout.sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({ customer: "cus_existente" })
    );
  });
});

// ─── requestProPixPayment ─────────────────────────────────────────────────────

describe("requestProPixPayment", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("retorna erro quando não autenticado", async () => {
    const { auth } = await import("@/auth");
    vi.mocked(auth).mockResolvedValue(null);

    const { requestProPixPayment } = await import("@/lib/actions/billing");
    expect(await requestProPixPayment()).toEqual({ error: "Não autenticado." });
  });

  it("retorna erro quando já é PRO", async () => {
    db.providerProfile.findUnique.mockResolvedValue({
      id: "profile-1",
      plan: "PRO",
      businessName: "Negócio Teste"
    });

    const { requestProPixPayment } = await import("@/lib/actions/billing");
    expect(await requestProPixPayment()).toEqual({ error: "Você já tem o plano PRO." });
  });

  it("retorna erro quando o Pix da Vitriny não está configurado", async () => {
    db.providerProfile.findUnique.mockResolvedValue({
      id: "profile-1",
      plan: "FREE",
      businessName: "Negócio Teste"
    });
    // VITRINY_PIX_KEY/HOLDER_NAME/CITY propositalmente não configurados.
    vi.stubEnv("VITRINY_PIX_KEY", "");
    vi.stubEnv("VITRINY_PIX_HOLDER_NAME", "");
    vi.stubEnv("VITRINY_PIX_CITY", "");

    const { requestProPixPayment } = await import("@/lib/actions/billing");
    expect(await requestProPixPayment()).toEqual({
      error: "Pix não está configurado no momento. Tente novamente mais tarde ou fale com o suporte."
    });

    expect(db.proPixPayment.findFirst).not.toHaveBeenCalled();
    expect(stripeApi.prices.retrieve).not.toHaveBeenCalled();
    const { createPixPayment } = await import("@/lib/pix");
    expect(createPixPayment).not.toHaveBeenCalled();
  });

  it("retorna erro quando o preço PRO no Stripe não tem valor definido", async () => {
    db.providerProfile.findUnique.mockResolvedValue({
      id: "profile-1",
      plan: "FREE",
      businessName: "Negócio Teste"
    });
    vi.stubEnv("VITRINY_PIX_KEY", "chave-pix-teste");
    vi.stubEnv("VITRINY_PIX_HOLDER_NAME", "Vitriny");
    vi.stubEnv("VITRINY_PIX_CITY", "Sao Paulo");
    db.proPixPayment.findFirst.mockResolvedValue(null);
    // Preço mal configurado no Stripe (ex: tiered/metered) não tem unit_amount.
    stripeApi.prices.retrieve.mockResolvedValue({ unit_amount: null });

    const { requestProPixPayment } = await import("@/lib/actions/billing");
    expect(await requestProPixPayment()).toEqual({
      error: "Não foi possível determinar o valor do plano PRO. Tente novamente ou fale com o suporte."
    });

    expect(db.proPixPayment.create).not.toHaveBeenCalled();
    const { createPixPayment } = await import("@/lib/pix");
    expect(createPixPayment).not.toHaveBeenCalled();
  });

  it("reaproveita pedido pendente existente, usando o valor já salvo (não o do Stripe)", async () => {
    db.providerProfile.findUnique.mockResolvedValue({
      id: "profile-1",
      plan: "FREE",
      businessName: "Negócio Teste"
    });
    vi.stubEnv("VITRINY_PIX_KEY", "chave-pix-teste");
    vi.stubEnv("VITRINY_PIX_HOLDER_NAME", "Vitriny");
    vi.stubEnv("VITRINY_PIX_CITY", "Sao Paulo");
    db.proPixPayment.findFirst.mockResolvedValue({
      id: "pix-payment-1",
      amount: "19.90"
    });
    // O preço no Stripe já teria mudado desde que o pedido pendente foi
    // criado — não deve ser usado nem consultado nesse fluxo de reuso.
    stripeApi.prices.retrieve.mockResolvedValue({ unit_amount: 2990 });
    const { createPixPayment } = await import("@/lib/pix");
    vi.mocked(createPixPayment).mockResolvedValue({
      copyPasteCode: "codigo-pix",
      qrCodeDataUrl: "data:image/png;base64,xyz"
    });

    const { requestProPixPayment } = await import("@/lib/actions/billing");
    const result = await requestProPixPayment();

    expect(result).toEqual({
      copyPasteCode: "codigo-pix",
      qrCodeDataUrl: "data:image/png;base64,xyz",
      paymentId: "pix-payment-1"
    });
    expect(db.proPixPayment.create).not.toHaveBeenCalled();
    expect(stripeApi.prices.retrieve).not.toHaveBeenCalled();
    expect(createPixPayment).toHaveBeenCalledWith(
      expect.objectContaining({ amount: "19.90", transactionId: "pix-payment-1" })
    );
  });

  it("cria novo pedido quando não há pendente, usando o valor do Stripe", async () => {
    db.providerProfile.findUnique.mockResolvedValue({
      id: "profile-1",
      plan: "FREE",
      businessName: "Negócio Teste"
    });
    vi.stubEnv("VITRINY_PIX_KEY", "chave-pix-teste");
    vi.stubEnv("VITRINY_PIX_HOLDER_NAME", "Vitriny");
    vi.stubEnv("VITRINY_PIX_CITY", "Sao Paulo");
    db.proPixPayment.findFirst.mockResolvedValue(null);
    db.proPixPayment.create.mockResolvedValue({ id: "pix-payment-novo" });
    stripeApi.prices.retrieve.mockResolvedValue({ unit_amount: 1990 });
    const { createPixPayment } = await import("@/lib/pix");
    vi.mocked(createPixPayment).mockResolvedValue({
      copyPasteCode: "codigo-pix",
      qrCodeDataUrl: "data:image/png;base64,xyz"
    });

    const { requestProPixPayment } = await import("@/lib/actions/billing");
    const result = await requestProPixPayment();

    expect(result).toEqual({
      copyPasteCode: "codigo-pix",
      qrCodeDataUrl: "data:image/png;base64,xyz",
      paymentId: "pix-payment-novo"
    });
    expect(db.proPixPayment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ providerProfileId: "profile-1", amount: "19.90" })
      })
    );
    expect(createPixPayment).toHaveBeenCalledWith(
      expect.objectContaining({
        pixKey: process.env.VITRINY_PIX_KEY,
        amount: "19.90",
        transactionId: "pix-payment-novo"
      })
    );
  });
});
