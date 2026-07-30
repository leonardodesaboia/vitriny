import { describe, expect, it } from "vitest";

import {
  BRAND_COLOR_OPTIONS,
  BRAND_FONT_OPTIONS,
  DEFAULT_BRAND_APPEARANCE,
  getBrandAppearance,
  isBrandColorAvailable,
  isBrandFontAvailable,
} from "@/lib/brand-appearance";

describe("brand appearance", () => {
  it("oferece somente as oito paletas aprovadas", () => {
    expect(BRAND_COLOR_OPTIONS.map((option) => option.id)).toEqual([
      "FOREST",
      "OCEAN",
      "ROSE",
      "GOLD",
      "SLATE",
      "LAVENDER",
      "TERRACOTTA",
      "TEAL",
    ]);
  });

  it("oferece seis tipografias visualmente distintas", () => {
    expect(BRAND_FONT_OPTIONS.map((option) => option.id)).toEqual([
      "CLASSIC",
      "MODERN",
      "ELEGANT",
      "GEOMETRIC",
      "FRIENDLY",
      "EDITORIAL",
    ]);
  });

  it("permite combinar cor e fonte independentemente no PRO", () => {
    expect(getBrandAppearance("PRO", "ROSE", "GEOMETRIC")).toEqual({
      color: "ROSE",
      font: "GEOMETRIC",
    });
  });

  it("faz fallback para o padrão quando a cor salva não é liberada no FREE", () => {
    // GOLD e ELEGANT não são liberados no FREE: cai no padrão.
    expect(getBrandAppearance("FREE", "GOLD", "ELEGANT")).toEqual(
      DEFAULT_BRAND_APPEARANCE,
    );
  });

  it("respeita cor e fonte liberadas no FREE", () => {
    // OCEAN e MODERN fazem parte do kit inicial FREE: mantém ambos.
    expect(getBrandAppearance("FREE", "OCEAN", "MODERN")).toEqual({
      color: "OCEAN",
      font: "MODERN",
    });
  });

  it("faz fallback da fonte quando ela é PRO, preservando a cor liberada", () => {
    // TERRACOTTA é liberado no FREE; ELEGANT é PRO → mantém a cor, fonte padrão.
    expect(getBrandAppearance("FREE", "TERRACOTTA", "ELEGANT")).toEqual({
      color: "TERRACOTTA",
      font: DEFAULT_BRAND_APPEARANCE.font,
    });
  });

  it("faz fallback seguro para valores desconhecidos em runtime", () => {
    expect(
      getBrandAppearance("PRO", "INVALID" as never, "INVALID" as never),
    ).toEqual(DEFAULT_BRAND_APPEARANCE);
  });

  it("libera 3 cores e 2 fontes no FREE", () => {
    expect(isBrandColorAvailable("FREE", "FOREST")).toBe(true);
    expect(isBrandColorAvailable("FREE", "OCEAN")).toBe(true);
    expect(isBrandColorAvailable("FREE", "TERRACOTTA")).toBe(true);
    expect(isBrandColorAvailable("FREE", "ROSE")).toBe(false);
    expect(isBrandColorAvailable("FREE", "TEAL")).toBe(false);

    expect(isBrandFontAvailable("FREE", "CLASSIC")).toBe(true);
    expect(isBrandFontAvailable("FREE", "MODERN")).toBe(true);
    expect(isBrandFontAvailable("FREE", "ELEGANT")).toBe(false);
    expect(isBrandFontAvailable("FREE", "EDITORIAL")).toBe(false);
  });

  it("libera todas as cores e fontes no PRO", () => {
    for (const option of BRAND_COLOR_OPTIONS) {
      expect(isBrandColorAvailable("PRO", option.id)).toBe(true);
    }
    for (const option of BRAND_FONT_OPTIONS) {
      expect(isBrandFontAvailable("PRO", option.id)).toBe(true);
    }
  });
});
