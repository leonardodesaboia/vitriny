import type { BusinessType, CatalogItemType } from "@prisma/client";

type CatalogItemTypePolicy = {
  defaultItemType: CatalogItemType;
  canChooseItemType: boolean;
};

export function getFixedCatalogItemType(
  businessType: BusinessType,
): CatalogItemType | null {
  if (businessType === "PRODUCTS") return "PRODUCT";
  if (businessType === "SERVICES") return "SERVICE";
  return null;
}

export function getCatalogItemTypePolicy(
  businessType: BusinessType,
): CatalogItemTypePolicy {
  const fixedItemType = getFixedCatalogItemType(businessType);

  return {
    defaultItemType: fixedItemType ?? "SERVICE",
    canChooseItemType: fixedItemType === null,
  };
}
