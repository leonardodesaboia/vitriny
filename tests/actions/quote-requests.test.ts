import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeFormData, makePrismaMock, type PrismaMock } from "../helpers";

vi.mock("@/lib/prisma", () => ({ prisma: {} }));
vi.mock("@/lib/actions/auth-guard", () => ({
  requireProviderProfile: vi.fn()
}));
vi.mock("@/lib/email", () => ({
  sendQuoteRequestReceivedEmail: vi.fn(),
  sendQuoteRequestConfirmationToCustomerEmail: vi.fn(),
  sendPixReservationClientPaidEmail: vi.fn()
}));
// after() exige request scope do Next; nos testes executa o callback direto.
vi.mock("next/server", () => ({
  after: (callback: () => unknown) => {
    void callback();
  }
}));

let db: PrismaMock;
const serviceId = "cm000000000000000000000000";

beforeEach(async () => {
  vi.resetModules();
  const prismaModule = await import("@/lib/prisma");
  db = makePrismaMock();
  Object.assign(prismaModule.prisma, db);
  db.providerProfile.findUnique.mockResolvedValue({
    id: "profile-1",
    plan: "FREE",
    isPublished: true,
    businessName: "Vitriny Serviços",
    email: "perfil@example.com",
    user: { email: "conta@example.com" }
  });
  db.service.findFirst.mockResolvedValue({
    id: serviceId,
    name: "Pintura"
  });
  db.quoteRequest.count.mockResolvedValue(0);
  db.quoteRequest.create.mockResolvedValue({
    id: "request-1",
    customerName: "Maria"
  });
});

