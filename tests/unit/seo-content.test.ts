import { describe, expect, it } from "vitest";

import { hasSufficientStorefrontContent } from "@/lib/seo/storefront-content";

const empty = {
  activeItemCount: 0,
  description: null,
  city: null,
  state: null,
  address: null,
  phone: null,
  email: null,
};

describe("hasSufficientStorefrontContent", () => {
  it("vitrine só com nome (nada preenchido) é insuficiente", () => {
    expect(hasSufficientStorefrontContent(empty)).toBe(false);
  });

  it("um item ativo já é suficiente", () => {
    expect(
      hasSufficientStorefrontContent({ ...empty, activeItemCount: 1 }),
    ).toBe(true);
  });

  it("descrição preenchida é suficiente", () => {
    expect(
      hasSufficientStorefrontContent({ ...empty, description: "Ateliê floral" }),
    ).toBe(true);
  });

  it("só localização (sem contato) NÃO basta", () => {
    expect(
      hasSufficientStorefrontContent({ ...empty, city: "Fortaleza" }),
    ).toBe(false);
  });

  it("só contato (sem localização) NÃO basta", () => {
    expect(
      hasSufficientStorefrontContent({ ...empty, phone: "85999990000" }),
    ).toBe(false);
  });

  it("localização + contato juntos são suficientes", () => {
    expect(
      hasSufficientStorefrontContent({
        ...empty,
        state: "CE",
        email: "contato@x.com",
      }),
    ).toBe(true);
  });

  it("ignora espaços em branco", () => {
    expect(
      hasSufficientStorefrontContent({ ...empty, description: "   " }),
    ).toBe(false);
  });
});
