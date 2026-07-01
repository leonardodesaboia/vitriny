import { phoneToWhatsAppNumber } from "@/lib/utils/phone";

export function profileLinkMessage(profileUrl: string): string {
  return `Oi! Conheça minha vitrine e envie seu pedido por este link:\n${profileUrl}\nAssim consigo organizar as informações e te responder melhor 😊`;
}

export function proposalReadyMessage(
  customerName: string,
  proposalUrl: string
): string {
  return `Oi, ${customerName}! Sua proposta já está pronta 😊\nVocê pode acessar, revisar e aprovar por aqui:\n${proposalUrl}`;
}

export function proposalApprovedMessage(customerName: string): string {
  return `Oi, ${customerName}! Vi que a proposta foi aprovada. Obrigado! 😊\nVou seguir com os próximos detalhes por aqui.`;
}

export function proposalRejectedMessage(customerName: string): string {
  return `Oi, ${customerName}! Vi o retorno sobre a proposta. Obrigado por avisar 😊\nSe quiser ajustar alguma coisa, posso verificar uma nova versão.`;
}

export function pixDepositMessage(
  customerName: string,
  depositAmount: string,
  pixKey: string,
  pixHolderName: string
): string {
  return `Oi, ${customerName}! Sua proposta foi aprovada 😊\n\nPara confirmar a contratação, você pode pagar o valor de entrada de ${depositAmount} via Pix:\n\nChave Pix: ${pixKey}\nTitular: ${pixHolderName}\n\nApós o pagamento, envie o comprovante por aqui.`;
}

// Remove non-digits and build a wa.me URL.
// For Brazilian numbers without country code (e.g. "11 99999-9999"),
// the resulting link may be incomplete — the user should verify the format.
export function buildWaUrl(phone: string, message: string): string {
  const cleaned = phoneToWhatsAppNumber(phone);
  return `https://wa.me/${cleaned}?text=${encodeURIComponent(message)}`;
}
