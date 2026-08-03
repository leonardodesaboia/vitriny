import { describe, it, expect } from "vitest";
import { resolvePlanFromPreapproval } from "@/lib/mp-plan";

describe("resolvePlanFromPreapproval", () => {
  it("assinatura autorizada vira PRO", () => {
    expect(resolvePlanFromPreapproval("authorized")).toBe("PRO");
  });

  it("cancelada vira FREE", () => {
    expect(resolvePlanFromPreapproval("cancelled")).toBe("FREE");
  });

  it("pausada vira FREE", () => {
    expect(resolvePlanFromPreapproval("paused")).toBe("FREE");
  });

  it("pending nao muda o plano (retorna null)", () => {
    expect(resolvePlanFromPreapproval("pending")).toBeNull();
  });

  it("status desconhecido nao muda o plano (retorna null)", () => {
    expect(resolvePlanFromPreapproval("whatever")).toBeNull();
  });
});
