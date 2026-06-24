import { vi, beforeEach } from "vitest";

vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(url);
  }),
  notFound: vi.fn(() => {
    throw new Error("NOT_FOUND");
  })
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn()
}));

beforeEach(() => {
  vi.clearAllMocks();
});
