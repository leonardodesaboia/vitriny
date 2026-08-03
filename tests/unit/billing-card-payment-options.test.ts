import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("opções de pagamento da assinatura", () => {
  it("mantém cartão e não expõe Pix enquanto o gate está bloqueado", () => {
    const billingCard = readFileSync(
      resolve(process.cwd(), "components/billing/BillingCard.tsx"),
      "utf8"
    );

    expect(billingCard).toContain("Assinar com cartão");
    expect(billingCard).not.toContain("Assinar com Pix");
    expect(billingCard).not.toContain("createMpPixSubscription");
  });
});
