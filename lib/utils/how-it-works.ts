import type { FixedServiceCheckoutMode } from "@/types/service";

type ServiceInput = {
  pricingType: "FIXED" | "CUSTOM";
  fixedServiceCheckoutMode: FixedServiceCheckoutMode | null | undefined;
};

type Step = {
  step: string;
  title: string;
  description: string;
};

export function getHowItWorksContent(services: ServiceInput[]): {
  title: string;
  steps: Step[];
} {
  const hasCustom = services.some((s) => s.pricingType === "CUSTOM");
  const hasFixed = services.some((s) => s.pricingType === "FIXED");
  const hasPixRequired = services.some(
    (s) =>
      s.pricingType === "FIXED" &&
      s.fixedServiceCheckoutMode === "ALLOW_PIX_RESERVATION"
  );
  const hasRequestOnly = services.some(
    (s) =>
      s.pricingType === "FIXED" && s.fixedServiceCheckoutMode === "REQUEST_ONLY"
  );

  if (hasCustom && hasFixed) {
    return {
      title: "Serviços fixos e sob orçamento",
      steps: [
        {
          step: "1",
          title: "Escolha ou descreva",
          description:
            "Selecione um serviço da lista ou descreva livremente o que precisa."
        },
        {
          step: "2",
          title: "Prestador avalia",
          description:
            "O prestador analisa e confirma disponibilidade ou prepara uma proposta."
        },
        {
          step: "3",
          title: "Receba o retorno",
          description: "Você é contactado com as próximas etapas."
        }
      ]
    };
  }

  if (hasFixed && hasPixRequired && !hasRequestOnly) {
    return {
      title: "Simples e rápido",
      steps: [
        {
          step: "1",
          title: "Preencha seus dados",
          description: "Informe nome e contato para continuar."
        },
        {
          step: "2",
          title: "Realize o pagamento Pix",
          description: "O pagamento é exigido para confirmar o pedido."
        },
        {
          step: "3",
          title: "Confirmação manual",
          description:
            "O prestador confirma o recebimento e finaliza o agendamento."
        }
      ]
    };
  }

  if (hasFixed) {
    return {
      title: "Simples e rápido",
      steps: [
        {
          step: "1",
          title: "Escolha o serviço",
          description: "Selecione o serviço desejado e preencha seus dados."
        },
        {
          step: "2",
          title: "Prestador avalia",
          description:
            "O prestador analisa a solicitação e confirma disponibilidade."
        },
        {
          step: "3",
          title: "Prestador entra em contato",
          description: "Você recebe o retorno pelo contato informado."
        }
      ]
    };
  }

  return {
    title: "Simples e rápido",
    steps: [
      {
        step: "1",
        title: "Preencha o formulário",
        description:
          "Conte o que você precisa em poucos campos. Leva menos de 2 minutos."
      },
      {
        step: "2",
        title: "Prestador avalia",
        description:
          "O prestador analisa seu pedido e prepara uma proposta personalizada."
      },
      {
        step: "3",
        title: "Receba a proposta",
        description:
          "Você recebe uma proposta com valor, prazo e condições para aprovar."
      }
    ]
  };
}
