import { describe, expect, it } from "vitest";

import { itemShareMessage } from "@/lib/whatsapp-messages";

describe("itemShareMessage", () => {
  const url = "https://vitriny.app/u/doceria/orcamento?serviceId=abc";

  it("inclui nome, preço e link quando há preço fixo", () => {
    expect(itemShareMessage("Bolo de pote", "R$ 25,00", url)).toBe(
      `Olá! Veja Bolo de pote na minha vitrine — R$ 25,00:\n${url}`
    );
  });

  it("omite o preço quando o item é sob consulta", () => {
    expect(itemShareMessage("Bolo de pote", null, url)).toBe(
      `Olá! Veja Bolo de pote na minha vitrine:\n${url}`
    );
  });
});
