import { test as setup, expect } from "@playwright/test";
import { E2E_USER_EMAIL, E2E_USER_PASSWORD } from "./global-setup";

const AUTH_FILE = "tests/e2e/.auth/user.json";

setup("autenticar usuário de teste", async ({ page }) => {
  await page.goto("/login");

  await page.fill("#email", E2E_USER_EMAIL);
  await page.fill("#password", E2E_USER_PASSWORD);
  await page.click('button[type="submit"]');

  await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });

  await page.context().storageState({ path: AUTH_FILE });
});
