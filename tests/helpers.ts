import { vi } from "vitest";

export function makeFormData(data: Record<string, string | string[]>): FormData {
  const form = new FormData();
  for (const [key, value] of Object.entries(data)) {
    if (Array.isArray(value)) {
      for (const v of value) form.append(key, v);
    } else {
      form.set(key, value);
    }
  }
  return form;
}

export function makePrismaMock() {
  const mock = {
    service: {
      create: vi.fn(),
      update: vi.fn(),
      findFirst: vi.fn(),
      count: vi.fn(),
      delete: vi.fn()
    },
    providerProfile: {
      findUnique: vi.fn(),
      upsert: vi.fn()
    },
    proposalTemplate: {
      create: vi.fn(),
      update: vi.fn(),
      findFirst: vi.fn(),
      count: vi.fn(),
      delete: vi.fn()
    },
    proposalTemplateItem: {
      deleteMany: vi.fn(),
      createMany: vi.fn()
    },
    quoteRequest: {
      findFirst: vi.fn(),
      update: vi.fn(),
      findUnique: vi.fn(),
      count: vi.fn()
    },
    quoteRequestStatusHistory: { create: vi.fn() },
    quoteRequestInternalNote: {
      create: vi.fn(),
      findFirst: vi.fn(),
      delete: vi.fn()
    },
    proposal: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      count: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn()
    },
    proposalStatusHistory: { create: vi.fn() },
    $transaction: vi.fn()
  };

  mock.$transaction.mockImplementation((fn: unknown) => {
    if (typeof fn === "function") return fn(mock);
    return Promise.all(fn as Promise<unknown>[]);
  });

  return mock;
}

export type PrismaMock = ReturnType<typeof makePrismaMock>;

export function makeSession(userId = "user-1") {
  return { user: { id: userId, email: "test@example.com", name: "Test User" } };
}

export function makeProfile(overrides = {}) {
  return { id: "profile-1", plan: "FREE" as const, ...overrides };
}
