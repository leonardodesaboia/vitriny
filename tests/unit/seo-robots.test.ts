import { afterEach, beforeEach, describe, expect, it } from "vitest";

import robots from "@/app/robots";

describe("robots.txt", () => {
  const originalUrl = process.env.NEXT_PUBLIC_APP_URL;
  afterEach(() => {
    process.env.NEXT_PUBLIC_APP_URL = originalUrl;
  });

  it("bloqueia apenas rotas não-HTML; rotas privadas usam noindex (não disallow)", () => {
    const result = robots();
    const rule = Array.isArray(result.rules) ? result.rules[0] : result.rules;
    expect(rule?.allow).toBe("/");
    // Não misturar disallow com noindex: só `/api` (sem HTML/meta) é bloqueado.
    // dashboard/proposta/auth passam a ser rastreáveis para o Google LER o noindex.
    expect(rule?.disallow).toEqual(["/api"]);
  });

  it("aponta para o sitemap quando a URL do app está definida", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://vitriny.example/";
    expect(robots().sitemap).toBe("https://vitriny.example/sitemap.xml");
  });
});
