import QRCode from "qrcode";
import { PixBR } from "pixbrasil";

type PixPaymentInput = {
  pixKey: string;
  pixHolderName: string;
  pixCity: string;
  amount: string;
  transactionId: string;
  description?: string;
};

type PixPayment = {
  copyPasteCode: string;
  qrCodeDataUrl: string;
};

function normalizePixText(value: string, maxLength: number) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9 ]/g, "")
    .trim()
    .toUpperCase()
    .slice(0, maxLength);
}

function normalizeTransactionId(value: string) {
  return (
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^A-Za-z0-9]/g, "")
      .toUpperCase()
      .slice(0, 25) || "***"
  );
}

function parsePixAmount(value: string) {
  const amount = Number(value);

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Valor Pix inválido.");
  }

  return amount;
}

export async function createPixPayment({
  pixKey,
  pixHolderName,
  pixCity,
  amount,
  transactionId,
  description
}: PixPaymentInput): Promise<PixPayment> {
  const key = pixKey.trim();
  const name = normalizePixText(pixHolderName, 25);
  const city = normalizePixText(pixCity, 15);

  if (!key || !name || !city) {
    throw new Error("Dados Pix obrigatórios não configurados.");
  }

  const copyPasteCode = PixBR({
    key,
    name,
    city,
    amount: parsePixAmount(amount),
    transactionId: normalizeTransactionId(transactionId),
    message: description ? normalizePixText(description, 72) : undefined
  });

  const qrCodeDataUrl = await QRCode.toDataURL(copyPasteCode, {
    errorCorrectionLevel: "M",
    margin: 2,
    width: 280,
    color: {
      dark: "#1C1917",
      light: "#FFFFFF"
    }
  });

  return { copyPasteCode, qrCodeDataUrl };
}
