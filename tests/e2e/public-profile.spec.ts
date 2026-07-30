import { test, expect } from "@playwright/test";
import { E2E_PROVIDER_SLUG } from "./global-setup";

test.describe("Vitrine pública do negócio", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`/u/${E2E_PROVIDER_SLUG}`);
  });

  test("exibe nome do negócio", async ({ page }) => {
    await expect(page.locator("text=E2E Test Business")).toBeVisible();
  });

  test("exibe cidade e estado do negócio", async ({ page }) => {
    await expect(page.locator("text=São Paulo")).toBeVisible();
  });

  test("exibe itens ativos da vitrine", async ({ page }) => {
    await expect(page.locator("text=Pintura residencial")).toBeVisible();
    // Negócio de um tipo só não mostra badge Produto/Serviço (seria ruído — todo
    // item é igual); o sinal acionável do card é o CTA de venda.
    await expect(page.getByText("Solicitar orçamento").first()).toBeVisible();
  });

  test("exibe botão ou link para enviar solicitação", async ({ page }) => {
    const link = page.locator(`a[href*="/u/${E2E_PROVIDER_SLUG}/orcamento"]`);
    await expect(link.first()).toBeVisible();
  });

  test("oferece um link discreto para criar uma vitrine no Vitriny", async ({
    page,
  }) => {
    const creditLink = page.getByRole("link", {
      name: "Vitriny",
      exact: true,
    });

    await expect(creditLink).toBeVisible();
    await expect(creditLink).toHaveAttribute("href", "/");
  });

  test("retorna 404 para slug inexistente", async ({ page }) => {
    const response = await page.goto("/u/prestador-que-nao-existe-xyz123");
    expect(response?.status()).toBe(404);
  });
});
