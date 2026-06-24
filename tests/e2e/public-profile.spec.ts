import { test, expect } from "@playwright/test";
import { E2E_PROVIDER_SLUG } from "./global-setup";

test.describe("Perfil público do prestador", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`/u/${E2E_PROVIDER_SLUG}`);
  });

  test("exibe nome do negócio do prestador", async ({ page }) => {
    await expect(page.locator("text=E2E Test Business")).toBeVisible();
  });

  test("exibe cidade e estado do prestador", async ({ page }) => {
    await expect(page.locator("text=São Paulo")).toBeVisible();
  });

  test("exibe serviços ativos do prestador", async ({ page }) => {
    await expect(page.locator("text=Pintura residencial")).toBeVisible();
  });

  test("exibe botão ou link para solicitar orçamento", async ({ page }) => {
    const link = page.locator(`a[href*="/u/${E2E_PROVIDER_SLUG}/orcamento"]`);
    await expect(link.first()).toBeVisible();
  });

  test("retorna 404 para slug inexistente", async ({ page }) => {
    const response = await page.goto("/u/prestador-que-nao-existe-xyz123");
    expect(response?.status()).toBe(404);
  });
});
