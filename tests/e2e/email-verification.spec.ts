import crypto from "node:crypto";

import { expect, test } from "@playwright/test";
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

test.afterAll(async () => {
  await db.user.deleteMany({
    where: { email: { startsWith: "e2e-verification-" } }
  });
  await db.$disconnect();
});

test("confirma o e-mail por POST antes de permitir o login", async ({ page }) => {
  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const email = `e2e-verification-${Date.now()}@vitriny.test`;

  const user = await db.user.create({
    data: {
      email,
      name: "E2E Verification",
      password: "not-used-in-this-test",
      emailVerified: null,
      emailVerificationToken: {
        create: {
          tokenHash,
          expiresAt: new Date(Date.now() + 60_000)
        }
      }
    }
  });

  await page.goto(`/verificar-email/${token}`);
  await expect(page.getByRole("heading", { name: "Confirmar e-mail" })).toBeVisible();
  await page.getByRole("button", { name: "Confirmar meu e-mail" }).click();

  await expect(page).toHaveURL(/\/login\?verified=1/);
  await expect(page.getByText("E-mail confirmado. Agora você pode entrar.")).toBeVisible();

  const verifiedUser = await db.user.findUnique({ where: { id: user.id } });
  expect(verifiedUser?.emailVerified).not.toBeNull();
});
