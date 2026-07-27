import { describe, expect, it } from "vitest";

import { resolveQuoteRequestReturnPath } from "@/lib/actions/return-path";

describe("resolveQuoteRequestReturnPath", () => {
  it("aceita a lista e o detalhe de pedidos", () => {
    expect(resolveQuoteRequestReturnPath("/dashboard/pedidos")).toBe(
      "/dashboard/pedidos"
    );
    expect(resolveQuoteRequestReturnPath("/dashboard/pedidos/abc")).toBe(
      "/dashboard/pedidos/abc"
    );
  });

  it("rejeita destinos fora de pedidos e redirects abertos", () => {
    expect(resolveQuoteRequestReturnPath("/dashboard/billing")).toBe(
      "/dashboard/pedidos"
    );
    expect(resolveQuoteRequestReturnPath("//evil.com")).toBe(
      "/dashboard/pedidos"
    );
    expect(resolveQuoteRequestReturnPath("https://evil.com")).toBe(
      "/dashboard/pedidos"
    );
    expect(resolveQuoteRequestReturnPath("/dashboard/pedidos/../conta")).toBe(
      "/dashboard/pedidos"
    );
    expect(resolveQuoteRequestReturnPath(null)).toBe("/dashboard/pedidos");
  });
});
