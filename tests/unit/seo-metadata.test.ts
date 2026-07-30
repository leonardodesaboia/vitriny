import { describe, expect, it } from "vitest";

import { PRIVATE_METADATA, privateMetadata } from "@/lib/seo/metadata";

describe("metadata privada (noindex)", () => {
  it("PRIVATE_METADATA marca noindex, nofollow", () => {
    expect(PRIVATE_METADATA.robots).toEqual({ index: false, follow: false });
  });

  it("privateMetadata() aceita título opcional preservando o noindex", () => {
    expect(privateMetadata("Login")).toEqual({
      title: "Login",
      robots: { index: false, follow: false },
    });
  });

  it("privateMetadata() sem título ainda é noindex", () => {
    expect(privateMetadata().robots).toEqual({ index: false, follow: false });
    expect(privateMetadata().title).toBeUndefined();
  });
});
