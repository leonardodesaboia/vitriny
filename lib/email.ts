import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendPasswordResetEmail(to: string, resetUrl: string) {
  const { error } = await resend.emails.send({
    from: "OrçaFácil <onboarding@resend.dev>",
    to,
    subject: "Redefinir senha — OrçaFácil",
    html: `<p>Recebemos um pedido para redefinir sua senha.</p><p><a href="${resetUrl}">Clique aqui para criar uma nova senha</a>.</p><p>O link expira em 1 hora. Se você não pediu isso, ignore este e-mail.</p>`
  });

  if (error) {
    throw new Error(`Falha ao enviar e-mail de redefinição de senha: ${error.message}`);
  }
}
