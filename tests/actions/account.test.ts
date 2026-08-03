import crypto from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { makePrismaMock, makeSession, type PrismaMock } from "../helpers";

const preApprovalUpdate = vi.fn();

vi.mock("@/auth", () => ({
  auth: vi.fn(),
  signOut: vi.fn(async () => {
    throw new Error("NEXT_REDIRECT;/");
  })
}));
vi.mock("@/lib/prisma", () => ({ prisma: {} }));
vi.mock("@/lib/stripe", () => ({
  stripe: {
    subscriptions: {
      cancel: vi.fn()
    }
  }
}));
vi.mock("mercadopago", () => ({
  PreApproval: vi.fn(function (this: { update: typeof preApprovalUpdate }) {
    this.update = preApprovalUpdate;
  })
}));
vi.mock("@/lib/mercadopago", () => ({
  getMercadoPago: vi.fn(() => ({}))
}));
vi.mock("@/lib/storage", () => ({
  deleteFromStorage: vi.fn()
}));

let db: PrismaMock;

beforeEach(async () => {
  vi.resetModules();
  preApprovalUpdate.mockReset();
  preApprovalUpdate.mockResolvedValue({ id: "mp_123", status: "cancelled" });
  const { auth } = await import("@/auth");
  const { stripe } = await import("@/lib/stripe");
  const prismaModule = await import("@/lib/prisma");
  db = makePrismaMock();
  Object.assign(prismaModule.prisma, db);
  vi.mocked(auth).mockResolvedValue(makeSession() as never);
  vi.mocked(stripe.subscriptions.cancel).mockReset();
  vi.mocked(stripe.subscriptions.cancel).mockResolvedValue({} as never);

  db.user.findUnique.mockResolvedValue({
    id: "user-1",
    email: "maria@example.com",
    deletedAt: null,
    providerProfile: {
      id: "profile-1",
      slug: "bolos-da-maria",
      stripeSubscriptionId: null,
      mpPreapprovalId: null,
      services: [
        { id: "service-1", imageStorageKey: "services/service-1/foto.jpg" },
        { id: "service-2", imageStorageKey: null }
      ]
    }
  });
  db.user.update.mockResolvedValue({});
  db.account.deleteMany.mockResolvedValue({});
  db.session.deleteMany.mockResolvedValue({});
  db.passwordResetToken.deleteMany.mockResolvedValue({});
  db.emailVerificationToken.deleteMany.mockResolvedValue({});
  db.providerProfile.update.mockResolvedValue({});
  db.service.updateMany.mockResolvedValue({});
});

