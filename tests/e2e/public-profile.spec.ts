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
    await expect(page.getByText("Serviço", { exact: true }).first()).toBeVisible();
  });

  test("exibe botão ou link para enviar solicitação", async ({ page }) => {
    const link = page.locator(`a[href*="/u/${E2E_PROVIDER_SLUG}/orcamento"]`);
    await expect(link.first()).toBeVisible();
  });

  test("retorna 404 para slug inexistente", async ({ page }) => {
    const response = await page.goto("/u/prestador-que-nao-existe-xyz123");
    expect(response?.status()).toBe(404);
  });
});
