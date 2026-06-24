import { PrismaClient } from "@prisma/client";
import { E2E_USER_EMAIL } from "./global-setup";

export default async function globalTeardown() {
  const db = new PrismaClient();

  try {
    const user = await db.user.findUnique({ where: { email: E2E_USER_EMAIL } });
    if (user) {
      await db.user.delete({ where: { email: E2E_USER_EMAIL } });
    }
  } finally {
    await db.$disconnect();
  }
}