describe("deleteAccount", () => {
  it("anonimiza o usuário, libera o e-mail e guarda o hash de recorrência", async () => {
    const { deleteAccount } = await import("@/lib/actions/account");
    await expect(deleteAccount()).rejects.toThrow();

    const expectedHash = crypto
      .createHash("sha256")
      .update("maria@example.com")
      .digest("hex");

    expect(db.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "user-1" },
        data: expect.objectContaining({
          name: "Conta excluída",
          email: "excluida-user-1@conta-excluida.local",
          emailVerified: null,
          image: null,
          password: null,
          deletedAt: expect.any(Date),
          deletedEmailHash: expectedHash
        })
      })
    );
  });

  it("despublica a vitrine, libera o slug e remove os dados de contato/Pix", async () => {
    const { deleteAccount } = await import("@/lib/actions/account");
    await expect(deleteAccount()).rejects.toThrow();

    expect(db.providerProfile.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "profile-1" },
        data: expect.objectContaining({
          isPublished: false,
          slug: "excluida-profile-1",
          phone: null,
          email: null,
          pixKey: null,
          pixKeyType: null,
          pixHolderName: null,
          pixCity: null
        })
      })
    );
  });

  it("desativa os itens e remove as imagens do storage", async () => {
    const { deleteFromStorage } = await import("@/lib/storage");
    const { deleteAccount } = await import("@/lib/actions/account");
    await expect(deleteAccount()).rejects.toThrow();

    expect(db.service.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { providerId: "profile-1" },
        data: expect.objectContaining({
          isActive: false,
          imageUrl: null,
          imageStorageKey: null
        })
      })
    );
    expect(deleteFromStorage).toHaveBeenCalledWith("services/service-1/foto.jpg");
    expect(deleteFromStorage).toHaveBeenCalledTimes(1);
  });

  it("remove vínculos de login (OAuth, sessões e tokens)", async () => {
    const { deleteAccount } = await import("@/lib/actions/account");
    await expect(deleteAccount()).rejects.toThrow();

    expect(db.account.deleteMany).toHaveBeenCalledWith({ where: { userId: "user-1" } });
    expect(db.session.deleteMany).toHaveBeenCalledWith({ where: { userId: "user-1" } });
    expect(db.passwordResetToken.deleteMany).toHaveBeenCalledWith({ where: { userId: "user-1" } });
    expect(db.emailVerificationToken.deleteMany).toHaveBeenCalledWith({ where: { userId: "user-1" } });
  });

  it("não apaga pedidos nem propostas (histórico preservado)", async () => {
    const { deleteAccount } = await import("@/lib/actions/account");
    await expect(deleteAccount()).rejects.toThrow();

    expect(db.quoteRequest.update).not.toHaveBeenCalled();
    expect(db.service.delete).not.toHaveBeenCalled();
  });

  it("cancela a assinatura Stripe quando existe", async () => {
    db.user.findUnique.mockResolvedValue({
      id: "user-1",
      email: "maria@example.com",
      deletedAt: null,
      providerProfile: {
        id: "profile-1",
        slug: "bolos-da-maria",
        stripeSubscriptionId: "sub_123",
        mpPreapprovalId: null,
        services: []
      }
    });

    const { stripe } = await import("@/lib/stripe");
    const { deleteAccount } = await import("@/lib/actions/account");
    await expect(deleteAccount()).rejects.toThrow();

    expect(stripe.subscriptions.cancel).toHaveBeenCalledWith("sub_123");
  });

  it("aborta com erro se o cancelamento da assinatura falhar", async () => {
    db.user.findUnique.mockResolvedValue({
      id: "user-1",
      email: "maria@example.com",
      deletedAt: null,
      providerProfile: {
        id: "profile-1",
        slug: "bolos-da-maria",
        stripeSubscriptionId: "sub_123",
        mpPreapprovalId: null,
        services: []
      }
    });

    const { stripe } = await import("@/lib/stripe");
    vi.mocked(stripe.subscriptions.cancel).mockRejectedValue(new Error("stripe down"));

    const { deleteAccount } = await import("@/lib/actions/account");
    const result = await deleteAccount();

    expect(result).toEqual({
      error:
        "Não foi possível cancelar sua assinatura. Tente novamente ou cancele em Assinatura antes de excluir a conta."
    });
    expect(db.user.update).not.toHaveBeenCalled();
  });

  it("cancela a assinatura Mercado Pago antes de anonimizar a conta", async () => {
    db.user.findUnique.mockResolvedValue({
      id: "user-1",
      email: "maria@example.com",
      deletedAt: null,
      providerProfile: {
        id: "profile-1",
        slug: "bolos-da-maria",
        stripeSubscriptionId: null,
        mpPreapprovalId: "mp_123",
        services: []
      }
    });

    const { deleteAccount } = await import("@/lib/actions/account");
    await expect(deleteAccount()).rejects.toThrow();

    expect(preApprovalUpdate).toHaveBeenCalledWith({
      id: "mp_123",
      body: { status: "cancelled" }
    });
    expect(preApprovalUpdate.mock.invocationCallOrder[0]).toBeLessThan(
      db.user.update.mock.invocationCallOrder[0]
    );
  });

  it("aborta a exclusão quando o cancelamento Mercado Pago falha", async () => {
    db.user.findUnique.mockResolvedValue({
      id: "user-1",
      email: "maria@example.com",
      deletedAt: null,
      providerProfile: {
        id: "profile-1",
        slug: "bolos-da-maria",
        stripeSubscriptionId: null,
        mpPreapprovalId: "mp_123",
        services: []
      }
    });
    preApprovalUpdate.mockRejectedValue(new Error("mp down"));
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);

    const { deleteAccount } = await import("@/lib/actions/account");
    const result = await deleteAccount();

    expect(result).toEqual({
      error:
        "Não foi possível cancelar sua assinatura. Tente novamente ou cancele em Assinatura antes de excluir a conta."
    });
    expect(db.user.update).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it("aborta a exclusão quando o MP não confirma o status cancelado", async () => {
    db.user.findUnique.mockResolvedValue({
      id: "user-1",
      email: "maria@example.com",
      deletedAt: null,
      providerProfile: {
        id: "profile-1",
        slug: "bolos-da-maria",
        stripeSubscriptionId: null,
        mpPreapprovalId: "mp_123",
        services: []
      }
    });
    preApprovalUpdate.mockResolvedValue({ id: "mp_123", status: "pending" });
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);

    const { deleteAccount } = await import("@/lib/actions/account");
    const result = await deleteAccount();

    expect(result).toEqual({
      error:
        "Não foi possível cancelar sua assinatura. Tente novamente ou cancele em Assinatura antes de excluir a conta."
    });
    expect(db.user.update).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });
});
