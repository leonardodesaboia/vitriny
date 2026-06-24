import { testDb } from "./setup";
import { makeFormData } from "../helpers";

export { makeFormData };

export async function seedUser(email = "integration@test.com") {
  return testDb.user.create({
    data: { email, name: "Integration Test User" }
  });
}

export async function seedProfile(userId: string, plan: "FREE" | "PRO" = "FREE") {
  return testDb.providerProfile.create({
    data: {
      userId,
      slug: `test-${userId.slice(-6)}`,
      businessName: "Integration Test Business",
      plan,
      isPublished: true
    }
  });
}

export async function seedService(
  profileId: string,
  overrides: Record<string, unknown> = {}
) {
  return testDb.service.create({
    data: {
      providerId: profileId,
      name: "Pintura residencial",
      isActive: true,
      ...overrides
    }
  });
}

export async function seedQuoteRequest(
  profileId: string,
  overrides: Record<string, unknown> = {}
) {
  return testDb.quoteRequest.create({
    data: {
      providerId: profileId,
      customerName: "João Silva",
      description: "Preciso pintar minha casa",
      status: "NEW",
      ...overrides
    }
  });
}
