import { describe, expect, it } from "vitest";

import { createPixPayment } from "@/lib/pix";

describe("createPixPayment", () => {
  it("gera código Pix copia e cola e QR Code em data URL", async () => {
    const payment = await createPixPayment({
      pixKey: "prestador@example.com",
      pixHolderName: "João Prestador",
      pixCity: "São Paulo",
      amount: "150.50",
      transactionId: "proposal-123",
      description: "Entrada OrçaFácil"
    });

    expect(payment.copyPasteCode).toContain("BR.GOV.BCB.PIX");
    expect(payment.copyPasteCode).toContain("prestador@example.com");
    expect(payment.copyPasteCode).toContain("150.50");
    expect(payment.qrCodeDataUrl).toMatch(/^data:image\/png;base64,/);
  });

  it("normaliza nome e cidade com acentos e caracteres especiais", async () => {
    const payment = await createPixPayment({
      pixKey: "prestador@example.com",
      pixHolderName: "João Prestador!",
      pixCity: "São Paulo/SP!",
      amount: "99.90",
      transactionId: "proposal-123",
      description: "Entrada OrçaFácil!"
    });

    expect(payment.copyPasteCode).toContain("JOAO PRESTADOR");
    expect(payment.copyPasteCode).toContain("SAO PAULOSP");
    expect(payment.copyPasteCode).toContain("99.90");
    expect(payment.qrCodeDataUrl).toMatch(/^data:image\/png;base64,/);
  });

  it("rejeita valor inválido", async () => {
    await expect(
      createPixPayment({
        pixKey: "prestador@example.com",
        pixHolderName: "João Prestador",
        pixCity: "São Paulo",
        amount: "0",
        transactionId: "proposal-123"
      })
    ).rejects.toThrow("Valor Pix inválido.");
  });

  it("rejeita dados Pix obrigatórios ausentes", async () => {
    await expect(
      createPixPayment({
        pixKey: "",
        pixHolderName: "João Prestador",
        pixCity: "São Paulo",
        amount: "150.50",
        transactionId: "proposal-123"
      })
    ).rejects.toThrow("Dados Pix obrigatórios não configurados.");
  });
});
