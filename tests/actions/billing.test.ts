import { beforeEach, describe, expect, it, vi } from "vitest";
import { makePrismaMock, makeSession, type PrismaMock } from "../helpers";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: {} }));
vi.mock("@/lib/stripe", () => ({ stripe: {} }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

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
    billingPortal: { sessions: { create: vi.fn() } }
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
