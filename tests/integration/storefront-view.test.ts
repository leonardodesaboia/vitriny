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
  // seedProfile já cria a vitrine publicada (isPublished: true).

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

  // Ordem importa: sobrescrever o mock de auth ANTES de importar a rota,
  // pois vi.resetModules() (no beforeEach) recarrega o módulo da rota.
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

  it("responde 400 quando falta o slug no corpo", async () => {
    const { POST } = await import("@/app/api/storefront-view/route");
    const res = await POST(makeRequest({}));

    expect(res.status).toBe(400);
    const rows = await testDb.storefrontView.findMany({});
    expect(rows.length).toBe(0);
  });

  it("responde 400 para corpo que não é JSON válido", async () => {
    const { POST } = await import("@/app/api/storefront-view/route");
    const req = new Request("http://localhost/api/storefront-view", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "user-agent": "Mozilla/5.0",
      },
      body: "isto não é json",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("não conta vitrine não publicada (204)", async () => {
    await testDb.providerProfile.update({
      where: { id: profileId },
      data: { isPublished: false },
    });

    const { POST } = await import("@/app/api/storefront-view/route");
    const res = await POST(makeRequest({ slug }));

    expect(res.status).toBe(204);
    const rows = await testDb.storefrontView.findMany({
      where: { providerId: profileId },
    });
    expect(rows.length).toBe(0);
  });
});
