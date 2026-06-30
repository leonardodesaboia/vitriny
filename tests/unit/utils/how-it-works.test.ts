import { describe, expect, it } from "vitest";
import { getHowItWorksContent } from "@/lib/utils/how-it-works";

describe("getHowItWorksContent", () => {
  it("retorna fluxo CUSTOM quando não há serviços", () => {
    const { title, steps } = getHowItWorksContent([]);
    expect(title).toBe("Simples e rápido");
    expect(steps[0].title).toBe("Preencha o formulário");
    expect(steps[1].title).toBe("Prestador avalia");
    expect(steps[2].title).toBe("Receba a proposta");
  });

  it("retorna fluxo CUSTOM quando há apenas serviços CUSTOM", () => {
    const { title, steps } = getHowItWorksContent([
      { pricingType: "CUSTOM", fixedServiceCheckoutMode: null }
    ]);
    expect(title).toBe("Simples e rápido");
    expect(steps[0].title).toBe("Preencha o formulário");
  });

  it("retorna fluxo FIXED quando há apenas FIXED/REQUEST_ONLY", () => {
    const { title, steps } = getHowItWorksContent([
      { pricingType: "FIXED", fixedServiceCheckoutMode: "REQUEST_ONLY" }
    ]);
    expect(title).toBe("Simples e rápido");
    expect(steps[0].title).toBe("Escolha o serviço");
    expect(steps[2].title).toBe("Prestador entra em contato");
  });

  it("retorna fluxo PIX quando há apenas FIXED/REQUIRE_PIX_PAYMENT", () => {
    const { title, steps } = getHowItWorksContent([
      { pricingType: "FIXED", fixedServiceCheckoutMode: "REQUIRE_PIX_PAYMENT" }
    ]);
    expect(title).toBe("Simples e rápido");
    expect(steps[0].title).toBe("Preencha seus dados");
    expect(steps[1].title).toBe("Realize o pagamento Pix");
    expect(steps[2].title).toBe("Confirmação manual");
  });

  it("retorna fluxo MISTO quando há CUSTOM e FIXED", () => {
    const { title, steps } = getHowItWorksContent([
      { pricingType: "CUSTOM", fixedServiceCheckoutMode: null },
      { pricingType: "FIXED", fixedServiceCheckoutMode: "REQUEST_ONLY" }
    ]);
    expect(title).toBe("Serviços fixos e sob orçamento");
    expect(steps[0].title).toBe("Escolha ou descreva");
    expect(steps[2].title).toBe("Receba o retorno");
  });

  it("retorna fluxo FIXED (não PIX) para perfil com ambos os modos FIXED", () => {
    const { title, steps } = getHowItWorksContent([
      { pricingType: "FIXED", fixedServiceCheckoutMode: "REQUEST_ONLY" },
      { pricingType: "FIXED", fixedServiceCheckoutMode: "REQUIRE_PIX_PAYMENT" }
    ]);
    expect(title).toBe("Simples e rápido");
    expect(steps[0].title).toBe("Escolha o serviço");
  });
});
