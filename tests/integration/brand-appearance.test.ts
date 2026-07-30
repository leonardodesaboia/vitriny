import { describe, expect, it } from "vitest";

import { seedProfile, seedUser } from "./helpers";
import { testDb } from "./setup";

describe("personalização visual (integração)", () => {
  it("persiste todas as novas opções e mantém a última combinação", async () => {
    const user = await seedUser();
    const profile = await seedProfile(user.id, "PRO");

    for (const brandColor of [
      "FOREST",
      "OCEAN",
      "ROSE",
      "GOLD",
      "SLATE",
      "LAVENDER",
      "TERRACOTTA",
      "TEAL",
    ] as const) {
      await testDb.providerProfile.update({
        where: { id: profile.id },
        data: { brandColor },
      });
    }

    for (const brandFont of [
      "CLASSIC",
      "MODERN",
      "ELEGANT",
      "GEOMETRIC",
      "FRIENDLY",
      "EDITORIAL",
    ] as const) {
      await testDb.providerProfile.update({
        where: { id: profile.id },
        data: { brandFont },
      });
    }

    const saved = await testDb.providerProfile.findUniqueOrThrow({
      where: { id: profile.id },
      select: { brandColor: true, brandFont: true },
    });

    expect(saved).toEqual({
      brandColor: "TEAL",
      brandFont: "EDITORIAL",
    });
  });
});
