import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll } from "vitest";

// Clear the Prisma global singleton so it picks up the test DATABASE_URL (set via vitest env)
(globalThis as Record<string, unknown>).prisma = undefined;

export const testDb = new PrismaClient();

export async function cleanDatabase() {
  await testDb.proposalItem.deleteMany({});
  await testDb.proposalStatusHistory.deleteMany({});
  await testDb.proposalTemplateItem.deleteMany({});
  await testDb.quoteRequestInternalNote.deleteMany({});
  await testDb.quoteRequestStatusHistory.deleteMany({});
  await testDb.proposal.deleteMany({});
  await testDb.quoteRequest.deleteMany({});
  await testDb.service.deleteMany({});
  await testDb.proposalTemplate.deleteMany({});
  await testDb.providerProfile.deleteMany({});
  await testDb.passwordResetToken.deleteMany({});
  await testDb.session.deleteMany({});
  await testDb.account.deleteMany({});
  await testDb.verificationToken.deleteMany({});
  await testDb.user.deleteMany({});
}

beforeAll(async () => {
  await cleanDatabase();
});

afterAll(async () => {
  await cleanDatabase();
  await testDb.$disconnect();
});
