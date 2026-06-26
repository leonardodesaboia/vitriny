import { Resend } from "resend";

type SendAppEmailInput = {
  to: string;
  subject: string;
  preview: string;
  html: string;
};

type QuoteRequestReceivedEmailInput = {
  to: string;
  businessName: string;
  customerName: string;
  serviceName?: string | null;
  dashboardUrl: string;
};

type ProposalSentEmailInput = {
  to: string;
  businessName: string;
  customerName: string;
  proposalUrl: string;
  totalAmount: string;
};

type ProposalResponseEmailInput = {
  to: string;
  businessName: string;
  customerName: string;
  response: "APPROVED" | "REJECTED";
  proposalUrl: string;
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function paragraph(value: string) {
  return `<p style="margin:0 0 16px;font-size:15px;line-height:24px;color:#78716C;">${escapeHtml(value)}</p>`;
}

function emailButton(label: string, href: string) {
  return `
    <table role="presentation" cellspacing="0" cellpadding="0" style="margin:24px 0 0;">
      <tr>
        <td style="border-radius:6px;background:#1B5E3B;">
          <a href="${escapeHtml(href)}" style="display:inline-block;padding:12px 18px;font-size:14px;font-weight:700;line-height:20px;color:#FFFFFF;text-decoration:none;border-radius:6px;">
            ${escapeHtml(label)}
          </a>
        </td>
      </tr>
    </table>
  `;
}

function emailLayout({
  title,
  preview,
  children
}: {
  title: string;
  preview: string;
  children: string;
}) {
  return `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="color-scheme" content="light">
    <title>${escapeHtml(title)}</title>
  </head>
  <body style="margin:0;background:#F5F0E8;font-family:'Plus Jakarta Sans',Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#1C1917;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
      ${escapeHtml(preview)}
    </div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#F5F0E8;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;">
            <tr>
              <td style="padding:0 0 16px;">
                <div style="display:inline-block;border-radius:999px;background:#D4EBD9;padding:8px 12px;font-size:13px;font-weight:800;line-height:16px;color:#1B5E3B;">
                  OrçaFácil
                </div>
              </td>
            </tr>
            <tr>
              <td style="border:1px solid #EDE8DE;border-radius:12px;background:#FFFFFF;padding:32px;box-shadow:0 1px 3px rgba(28,25,23,0.08),0 4px 16px rgba(28,25,23,0.06);">
                <h1 style="margin:0 0 18px;font-family:Georgia,'Times New Roman',serif;font-size:28px;line-height:34px;color:#1C1917;">
                  ${escapeHtml(title)}
                </h1>
                ${children}
              </td>
            </tr>
            <tr>
              <td style="padding:18px 4px 0;">
                <p style="margin:0;font-size:12px;line-height:18px;color:#78716C;">
                  Este e-mail foi enviado automaticamente pelo OrçaFácil.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

async function sendAppEmail({ to, subject, preview, html }: SendAppEmailInput) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;

  if (!apiKey) {
    throw new Error("RESEND_API_KEY não configurada.");
  }

  if (!from) {
    throw new Error("EMAIL_FROM não configurado.");
  }

  const resend = new Resend(apiKey);

  const { error } = await resend.emails.send({
    from,
    to,
    subject,
    html: emailLayout({ title: subject, preview, children: html })
  });

  if (error) {
    throw new Error(`Falha ao enviar e-mail: ${error.message}`);
  }
}

export async function sendPasswordResetEmail(to: string, resetUrl: string) {
  await sendAppEmail({
    to,
    subject: "Redefinir senha — OrçaFácil",
    preview: "Use o link para criar uma nova senha no OrçaFácil.",
    html: [
      paragraph("Recebemos um pedido para redefinir sua senha."),
      emailButton("Criar nova senha", resetUrl),
      paragraph("O link expira em 1 hora. Se você não pediu isso, ignore este e-mail.")
    ].join("")
  });
}

export async function sendQuoteRequestReceivedEmail({
  to,
  businessName,
  customerName,
  serviceName,
  dashboardUrl
}: QuoteRequestReceivedEmailInput) {
  await sendAppEmail({
    to,
    subject: "Novo pedido de orçamento — OrçaFácil",
    preview: `${customerName} enviou um novo pedido de orçamento.`,
    html: [
      paragraph(`Olá, ${businessName}.`),
      paragraph(
        serviceName
          ? `${customerName} enviou um novo pedido para o serviço ${serviceName}.`
          : `${customerName} enviou um novo pedido de orçamento.`
      ),
      emailButton("Ver pedido no painel", dashboardUrl)
    ].join("")
  });
}

export async function sendProposalSentEmail({
  to,
  businessName,
  customerName,
  proposalUrl,
  totalAmount
}: ProposalSentEmailInput) {
  await sendAppEmail({
    to,
    subject: `Sua proposta de ${businessName} — OrçaFácil`,
    preview: `${businessName} enviou uma proposta no valor de ${totalAmount}.`,
    html: [
      paragraph(`Olá, ${customerName}.`),
      paragraph(`${businessName} enviou uma proposta para você no valor de ${totalAmount}.`),
      emailButton("Ver e responder proposta", proposalUrl)
    ].join("")
  });
}

export async function sendProposalResponseEmail({
  to,
  businessName,
  customerName,
  response,
  proposalUrl
}: ProposalResponseEmailInput) {
  const responseLabel = response === "APPROVED" ? "aprovou" : "recusou";

  await sendAppEmail({
    to,
    subject:
      response === "APPROVED"
        ? "Proposta aprovada — OrçaFácil"
        : "Proposta recusada — OrçaFácil",
    preview: `${customerName} ${responseLabel} a proposta.`,
    html: [
      paragraph(`Olá, ${businessName}.`),
      paragraph(`${customerName} ${responseLabel} a proposta.`),
      emailButton("Ver proposta", proposalUrl)
    ].join("")
  });
}
