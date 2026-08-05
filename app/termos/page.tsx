import type { Metadata } from "next";

import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";

export const metadata: Metadata = {
  title: "Termos de uso",
  description: "Termos de uso da plataforma Vitriny.",
};

const sections = [
  {
    title: "1. Aceite destes termos",
    body: "Ao criar uma conta, acessar ou usar o Vitriny, você declara que leu, entendeu e concorda com estes Termos de Uso e com a Política de Privacidade. Se não concordar, não use a plataforma. O uso continuado após eventuais alterações significa aceite da versão vigente. Você declara ter pelo menos 18 anos e capacidade civil para contratar, em nome próprio ou do negócio que representa.",
  },
  {
    title: "2. O que é o Vitriny e quem o oferece",
    body: "O Vitriny é uma plataforma que permite a pequenos negócios criar uma vitrine online para apresentar produtos e serviços, receber pedidos de clientes e enviar propostas comerciais com aprovação online. A plataforma é operada por Leonardo de Saboia Correa Ponte Souza, pessoa física, que pode ser contatada pelo e-mail leonardodesaboia1@gmail.com, doravante denominada Vitriny.",
  },
  {
    title: "3. Conta e responsabilidade do usuário",
    body: "Para usar o painel é necessário criar uma conta com dados verdadeiros, completos e atualizados, e manter a confidencialidade das credenciais. Você é responsável por toda atividade realizada na sua conta. O conteúdo publicado na vitrine (nomes, descrições, preços, imagens, dados de contato e chave Pix) é de responsabilidade exclusiva do negócio que o publica, que declara ter os direitos e a licitude sobre esse conteúdo.",
  },
  {
    title: "4. Papel do Vitriny nas transações",
    body: "O Vitriny é apenas uma ferramenta de apresentação e organização. Não somos parte, fornecedor, vendedor nem garantidor de qualquer negócio, produto, serviço, entrega ou pagamento acordado entre o negócio e seus clientes. Toda negociação, contrato, cobrança, entrega, garantia, troca ou disputa ocorre exclusivamente entre o negócio e o cliente final, únicos responsáveis por resolvê-la. O Vitriny não responde pela veracidade, qualidade, legalidade ou cumprimento do que é anunciado ou combinado entre as partes.",
  },
  {
    title: "5. Pagamentos entre cliente e negócio (Pix)",
    body: "Os pagamentos de pedidos entre cliente e negócio via Pix são feitos diretamente ao negócio, fora da plataforma. O Vitriny apenas gera o QR Code e o código copia e cola a partir da chave Pix informada pelo próprio negócio; não processa, não intermedia, não retém e não confirma automaticamente esses recebimentos. Confira sempre os dados do recebedor no aplicativo do seu banco antes de pagar. Erros na chave Pix informada são de responsabilidade do negócio.",
  },
  {
    title: "6. Plano PRO, assinatura e cobrança",
    body: "O plano Grátis tem limites de uso descritos na página de preços. O plano PRO é uma assinatura mensal do negócio ao Vitriny, paga por meio do Mercado Pago (Pix ou cartão de crédito). A assinatura renova automaticamente a cada período e pode ser cancelada a qualquer momento; o acesso PRO permanece ativo até o fim do período já pago, sem reembolso proporcional. Em caso de não pagamento ou falha na cobrança da renovação, o acesso aos recursos PRO pode ser suspenso e a conta retornar ao plano Grátis.",
  },
  {
    title: "7. Alterações de planos e preços",
    body: "Os planos, seus limites, recursos e preços podem ser alterados, e novos planos podem ser criados. Mudanças de preço ou redução de recursos de um plano pago serão comunicadas por e-mail ou pela plataforma com pelo menos 30 dias de antecedência e passam a valer apenas a partir da renovação seguinte da assinatura — nunca no período já pago. Se não concordar com a mudança, você pode cancelar antes da renovação. Ao voltar para o plano Grátis (por cancelamento ou downgrade), os dados permanecem preservados, mas recursos exclusivos de planos pagos deixam de ser exibidos e os limites do plano Grátis passam a valer para novas ações.",
  },
  {
    title: "8. Conteúdo do usuário e propriedade intelectual",
    body: "Você mantém a titularidade do conteúdo que publica e concede ao Vitriny uma licença não exclusiva e gratuita, limitada a hospedar, exibir e operar a sua vitrine e as funcionalidades da plataforma. O software, a marca, o design e os demais elementos do Vitriny são de nossa titularidade e não podem ser copiados, modificados ou reutilizados sem autorização. Podemos remover conteúdo manifestamente ilegal, fraudulento ou que viole direitos de terceiros, nos termos do Marco Civil da Internet (Lei nº 12.965/2014).",
  },
  {
    title: "9. Uso aceitável",
    body: "É proibido usar a plataforma para atividades ilegais, enganosas ou ofensivas; publicar conteúdo falso, difamatório ou que induza o consumidor a erro; violar direitos de terceiros; tentar acessar dados de outras contas; sobrecarregar, automatizar acessos indevidos ou comprometer a segurança do serviço. Contas que violarem estas regras podem ser suspensas ou encerradas, inclusive sem aviso prévio quando a violação for grave.",
  },
  {
    title: "10. Disponibilidade e isenção de garantias",
    body: "O serviço é fornecido no estado em que se encontra e conforme a disponibilidade, sem garantia de funcionamento ininterrupto, isento de erros ou de adequação a uma finalidade específica. Funcionalidades podem ser adicionadas, alteradas ou removidas. Recomendamos que você mantenha cópias próprias dos dados importantes.",
  },
  {
    title: "11. Limitação de responsabilidade",
    body: "Na máxima extensão permitida pela lei aplicável, o Vitriny não responde por danos indiretos, lucros cessantes, perda de dados, perda de receita ou danos decorrentes de: uso ou impossibilidade de uso da plataforma; conteúdo publicado pelos negócios; transações, pagamentos ou disputas entre negócios e clientes; ou atos de terceiros. A responsabilidade total do Vitriny, por qualquer causa, fica limitada ao valor efetivamente pago por você ao Vitriny nos 12 meses anteriores ao evento que a originou. Nada nestes termos afasta responsabilidades que não possam ser excluídas por lei, inclusive perante o consumidor.",
  },
  {
    title: "12. Indenização",
    body: "Você concorda em defender, indenizar e isentar o Vitriny de quaisquer reclamações, perdas, danos, multas e despesas (incluindo honorários advocatícios) decorrentes do conteúdo que você publica, do seu uso da plataforma, da sua relação com seus clientes ou da violação destes termos, da lei ou de direitos de terceiros.",
  },
  {
    title: "13. Suspensão e encerramento de conta",
    body: "Você pode solicitar o encerramento da sua conta a qualquer momento pelo e-mail de contato. Podemos suspender ou encerrar contas que violem estes termos, que estejam inadimplentes ou mediante exigência legal. Com o encerramento, a vitrine pública deixa de existir e os dados são tratados conforme a Política de Privacidade.",
  },
  {
    title: "14. Alterações destes termos",
    body: "Podemos alterar estes termos a qualquer momento. Mudanças relevantes serão comunicadas pela plataforma ou por e-mail com antecedência razoável. A data da última atualização consta no topo desta página, e o uso após a vigência da nova versão significa concordância.",
  },
  {
    title: "15. Cessão",
    body: "O Vitriny pode ceder ou transferir estes termos e os direitos e obrigações relacionados, no todo ou em parte, inclusive em caso de reorganização, incorporação ou venda do negócio. Você não pode ceder sua conta ou estes termos sem nossa autorização prévia.",
  },
  {
    title: "16. Legislação aplicável e foro",
    body: "Estes termos são regidos pelas leis da República Federativa do Brasil. Fica eleito o foro da comarca de Fortaleza/CE para dirimir controvérsias, ressalvado o direito do consumidor de acionar o foro do seu próprio domicílio quando a lei assim garantir.",
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
