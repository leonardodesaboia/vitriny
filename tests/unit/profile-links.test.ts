import { describe, expect, it } from "vitest";

import {
  MAX_PROFILE_LINKS,
  normalizeLinkUrl,
  parseProfileLinks,
  sanitizeProfileLinks,
} from "@/lib/profile-links";

describe("normalizeLinkUrl", () => {
  it("prefixa https:// quando falta esquema", () => {
    expect(normalizeLinkUrl("exemplo.com")).toBe("https://exemplo.com/");
  });

  it("mantém caminho e query", () => {
    expect(normalizeLinkUrl("exemplo.com/cardapio?x=1")).toBe(
      "https://exemplo.com/cardapio?x=1"
    );
  });

  it("aceita http:// e https:// explícitos", () => {
    expect(normalizeLinkUrl("http://exemplo.com")).toBe("http://exemplo.com/");
    expect(normalizeLinkUrl("https://exemplo.com/loja")).toBe(
      "https://exemplo.com/loja"
    );
  });

  it("rejeita esquemas perigosos", () => {
    expect(normalizeLinkUrl("javascript:alert(1)")).toBeNull();
    expect(normalizeLinkUrl("data:text/html;base64,PHM=")).toBeNull();
    expect(normalizeLinkUrl("mailto:a@b.com")).toBeNull();
  });

  it("rejeita string vazia", () => {
    expect(normalizeLinkUrl("   ")).toBeNull();
  });
});

describe("sanitizeProfileLinks", () => {
  it("descarta linhas totalmente vazias", () => {
    const result = sanitizeProfileLinks([
      { label: "", url: "" },
      { label: "Site", url: "exemplo.com" },
    ]);
    expect(result.errors).toEqual([]);
    expect(result.links).toEqual([
      { label: "Site", url: "https://exemplo.com/" },
    ]);
  });

  it("exige rótulo quando há URL", () => {
    const result = sanitizeProfileLinks([{ label: "", url: "exemplo.com" }]);
    expect(result.links).toEqual([]);
    expect(result.errors.length).toBe(1);
  });

  it("exige URL válida quando há rótulo", () => {
    const result = sanitizeProfileLinks([{ label: "Site", url: "" }]);
    expect(result.links).toEqual([]);
    expect(result.errors.length).toBe(1);
  });

  it("rejeita URL com esquema perigoso", () => {
    const result = sanitizeProfileLinks([
      { label: "Site", url: "javascript:alert(1)" },
    ]);
    expect(result.links).toEqual([]);
    expect(result.errors.length).toBe(1);
  });

  it("rejeita rótulo muito longo", () => {
    const result = sanitizeProfileLinks([
      { label: "x".repeat(41), url: "exemplo.com" },
    ]);
    expect(result.links).toEqual([]);
    expect(result.errors.length).toBe(1);
  });

  it("corta no máximo permitido", () => {
    const raw = Array.from({ length: MAX_PROFILE_LINKS + 3 }, (_, i) => ({
      label: `Link ${i}`,
      url: `exemplo${i}.com`,
    }));
    const result = sanitizeProfileLinks(raw);
    expect(result.links.length).toBe(MAX_PROFILE_LINKS);
  });
});

describe("parseProfileLinks", () => {
  it("lê um array JSON válido", () => {
    expect(
      parseProfileLinks([{ label: "Site", url: "https://exemplo.com/" }])
    ).toEqual([{ label: "Site", url: "https://exemplo.com/" }]);
  });

  it("retorna [] para null", () => {
    expect(parseProfileLinks(null)).toEqual([]);
  });

  it("ignora itens malformados", () => {
    expect(
      parseProfileLinks([{ label: "Site" }, 42, { label: "Ok", url: "https://x.com/" }])
    ).toEqual([{ label: "Ok", url: "https://x.com/" }]);
  });

  it("descarta URLs com esquema não http(s) vindas do banco", () => {
    expect(
      parseProfileLinks([
        { label: "Ruim", url: "javascript:alert(1)" },
        { label: "Ok", url: "https://x.com/" },
      ])
    ).toEqual([{ label: "Ok", url: "https://x.com/" }]);
  });
});
