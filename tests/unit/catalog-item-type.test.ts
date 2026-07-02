import { describe, expect, it } from "vitest";

import {
  getCatalogItemTypePolicy,
  getFixedCatalogItemType,
} from "@/lib/catalog-item-type";

describe("getCatalogItemTypePolicy", () => {
  it.each([
    ["PRODUCTS", "PRODUCT", false],
    ["SERVICES", "SERVICE", false],
    ["BOTH", "SERVICE", true],
  ] as const)(
    "resolve o perfil %s",
    (businessType, defaultItemType, canChooseItemType) => {
      expect(getCatalogItemTypePolicy(businessType)).toEqual({
        defaultItemType,
        canChooseItemType,
      });
    },
  );
});

describe("getFixedCatalogItemType", () => {
  it("fixa PRODUCT para perfis de produtos", () => {
    expect(getFixedCatalogItemType("PRODUCTS")).toBe("PRODUCT");
  });

  it("fixa SERVICE para perfis de serviços", () => {
    expect(getFixedCatalogItemType("SERVICES")).toBe("SERVICE");
  });

  it("não fixa o tipo para perfis que oferecem ambos", () => {
    expect(getFixedCatalogItemType("BOTH")).toBeNull();
  });
});
