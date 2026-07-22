import { describe, it, expect, vi, beforeEach } from "vitest";

import { cleanDatabase, testDb } from "./setup";
import { seedProfile, seedService, seedUser } from "./helpers";

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

  it("conta view de item para um item ativo da vitrine", async () => {
    const service = await seedService(profileId, { name: "Pintura" });

    const { POST } = await import("@/app/api/storefront-view/route");
    await POST(makeRequest({ slug, serviceId: service.id }));
    await POST(makeRequest({ slug, serviceId: service.id }));

    const itemRows = await testDb.itemView.findMany({
      where: { serviceId: service.id },
    });
    expect(itemRows.length).toBe(1);
    expect(itemRows[0].count).toBe(2);

    const storeRows = await testDb.storefrontView.findMany({
      where: { providerId: profileId },
    });
    expect(storeRows.length).toBe(0);
  });

  it("não conta item de outra vitrine", async () => {
    const otherUser = await seedUser("other@test.com");
    const otherProfile = await seedProfile(otherUser.id);
    const otherService = await seedService(otherProfile.id, { name: "Alheio" });

    const { POST } = await import("@/app/api/storefront-view/route");
    await POST(makeRequest({ slug, serviceId: otherService.id }));

    const rows = await testDb.itemView.findMany({});
    expect(rows.length).toBe(0);
  });

  it("não conta view de item quando o visitante é o dono", async () => {
    const service = await seedService(profileId, { name: "Reforma" });
    const { auth } = await import("@/auth");
    vi.mocked(auth).mockResolvedValue({ user: { id: ownerId } } as never);

    const { POST } = await import("@/app/api/storefront-view/route");
    await POST(makeRequest({ slug, serviceId: service.id }));

    const rows = await testDb.itemView.findMany({});
    expect(rows.length).toBe(0);
  });

  it("não conta item inativo da vitrine", async () => {
    const service = await seedService(profileId, {
      name: "Suspenso",
      isActive: false,
    });
    // Auto-verificação: o item precisa ter sido criado realmente inativo,
    // senão o teste passaria por engano.
    expect(service.isActive).toBe(false);

    const { POST } = await import("@/app/api/storefront-view/route");
    await POST(makeRequest({ slug, serviceId: service.id }));

    const rows = await testDb.itemView.findMany({});
    expect(rows.length).toBe(0);
  });

  it("serviceId não-string cai no caminho da vitrine, não de item", async () => {
    const { POST } = await import("@/app/api/storefront-view/route");
    await POST(makeRequest({ slug, serviceId: 99999 }));

    const itemRows = await testDb.itemView.findMany({});
    expect(itemRows.length).toBe(0);

    const storeRows = await testDb.storefrontView.findMany({
      where: { providerId: profileId },
    });
    expect(storeRows.length).toBe(1);
  });
});
