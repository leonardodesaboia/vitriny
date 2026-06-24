import { test, expect } from "@playwright/test";

test.describe("Landing page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("carrega com status 200", async ({ page }) => {
    await expect(page).toHaveURL("/");
    await expect(page.locator("main")).toBeVisible();
  });

  test("exibe seção de funcionalidades", async ({ page }) => {
    const features = page.locator("#como-funciona");
    await expect(features).toBeVisible();
  });

  test("exibe link de login no header", async ({ page }) => {
    const loginLink = page.locator('a[href="/login"]').first();
    await expect(loginLink).toBeVisible();
  });

  test("link de cadastro direciona para /cadastro", async ({ page }) => {
    const signupLink = page.locator('a[href="/cadastro"]').first();
    await expect(signupLink).toBeVisible();
    await signupLink.click();
    await expect(page).toHaveURL("/cadastro");
  });

  test("link de login direciona para /login", async ({ page }) => {
    const loginLink = page.locator('a[href="/login"]').first();
    await loginLink.click();
    await expect(page).toHaveURL("/login");
  });
});

test.describe("Página de login", () => {
  test("exibe formulário com campos de email e senha", async ({ page }) => {
    await page.goto("/login");

    await expect(page.locator("#email")).toBeVisible();
    await expect(page.locator("#password")).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test("exibe mensagem de erro com credenciais inválidas", async ({ page }) => {
    await page.goto("/login");

    await page.fill("#email", "inexistente@test.com");
    await page.fill("#password", "SenhaErrada123!");
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/error=/);
  });

  test("link de cadastro está visível", async ({ page }) => {
    await page.goto("/login");

    const link = page.locator('a[href="/cadastro"]');
    await expect(link).toBeVisible();
  });
});

test.describe("Rotas protegidas", () => {
  test("redireciona /dashboard para /login quando não autenticado", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);
  });

  test("redireciona /dashboard/servicos para /login quando não autenticado", async ({
    page
  }) => {
    await page.goto("/dashboard/servicos");
    await expect(page).toHaveURL(/\/login/);
  });

  test("redireciona /dashboard/pedidos para /login quando não autenticado", async ({
    page
  }) => {
    await page.goto("/dashboard/pedidos");
    await expect(page).toHaveURL(/\/login/);
  });
});