describe("createQuoteRequest", () => {
  it("rejeita pedido sem e-mail e sem telefone", async () => {
    const { createQuoteRequest } = await import("@/lib/actions/quote-requests");
    const result = await createQuoteRequest(
      "vitriny",
      undefined,
      makeFormData({
        customerName: "Maria",
        customerEmail: "",
        customerPhone: "",
        description: "Preciso de pintura."
      })
    );

    expect(result).toEqual({
      error: "Informe pelo menos um meio de contato: e-mail ou telefone."
    });
    expect(db.quoteRequest.create).not.toHaveBeenCalled();
  });

  it("exige descrição em pedido CUSTOM", async () => {
    db.service.findFirst.mockResolvedValue({
      id: serviceId,
      name: "Pintura",
      pricingType: "CUSTOM",
      fixedServiceCheckoutMode: "REQUEST_ONLY",
      basePrice: null,
      requiresSchedulingDetails: false
    });
    const { createQuoteRequest } = await import("@/lib/actions/quote-requests");
    const result = await createQuoteRequest(
      "vitriny",
      undefined,
      makeFormData({
        customerName: "Maria",
        customerPhone: "11999999999",
        serviceId,
        description: ""
      })
    );

    expect(result).toEqual({
      error: "Descreva o que você precisa para enviar a solicitação."
    });
    expect(db.quoteRequest.create).not.toHaveBeenCalled();
  });

  it("exige data, horário e local quando o serviço solicita agendamento", async () => {
    db.service.findFirst.mockResolvedValue({
      id: serviceId,
      name: "Pintura",
      pricingType: "FIXED",
      fixedServiceCheckoutMode: "REQUEST_ONLY",
      basePrice: 500,
      requiresSchedulingDetails: true
    });
    const { createQuoteRequest } = await import("@/lib/actions/quote-requests");
    const result = await createQuoteRequest(
      "vitriny",
      undefined,
      makeFormData({
        customerName: "Maria",
        customerPhone: "11999999999",
        serviceId,
        description: ""
      })
    );

    expect(result).toEqual({
      error: "Informe data e horário para este item."
    });
    expect(db.quoteRequest.create).not.toHaveBeenCalled();
  });

  it("rejeita data de agendamento no passado", async () => {
    db.service.findFirst.mockResolvedValue({
      id: serviceId,
      name: "Pintura",
      pricingType: "FIXED",
      fixedServiceCheckoutMode: "REQUEST_ONLY",
      basePrice: 500,
      requiresSchedulingDetails: true
    });
    const { createQuoteRequest } = await import("@/lib/actions/quote-requests");
    const result = await createQuoteRequest(
      "vitriny",
      undefined,
      makeFormData({
        customerName: "Maria",
        customerPhone: "11999999999",
        serviceId,
        description: "",
        desiredDate: "2020-01-01",
        desiredTime: "14h",
        location: "Centro"
      })
    );

    expect(result).toEqual({
      error: "Escolha uma data de atendimento que não esteja no passado."
    });
    expect(db.quoteRequest.create).not.toHaveBeenCalled();
  });

  it("aceita agendamento futuro completo", async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const desiredDate = [
      tomorrow.getFullYear(),
      String(tomorrow.getMonth() + 1).padStart(2, "0"),
      String(tomorrow.getDate()).padStart(2, "0")
    ].join("-");
    db.service.findFirst.mockResolvedValue({
      id: serviceId,
      name: "Pintura",
      pricingType: "FIXED",
      fixedServiceCheckoutMode: "REQUEST_ONLY",
      basePrice: 500,
      requiresSchedulingDetails: true
    });
    const { createQuoteRequest } = await import("@/lib/actions/quote-requests");

    await expect(
      createQuoteRequest(
        "vitriny",
        undefined,
        makeFormData({
          customerName: "Maria",
          customerPhone: "11999999999",
          serviceId,
          description: "",
          desiredDate,
          desiredTime: "14h",
          location: "Centro"
        })
      )
    ).rejects.toThrow("/u/vitriny/orcamento?success=1");

    expect(db.quoteRequest.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          desiredDate,
          desiredTime: "14h",
          location: "Centro"
        })
      })
    );
  });

  it("envia e-mail ao prestador quando um pedido público é criado", async () => {
    const { sendQuoteRequestReceivedEmail } = await import("@/lib/email");
    const { createQuoteRequest } = await import("@/lib/actions/quote-requests");

    await expect(
      createQuoteRequest(
        "vitriny",
        undefined,
        makeFormData({
          customerName: "Maria",
          customerEmail: "maria@example.com",
          customerPhone: "11999999999",
          serviceId,
          description: "Preciso pintar a sala."
        })
      )
    ).rejects.toThrow("/u/vitriny/orcamento?success=1");

    expect(sendQuoteRequestReceivedEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "perfil@example.com",
        businessName: "Vitriny Serviços",
        customerName: "Maria",
        serviceName: "Pintura",
        dashboardUrl: expect.stringContaining("/dashboard/pedidos")
      })
    );
  });

  it(
    "mantém o fluxo normal sem Pix para serviço FIXED em REQUEST_ONLY",
    async () => {
      db.providerProfile.findUnique.mockResolvedValue({
        id: "profile-1",
        plan: "FREE",
        isPublished: true,
        businessName: "Vitriny Serviços",
        email: "perfil@example.com",
        pixKey: "11999999999",
        pixHolderName: "Vitriny Serviços",
        pixCity: "Fortaleza",
        user: { email: "conta@example.com" }
      });
      db.service.findFirst.mockResolvedValue({
        id: serviceId,
        name: "Pintura",
        pricingType: "FIXED",
        fixedServiceCheckoutMode: "REQUEST_ONLY",
        basePrice: 500
      });

      const { createQuoteRequest } = await import("@/lib/actions/quote-requests");

      await expect(
        createQuoteRequest(
          "vitriny",
          undefined,
          makeFormData({
            customerName: "Maria",
            customerPhone: "11999999999",
            serviceId,
            description: ""
          })
        )
      ).rejects.toThrow("/u/vitriny/orcamento?success=1");

      expect(db.quoteRequest.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.not.objectContaining({
            fixedServiceAmount: expect.anything()
          })
        })
      );
    }
  );

  it("exige Pix quando o profissional configurou pagamento imediato", async () => {
    db.providerProfile.findUnique.mockResolvedValue({
      id: "profile-1",
      plan: "FREE",
      isPublished: true,
      businessName: "Vitriny Serviços",
      email: "perfil@example.com",
      pixKey: "11999999999",
      pixHolderName: "Vitriny Serviços",
      pixCity: "Fortaleza",
      user: { email: "conta@example.com" }
    });
    db.service.findFirst.mockResolvedValue({
      id: serviceId,
      name: "Pintura",
      pricingType: "FIXED",
      fixedServiceCheckoutMode: "REQUIRE_PIX_PAYMENT",
      basePrice: 500
    });

    const { createQuoteRequest } = await import("@/lib/actions/quote-requests");

    await expect(
      createQuoteRequest(
        "vitriny",
        undefined,
        makeFormData({
          customerName: "Maria",
          customerPhone: "11999999999",
          serviceId,
          description: ""
        })
      )
    ).rejects.toThrow("/u/vitriny/reserva/request-1");

    expect(db.quoteRequest.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          fixedServiceAmount: 500,
          pixReservationRequestedAt: expect.any(Date)
        })
      })
    );
  });

  it("bloqueia pedido quando Pix é obrigatório mas deixou de estar configurado", async () => {
    db.providerProfile.findUnique.mockResolvedValue({
      id: "profile-1",
      plan: "FREE",
      isPublished: true,
      businessName: "Vitriny Serviços",
      email: "perfil@example.com",
      pixKey: null,
      pixHolderName: null,
      pixCity: null,
      user: { email: "conta@example.com" }
    });
    db.service.findFirst.mockResolvedValue({
      id: serviceId,
      name: "Pintura",
      pricingType: "FIXED",
      fixedServiceCheckoutMode: "REQUIRE_PIX_PAYMENT",
      basePrice: 500
    });

    const { createQuoteRequest } = await import("@/lib/actions/quote-requests");

    await expect(
      createQuoteRequest(
        "vitriny",
        undefined,
        makeFormData({
          customerName: "Maria",
          customerPhone: "11999999999",
          serviceId,
          description: ""
        })
      )
    ).rejects.toThrow("/u/vitriny/orcamento?error=payment-unavailable");

    expect(db.quoteRequest.create).not.toHaveBeenCalled();
  });

  it("bloqueia pedido quando limite mensal FREE foi atingido", async () => {
    db.quoteRequest.count.mockResolvedValue(10);

    const { createQuoteRequest } = await import("@/lib/actions/quote-requests");

    await expect(
      createQuoteRequest(
        "vitriny",
        undefined,
        makeFormData({
          customerName: "Maria",
          customerEmail: "maria@example.com",
          serviceId,
          description: "Preciso pintar a sala."
        })
      )
    ).rejects.toThrow("error=limit-monthly-quote-requests");

    expect(db.quoteRequest.create).not.toHaveBeenCalled();
  });

  it("envia e-mail de confirmação ao cliente quando e-mail foi informado", async () => {
    const { sendQuoteRequestConfirmationToCustomerEmail } = await import("@/lib/email");
    const { createQuoteRequest } = await import("@/lib/actions/quote-requests");

    await expect(
      createQuoteRequest(
        "vitriny",
        undefined,
        makeFormData({
          customerName: "Carlos",
          customerEmail: "carlos@example.com",
          serviceId,
          description: "Preciso pintar a sala."
        })
      )
    ).rejects.toThrow("/u/vitriny/orcamento?success=1");

    expect(sendQuoteRequestConfirmationToCustomerEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "carlos@example.com",
        businessName: "Vitriny Serviços",
        isPixPayment: false
      })
    );
  });

  it("não envia e-mail de confirmação quando cliente não informou e-mail", async () => {
    const { sendQuoteRequestConfirmationToCustomerEmail } = await import("@/lib/email");
    const { createQuoteRequest } = await import("@/lib/actions/quote-requests");

    await expect(
      createQuoteRequest(
        "vitriny",
        undefined,
        makeFormData({
          customerName: "Carlos",
          customerPhone: "11999999999",
          serviceId,
          description: "Preciso pintar a sala."
        })
      )
    ).rejects.toThrow("/u/vitriny/orcamento?success=1");

    expect(sendQuoteRequestConfirmationToCustomerEmail).not.toHaveBeenCalled();
  });

  it("grava o snapshot do nome do item para preservar o histórico", async () => {
    const { createQuoteRequest } = await import("@/lib/actions/quote-requests");

    await expect(
      createQuoteRequest(
        "vitriny",
        undefined,
        makeFormData({
          customerName: "Maria",
          customerEmail: "maria@example.com",
          serviceId,
          description: "Preciso pintar a sala."
        })
      )
    ).rejects.toThrow("/u/vitriny/orcamento?success=1");

    expect(db.quoteRequest.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ serviceNameSnapshot: "Pintura" })
      })
    );
  });

  it("rejeita pedido sem item selecionado", async () => {
    const { createQuoteRequest } = await import("@/lib/actions/quote-requests");

    const result = await createQuoteRequest(
      "vitriny",
      undefined,
      makeFormData({
        customerName: "Maria",
        customerEmail: "maria@example.com",
        description: "Preciso de um orçamento."
      })
    );

    expect(result).toEqual({
      error: "Selecione um item da vitrine para enviar a solicitação."
    });
    expect(db.quoteRequest.create).not.toHaveBeenCalled();
  });
});

