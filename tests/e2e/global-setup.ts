import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

export const E2E_USER_EMAIL = "e2e-test@orcafacil.test";
export const E2E_USER_PASSWORD = "TestPassword123!";
export const E2E_PROVIDER_SLUG = "e2e-test-provider";

export default async function globalSetup() {
  const db = new PrismaClient();

  try {
    // Clean up any previous run
    const existing = await db.user.findUnique({ where: { email: E2E_USER_EMAIL } });
    if (existing) {
      await db.user.delete({ where: { email: E2E_USER_EMAIL } });
    }

    const hashedPassword = await bcrypt.hash(E2E_USER_PASSWORD, 10);
    const user = await db.user.create({
      data: { email: E2E_USER_EMAIL, password: hashedPassword, name: "E2E Test User" }
    });

    const profile = await db.providerProfile.create({
      data: {
        userId: user.id,
        slug: E2E_PROVIDER_SLUG,
        businessName: "E2E Test Business",
        description: "Especialistas em testes automatizados",
        city: "São Paulo",
        state: "SP",
        plan: "FREE",
        isPublished: true
      }
    });

    await db.service.create({
      data: {
        providerId: profile.id,
        name: "Pintura residencial",
        description: "Pintura completa de interiores",
        basePrice: 500,
        isActive: true
      }
    });
  } finally {
    await db.$disconnect();
  }
}
