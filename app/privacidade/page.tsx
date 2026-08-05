import type { Metadata } from "next";

import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";

export const metadata: Metadata = {
  title: "Política de privacidade",
  description: "Como o Vitriny coleta, usa e protege dados pessoais.",
};

const sections = [
  {
    title: "1. Quem somos e o alcance desta política",
    body: "Esta política explica como o Vitriny, operado por Leonardo de Saboia Correa Ponte Souza (pessoa física), com contato pelo e-mail leonardodesaboia1@gmail.com, coleta, usa, compartilha e protege dados pessoais, em conformidade com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018 — LGPD). Ela se aplica ao painel, ao site e às vitrines públicas hospedadas na plataforma.",
  },
  {
    title: "2. Controlador e operador: quem responde por quais dados",
    body: "Em relação aos dados da conta do negócio e ao funcionamento da plataforma, o Vitriny atua como controlador. Em relação aos dados dos clientes finais que enviam pedidos ou recebem propostas, quem decide sobre o tratamento é o próprio negócio (controlador), e o Vitriny atua apenas como operador, tratando esses dados em nome e sob instrução do negócio. Cada negócio é responsável por informar seus clientes e por ter base legal para coletar e usar os dados deles.",
  },
  {
    title: "3. Dados que coletamos",
    body: "Da conta do negócio: nome, e-mail e senha (armazenada apenas como hash criptográfico). Do perfil público: os dados que o próprio negócio decide exibir, como nome do negócio, descrição, contatos, cidade e chave Pix para recebimento. Dos clientes que enviam pedidos: nome, e-mail e/ou telefone e as informações do pedido. Dados técnicos mínimos: cookies de sessão para manter o login. As estatísticas de acesso das vitrines são coletadas apenas de forma agregada (contagem de visitas por dia), sem identificar o visitante, sem endereço IP e sem perfis individuais.",
  },
  {
    title: "4. Bases legais do tratamento",
    body: "Tratamos dados com fundamento na execução do contrato e em procedimentos preliminares (para operar sua conta e a vitrine), no cumprimento de obrigação legal ou regulatória (por exemplo, guarda de registros), no legítimo interesse (segurança, prevenção a fraudes e melhoria do serviço, sempre respeitados seus direitos) e, quando aplicável, no consentimento, que pode ser revogado a qualquer momento.",
  },
  {
    title: "5. Para que usamos os dados",
    body: "Para operar a plataforma: exibir a vitrine pública, encaminhar pedidos ao negócio, enviar propostas e notificações transacionais por e-mail (confirmação de cadastro, redefinição de senha, novos pedidos e respostas de propostas), processar a assinatura PRO, garantir a segurança e cumprir obrigações legais. Não vendemos dados pessoais nem os usamos para publicidade de terceiros.",
  },
  {
    title: "6. Pagamentos",
    body: "A assinatura PRO é processada pelo parceiro Mercado Pago. Os dados de cartão são enviados diretamente ao Mercado Pago e não passam pelos nossos servidores; para pagamento da assinatura via Pix, tratamos apenas os dados necessários para identificar e confirmar a cobrança. Os pagamentos de pedidos entre cliente e negócio via Pix acontecem fora da plataforma, diretamente entre as partes.",
  },
  {
    title: "7. Compartilhamento com terceiros",
    body: "Compartilhamos dados apenas com prestadores necessários para operar o serviço, cada um com acesso limitado à sua função: hospedagem da aplicação e do banco de dados; armazenamento de arquivos e imagens em serviço compatível com S3; Mercado Pago (processamento da assinatura PRO); Resend (envio de e-mails transacionais); e Google (login opcional com conta Google). Também podemos compartilhar dados quando exigido por lei ou por ordem de autoridade competente.",
  },
  {
    title: "8. Transferência internacional de dados",
    body: "Alguns desses provedores podem processar ou armazenar dados fora do Brasil. Nesses casos, adotamos as salvaguardas previstas na LGPD para assegurar um nível adequado de proteção aos seus dados.",
  },
  {
    title: "9. Cookies",
    body: "Usamos apenas cookies essenciais de sessão para manter você conectado ao painel. Não usamos cookies de rastreamento, de perfil ou de publicidade.",
  },
  {
    title: "10. Segurança e incidentes",
    body: "Adotamos medidas técnicas e administrativas para proteger os dados, como senhas armazenadas em hash e transmissão criptografada. Nenhum sistema é totalmente imune a riscos; em caso de incidente de segurança que possa acarretar risco relevante aos titulares, comunicaremos os afetados e a Autoridade Nacional de Proteção de Dados (ANPD), nos termos da LGPD.",
  },
  {
    title: "11. Retenção e exclusão",
    body: "Os dados são mantidos enquanto a conta existir. Ao excluir a conta, os dados pessoais (nome, e-mail, senha, telefone e chave Pix) são removidos ou anonimizados de forma irreversível, a vitrine sai do ar e o acesso é bloqueado. Registros de pedidos, propostas e cobranças podem ser mantidos de forma não identificável, ou pelo prazo exigido para o cumprimento de obrigações legais, para fins administrativos e estatísticos.",
  },
  {
    title: "12. Seus direitos (LGPD)",
    body: "Você pode solicitar a confirmação da existência de tratamento, o acesso, a correção, a anonimização, a portabilidade, a eliminação, a informação sobre com quem compartilhamos seus dados e a revogação do consentimento, além de peticionar perante a ANPD. Clientes finais que enviaram pedidos podem exercer esses direitos junto ao negócio (controlador) ou, quando envolver o funcionamento da plataforma, diretamente conosco, que encaminharemos ao negócio responsável.",
  },
  {
    title: "13. Encarregado e contato",
    body: "Para exercer seus direitos ou tirar dúvidas sobre esta política, fale com o nosso Encarregado pelo tratamento de dados (DPO) pelo e-mail leonardodesaboia1@gmail.com.",
  },
  {
    title: "14. Alterações desta política",
    body: "Podemos atualizar esta política periodicamente. Mudanças relevantes serão comunicadas pela plataforma ou por e-mail, e a data da última atualização consta no topo desta página.",
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
          Última atualização: 5 de agosto de 2026
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