describe("markPixReservationPaid", () => {
  it("confirma o Pix manualmente para o pedido do prestador", async () => {
    const { requireProviderProfile } = await import("@/lib/actions/auth-guard");
    vi.mocked(requireProviderProfile).mockResolvedValue({
      profile: { id: "profile-1", plan: "FREE", businessType: "SERVICES" },
      userId: "user-1"
    });
    db.quoteRequest.findFirst.mockResolvedValue({
      id: "request-1",
      pixReservationRequestedAt: new Date(),
      pixReservationPaidAt: null
    });
    db.quoteRequest.update.mockResolvedValue({});

    const { markPixReservationPaid } = await import(
      "@/lib/actions/quote-requests"
    );

    await expect(
      markPixReservationPaid(makeFormData({ requestId: "request-1" }))
    ).rejects.toThrow("/dashboard/pedidos");

    expect(db.quoteRequest.update).toHaveBeenCalledWith({
      data: { pixReservationPaidAt: expect.any(Date) },
      where: { id: "request-1" }
    });
  });
});

describe("markPixReservationClientPaid", () => {
  function mockReservation(overrides: Record<string, unknown> = {}) {
    db.providerProfile.findUnique.mockResolvedValue({
      id: "profile-1",
      businessName: "Vitriny Serviços",
      email: "perfil@example.com",
      user: { email: "conta@example.com" }
    });
    db.quoteRequest.findFirst.mockResolvedValue({
      id: "request-1",
      customerName: "Maria",
      serviceNameSnapshot: "Pintura",
      fixedServiceAmount: { toString: () => "500" },
      pixReservationRequestedAt: new Date(),
      pixReservationPaidAt: null,
      pixReservationClientPaidAt: null,
      service: { name: "Pintura" },
      ...overrides
    });
    db.quoteRequest.update.mockResolvedValue({});
  }

  it("grava o sinal e envia e-mail quando a reserva está pendente", async () => {
    mockReservation();
    const { sendPixReservationClientPaidEmail } = await import("@/lib/email");
    const { markPixReservationClientPaid } = await import(
      "@/lib/actions/quote-requests"
    );

    await expect(
      markPixReservationClientPaid(
        "vitriny",
        makeFormData({ requestId: "request-1" })
      )
    ).rejects.toThrow("/u/vitriny/reserva/request-1");

    expect(db.quoteRequest.update).toHaveBeenCalledWith({
      data: { pixReservationClientPaidAt: expect.any(Date) },
      where: { id: "request-1" }
    });
    expect(sendPixReservationClientPaidEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "perfil@example.com",
        businessName: "Vitriny Serviços",
        customerName: "Maria",
        serviceName: "Pintura",
        // Moeda pt-BR usa espaço não separável — gerar o esperado com o
        // mesmo formatador em vez de string literal.
        amount: new Intl.NumberFormat("pt-BR", {
          style: "currency",
          currency: "BRL"
        }).format(500),
        dashboardUrl: expect.stringContaining("/dashboard/pedidos")
      })
    );
  });

  it("é idempotente: segundo clique não regrava nem erra", async () => {
    mockReservation({ pixReservationClientPaidAt: new Date() });
    const { markPixReservationClientPaid } = await import(
      "@/lib/actions/quote-requests"
    );

    await expect(
      markPixReservationClientPaid(
        "vitriny",
        makeFormData({ requestId: "request-1" })
      )
    ).rejects.toThrow("/u/vitriny/reserva/request-1");

    expect(db.quoteRequest.update).not.toHaveBeenCalled();
  });

  it("não grava quando o negócio já confirmou o pagamento", async () => {
    mockReservation({ pixReservationPaidAt: new Date() });
    const { markPixReservationClientPaid } = await import(
      "@/lib/actions/quote-requests"
    );

    await expect(
      markPixReservationClientPaid(
        "vitriny",
        makeFormData({ requestId: "request-1" })
      )
    ).rejects.toThrow("/u/vitriny/reserva/request-1");

    expect(db.quoteRequest.update).not.toHaveBeenCalled();
  });

  it("não grava quando a reserva expirou", async () => {
    const threeDaysAgo = new Date(Date.now() - 72 * 60 * 60 * 1000);
    mockReservation({ pixReservationRequestedAt: threeDaysAgo });
    const { markPixReservationClientPaid } = await import(
      "@/lib/actions/quote-requests"
    );

    await expect(
      markPixReservationClientPaid(
        "vitriny",
        makeFormData({ requestId: "request-1" })
      )
    ).rejects.toThrow("/u/vitriny/reserva/request-1");

    expect(db.quoteRequest.update).not.toHaveBeenCalled();
  });

  it("rejeita pedido que não pertence ao perfil do slug", async () => {
    db.providerProfile.findUnique.mockResolvedValue({
      id: "profile-1",
      businessName: "Vitriny Serviços",
      email: "perfil@example.com",
      user: { email: "conta@example.com" }
    });
    db.quoteRequest.findFirst.mockResolvedValue(null);
    const { markPixReservationClientPaid } = await import(
      "@/lib/actions/quote-requests"
    );

    await expect(
      markPixReservationClientPaid(
        "vitriny",
        makeFormData({ requestId: "request-de-outro" })
      )
    ).rejects.toThrow("/u/vitriny");

    expect(db.quoteRequest.update).not.toHaveBeenCalled();
  });
});

describe("updateQuoteRequestDescription", () => {
  it("atualiza a observação de um pedido do próprio prestador", async () => {
    const { requireProviderProfile } = await import("@/lib/actions/auth-guard");
    vi.mocked(requireProviderProfile).mockResolvedValue({
      profile: { id: "profile-1", plan: "FREE", businessType: "SERVICES" },
      userId: "user-1"
    });
    db.quoteRequest.findFirst.mockResolvedValue({ id: "request-1" });
    db.quoteRequest.update.mockResolvedValue({});

    const { updateQuoteRequestDescription } = await import(
      "@/lib/actions/quote-requests"
    );
    const result = await updateQuoteRequestDescription(
      undefined,
      makeFormData({
        requestId: "request-1",
        description: "  Cliente prefere atendimento à tarde.  "
      })
    );

    expect(result).toBeUndefined();
    expect(db.quoteRequest.update).toHaveBeenCalledWith({
      data: { description: "Cliente prefere atendimento à tarde." },
      where: { id: "request-1" }
    });
  });
});
