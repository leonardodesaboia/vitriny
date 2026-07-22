import { describe, expect, it } from "vitest";

import { buildStorefrontViewsSummary } from "@/lib/dashboard";

describe("buildStorefrontViewsSummary", () => {
  it("sem nenhuma view: incentivo a divulgar", () => {
    const s = buildStorefrontViewsSummary({
      views7: 0,
      views30: 0,
      hasRecentOrders: false,
    });
    expect(s.views7).toBe(0);
    expect(s.message).toBe("Comece a divulgar o link da sua vitrine.");
  });

  it("views mas nenhum pedido recente: dica acionável", () => {
    const s = buildStorefrontViewsSummary({
      views7: 12,
      views30: 40,
      hasRecentOrders: false,
    });
    expect(s.views7).toBe(12);
    expect(s.message).toBe(
      "Sua vitrine está recebendo visitas — boas fotos e descrições ajudam a virar pedido."
    );
  });

  it("views e pedidos: mostra total de 30 dias", () => {
    const s = buildStorefrontViewsSummary({
      views7: 12,
      views30: 40,
      hasRecentOrders: true,
    });
    expect(s.message).toBe("40 nos últimos 30 dias");
  });

  it("sem view na semana mas com histórico no mês: mostra 30 dias", () => {
    const s = buildStorefrontViewsSummary({
      views7: 0,
      views30: 8,
      hasRecentOrders: false,
    });
    expect(s.message).toBe("8 nos últimos 30 dias");
  });
});
