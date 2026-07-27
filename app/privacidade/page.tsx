import type { Metadata } from "next";

import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";

export const metadata: Metadata = {
  title: "Política de privacidade",
  description: "Como o Vitriny coleta, usa e protege dados pessoais.",
};

const sections = [
  {
    title: "1. Dados que coletamos",
    body: "Da conta do negócio: nome, e-mail e senha (armazenada apenas como hash criptográfico). Do perfil público: os dados que o próprio negócio decide exibir, como nome do negócio, descrição, contatos, cidade e dados Pix para recebimento. Dos clientes que enviam pedidos: nome, e-mail e/ou telefone e as informações do pedido — esses dados são tratados em nome do negócio que recebe o pedido.",
  },
  {
    title: "2. Para que usamos os dados",
    body: "Para operar a plataforma: exibir a vitrine pública, encaminhar pedidos ao negócio, enviar propostas e notificações transacionais por e-mail (confirmação de cadastro, redefinição de senha, novos pedidos e respostas de propostas). Não vendemos dados pessoais nem os usamos para publicidade de terceiros.",
  },
  {
    title: "3. Pagamentos",
    body: "A cobrança da assinatura PRO é processada pela Stripe; os dados do cartão são enviados diretamente à Stripe e não passam pelos nossos servidores. Pagamentos via Pix entre cliente e negócio acontecem fora da plataforma, diretamente entre as partes.",
  },
  {
    title: "4. Serviços de terceiros",
    body: "Usamos provedores para operar o serviço: hospedagem da aplicação e do banco de dados, Stripe (assinaturas), Resend (envio de e-mails transacionais) e Google (login opcional com conta Google). Cada provedor acessa apenas o necessário para sua função.",
  },
  {
    title: "5. Cookies",
    body: "Usamos apenas cookies essenciais de sessão para manter você conectado ao painel. Não usamos cookies de rastreamento ou publicidade.",
  },
  {
    title: "6. Retenção e exclusão",
    body: "Os dados são mantidos enquanto a conta existir. Ao excluir a conta, os dados pessoais (nome, e-mail, senha, telefone e dados Pix) são removidos ou anonimizados de forma irreversível, a vitrine sai do ar e o acesso é bloqueado. Registros de pedidos e propostas são mantidos de forma não identificável, para fins administrativos, estatísticos e de cumprimento de obrigações legais.",
  },
  {
    title: "7. Seus direitos (LGPD)",
    body: "Nos termos da Lei Geral de Proteção de Dados (Lei nº 13.709/2018), você pode solicitar acesso, correção, portabilidade ou exclusão dos seus dados, além de informações sobre o tratamento. Clientes finais que enviaram pedidos podem exercer esses direitos tanto junto ao negócio quanto diretamente conosco.",
  },
  {
    title: "8. Contato",
    body: "Para exercer seus direitos ou tirar dúvidas sobre esta política, fale com a gente pelo e-mail de contato informado na plataforma.",
  },
];

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-paper text-ink">
      <SiteHeader />

      <div className="mx-auto max-w-3xl px-6 py-16">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-leaf">
          Legal
        </p>
        <h1 className="mt-3 font-fraunces text-4xl font-bold text-ink">
          Política de privacidade
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
