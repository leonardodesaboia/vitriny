import { describe, expect, it } from "vitest";

import { normalizeSocialUrl, SOCIAL_LABELS } from "@/lib/social-links";

describe("normalizeSocialUrl", () => {
  it("@handle no Instagram", () => {
    expect(normalizeSocialUrl("instagram", "@meunegocio")).toBe(
      "https://instagram.com/meunegocio"
    );
  });

  it("handle puro no Facebook", () => {
    expect(normalizeSocialUrl("facebook", "meunegocio")).toBe(
      "https://facebook.com/meunegocio"
    );
  });

  it("TikTok usa /@handle", () => {
    expect(normalizeSocialUrl("tiktok", "meunegocio")).toBe(
      "https://tiktok.com/@meunegocio"
    );
  });

  it("URL completa da rede certa é aceita", () => {
    expect(
      normalizeSocialUrl("instagram", "https://www.instagram.com/meunegocio")
    ).toBe("https://www.instagram.com/meunegocio");
  });

  it("URL de domínio errado é rejeitada", () => {
    expect(
      normalizeSocialUrl("instagram", "https://facebook.com/meunegocio")
    ).toBeNull();
  });

  it("handle com espaço é rejeitado", () => {
    expect(normalizeSocialUrl("instagram", "meu negocio")).toBeNull();
  });

  it("vazio e espaços retornam null", () => {
    expect(normalizeSocialUrl("instagram", "")).toBeNull();
    expect(normalizeSocialUrl("instagram", "   ")).toBeNull();
  });

  it("URL inválida é rejeitada", () => {
    expect(normalizeSocialUrl("instagram", "https://")).toBeNull();
  });
});

describe("SOCIAL_LABELS", () => {
  it("labels de exibição por rede", () => {
    expect(SOCIAL_LABELS.instagram).toBe("Instagram");
    expect(SOCIAL_LABELS.facebook).toBe("Facebook");
    expect(SOCIAL_LABELS.tiktok).toBe("TikTok");
  });
});
