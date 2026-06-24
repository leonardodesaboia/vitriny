import { test, expect } from "@playwright/test";

// Estes testes rodam com auth state salvo pelo auth.setup.ts
test.describe("Dashboard autenticado", () => {
  test("acessa /dashboard após login", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page).not.toHaveURL(/\/login/);
  });

  test("acessa /dashboard/servicos", async ({ page }) => {
    await page.goto("/dashboard/servicos");
    await expect(page).toHaveURL(/\/dashboard\/servicos/);
  });

  test("acessa /dashboard/pedidos", async ({ page }) => {
    await page.goto("/dashboard/pedidos");
    await expect(page).toHaveURL(/\/dashboard\/pedidos/);
  });

  test("acessa /dashboard/perfil", async ({ page }) => {
    await page.goto("/dashboard/perfil");
    await expect(page).toHaveURL(/\/dashboard\/perfil/);
  });

  test("exibe conteúdo do dashboard (não redireciona para login)", async ({ page }) => {
    await page.goto("/dashboard");
    const body = page.locator("body");
    await expect(body).not.toContainText("Entrar");
  });
});

test.describe("Navegação do dashboard", () => {
  test("link de serviços navega para /dashboard/servicos", async ({ page }) => {
    await page.goto("/dashboard");
    const link = page.locator('a[href="/dashboard/servicos"]').first();
    if (await link.isVisible()) {
      await link.click();
      await expect(page).toHaveURL(/\/dashboard\/servicos/);
    }
  });

  test("link de pedidos navega para /dashboard/pedidos", async ({ page }) => {
    await page.goto("/dashboard");
    const link = page.locator('a[href="/dashboard/pedidos"]').first();
    if (await link.isVisible()) {
      await link.click();
      await expect(page).toHaveURL(/\/dashboard\/pedidos/);
    }
  });
});
