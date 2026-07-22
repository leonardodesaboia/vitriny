import { describe, it, expect, vi, beforeEach } from "vitest";

import { cleanDatabase, testDb } from "./setup";
import { seedProfile, seedUser } from "./helpers";

vi.mock("@/auth", () => ({ auth: vi.fn() }));

let ownerId: string;
let profileId: string;
let slug: string;

beforeEach(async () => {
  vi.resetModules();
  await cleanDatabase();

  const user = await seedUser();
  ownerId = user.id;
  const profile = await seedProfile(ownerId);
  profileId = profile.id;
  slug = profile.slug;
  await testDb.providerProfile.update({
    where: { id: profileId },
    data: { isPublished: true },
  });

  const { auth } = await import("@/auth");
  vi.mocked(auth).mockResolvedValue(null as never);
});

function makeRequest(body: unknown, userAgent = "Mozilla/5.0") {
  return new Request("http://localhost/api/storefront-view", {
    method: "POST",
    headers: { "content-type": "application/json", "user-agent": userAgent },
    body: JSON.stringify(body),
  });
}

describe("POST /api/storefront-view (integração)", () => {
  it("incrementa a mesma linha em dois POSTs no mesmo dia", async () => {
    const { POST } = await import("@/app/api/storefront-view/route");
    await POST(makeRequest({ slug }));
    await POST(makeRequest({ slug }));

    const rows = await testDb.storefrontView.findMany({
      where: { providerId: profileId },
    });
    expect(rows.length).toBe(1);
    expect(rows[0].count).toBe(2);
  });

  it("não conta o dono logado", async () => {
    const { auth } = await import("@/auth");
    vi.mocked(auth).mockResolvedValue({ user: { id: ownerId } } as never);

    const { POST } = await import("@/app/api/storefront-view/route");
    await POST(makeRequest({ slug }));

    const rows = await testDb.storefrontView.findMany({
      where: { providerId: profileId },
    });
    expect(rows.length).toBe(0);
  });

  it("não conta User-Agent de bot", async () => {
    const { POST } = await import("@/app/api/storefront-view/route");
    await POST(makeRequest({ slug }, "facebookexternalhit/1.1"));

    const rows = await testDb.storefrontView.findMany({
      where: { providerId: profileId },
    });
    expect(rows.length).toBe(0);
  });

  it("responde 204 e não cria linha para slug inexistente", async () => {
    const { POST } = await import("@/app/api/storefront-view/route");
    const res = await POST(makeRequest({ slug: "nao-existe" }));

    expect(res.status).toBe(204);
    const rows = await testDb.storefrontView.findMany({});
    expect(rows.length).toBe(0);
  });
});
