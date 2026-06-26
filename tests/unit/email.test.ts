import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const sendEmail = vi.fn();

vi.mock("resend", () => ({
  Resend: vi.fn().mockImplementation(function Resend() {
    return {
      emails: {
        send: sendEmail
      }
    };
  })
}));

describe("sendPasswordResetEmail", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    sendEmail.mockResolvedValue({ error: null });
    process.env = {
      ...originalEnv,
      RESEND_API_KEY: "re_test",
      EMAIL_FROM: "OrçaFácil <contato@orcafacil.com>"
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("envia e-mail de reset usando o remetente configurado", async () => {
    const { sendPasswordResetEmail } = await import("@/lib/email");

    await sendPasswordResetEmail("cliente@example.com", "https://app.test/redefinir/token");

    expect(sendEmail).toHaveBeenCalledWith({
      from: "OrçaFácil <contato@orcafacil.com>",
      to: "cliente@example.com",
      subject: "Redefinir senha — OrçaFácil",
      html: expect.stringContaining("https://app.test/redefinir/token")
    });
  });

  it("usa o layout visual padrão da aplicação", async () => {
    const { sendPasswordResetEmail } = await import("@/lib/email");

    await sendPasswordResetEmail("cliente@example.com", "https://app.test/redefinir/token");

    const html = sendEmail.mock.calls[0]?.[0]?.html as string;
    expect(html).toContain("background:#F5F0E8");
    expect(html).toContain("OrçaFácil");
    expect(html).toContain("background:#1B5E3B");
    expect(html).toContain("box-shadow:0 1px 3px rgba(28,25,23,0.08)");
  });

  it("falha com mensagem clara quando RESEND_API_KEY não está configurada", async () => {
    process.env.RESEND_API_KEY = "";
    const { sendPasswordResetEmail } = await import("@/lib/email");

    await expect(
      sendPasswordResetEmail("cliente@example.com", "https://app.test/redefinir/token")
    ).rejects.toThrow("RESEND_API_KEY não configurada.");
  });

  it("falha com mensagem clara quando EMAIL_FROM não está configurado", async () => {
    process.env.EMAIL_FROM = "";
    const { sendPasswordResetEmail } = await import("@/lib/email");

    await expect(
      sendPasswordResetEmail("cliente@example.com", "https://app.test/redefinir/token")
    ).rejects.toThrow("EMAIL_FROM não configurado.");
  });
});

describe("notificações da aplicação", () => {
  beforeEach(() => {
    vi.resetModules();
    sendEmail.mockResolvedValue({ error: null });
    process.env = {
      ...process.env,
      RESEND_API_KEY: "re_test",
      EMAIL_FROM: "OrçaFácil <contato@orcafacil.com>"
    };
  });

  it("envia notificação de novo pedido ao prestador", async () => {
    const { sendQuoteRequestReceivedEmail } = await import("@/lib/email");

    await sendQuoteRequestReceivedEmail({
      to: "prestador@example.com",
      businessName: "OrçaFácil Serviços",
      customerName: "Maria",
      serviceName: "Pintura",
      dashboardUrl: "https://app.test/dashboard/pedidos"
    });

    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "prestador@example.com",
        subject: "Novo pedido de orçamento — OrçaFácil",
        html: expect.stringContaining("Pintura")
      })
    );
  });

  it("envia proposta ao cliente", async () => {
    const { sendProposalSentEmail } = await import("@/lib/email");

    await sendProposalSentEmail({
      to: "cliente@example.com",
      businessName: "OrçaFácil Serviços",
      customerName: "Maria",
      proposalUrl: "https://app.test/proposta/token",
      totalAmount: "R$ 300,00"
    });

    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "cliente@example.com",
        subject: "Sua proposta de OrçaFácil Serviços — OrçaFácil",
        html: expect.stringContaining("https://app.test/proposta/token")
      })
    );
  });

  it("envia resposta da proposta ao prestador", async () => {
    const { sendProposalResponseEmail } = await import("@/lib/email");

    await sendProposalResponseEmail({
      to: "prestador@example.com",
      businessName: "OrçaFácil Serviços",
      customerName: "Maria",
      response: "APPROVED",
      proposalUrl: "https://app.test/proposta/token"
    });

    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "prestador@example.com",
        subject: "Proposta aprovada — OrçaFácil",
        html: expect.stringContaining("Maria aprovou a proposta")
      })
    );
  });
});
