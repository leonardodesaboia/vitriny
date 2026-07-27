import type { Metadata } from "next";

import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";

export const metadata: Metadata = {
  title: "Termos de uso",
  description: "Termos de uso da plataforma Vitriny.",
};

const sections = [
  {
    title: "1. O que é o Vitriny",
    body: "O Vitriny é uma plataforma que permite a pequenos negócios criar uma vitrine online para apresentar produtos e serviços, receber pedidos de clientes e enviar propostas comerciais com aprovação online.",
  },
  {
    title: "2. Conta e responsabilidade",
    body: "Para usar o painel é necessário criar uma conta com dados verdadeiros e manter a confidencialidade das credenciais. O conteúdo publicado na vitrine (nomes, descrições, preços, imagens e dados de contato) é de responsabilidade exclusiva do negócio que o publica.",
  },
  {
    title: "3. Pagamentos entre cliente e negócio",
    body: "O Vitriny não processa, intermedia nem garante pagamentos entre clientes e negócios. Pagamentos via Pix são feitos diretamente ao negócio: a plataforma apenas gera o QR Code e o código copia e cola com os dados informados pelo próprio negócio, e não confirma recebimentos automaticamente. Confira sempre os dados do recebedor no aplicativo do seu banco antes de pagar.",
  },
  {
    title: "4. Planos e cobrança",
    body: "O plano Grátis tem limites de uso descritos na página de preços. O plano PRO é uma assinatura mensal cobrada via cartão de crédito, processada pela Stripe. A assinatura pode ser cancelada a qualquer momento e permanece ativa até o fim do período já pago, sem reembolso proporcional.",
  },
  {
    title: "5. Alterações de planos e preços",
    body: "Os planos, seus limites, recursos e preços podem ser alterados, e novos planos podem ser criados. Mudanças de preço ou redução de recursos de um plano pago serão comunicadas por e-mail ou pela plataforma com pelo menos 30 dias de antecedência e passam a valer apenas a partir da renovação seguinte da assinatura — nunca no período já pago. Se não concordar com a mudança, você pode cancelar antes da renovação. Ao voltar para o plano Grátis (por cancelamento ou downgrade), os dados permanecem preservados, mas recursos exclusivos de planos pagos deixam de ser exibidos e os limites do plano Grátis passam a valer para novas ações.",
  },
  {
    title: "6. Uso aceitável",
    body: "É proibido usar a plataforma para atividades ilegais, publicar conteúdo enganoso ou ofensivo, tentar acessar dados de outras contas ou comprometer a segurança do serviço. Contas que violarem estas regras podem ser suspensas ou encerradas.",
  },
  {
    title: "7. Disponibilidade e alterações",
    body: "O serviço é fornecido no estado em que se encontra, sem garantia de disponibilidade ininterrupta. Funcionalidades podem ser adicionadas, alteradas ou removidas. Mudanças relevantes nestes termos serão comunicadas pela plataforma ou por e-mail.",
  },
  {
    title: "8. Encerramento de conta",
    body: "Você pode solicitar o encerramento da sua conta a qualquer momento pelo e-mail de contato. Com o encerramento, a vitrine pública deixa de existir e os dados são tratados conforme a Política de Privacidade.",
  },
  {
    title: "9. Legislação aplicável",
    body: "Estes termos são regidos pelas leis da República Federativa do Brasil.",
  },
];

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-paper text-ink">
      <SiteHeader />

      <div className="mx-auto max-w-3xl px-6 py-16">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-leaf">
          Legal
        </p>
        <h1 className="mt-3 font-fraunces text-4xl font-bold text-ink">
          Termos de uso
        </h1>
        <p className="mt-2 text-sm text-ink-muted">
          Última atualização: 2 de julho de 2026
        </p>

        <div className="mt-10 grid gap-8">
          {sections.map((section) => (
            <section key={section.title}>
              <h2 className="font-fraunces text-xl font-bold text-ink">
                {section.title}
              </h2>
              <p className="mt-2 text-sm leading-7 text-ink-muted">
                {section.body}
              </p>
            </section>
          ))}
        </div>
      </div>

      <SiteFooter />
    </main>
  );
}
