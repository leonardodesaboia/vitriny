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

export const CATALOG_ITEM_TYPE_LABEL: Record<CatalogItemType, string> = {
  SERVICE: "Serviço",
  PRODUCT: "Produto",
};

/**
 * Tailwind classes for the item-type tag, so Produto and Serviço are visually
 * distinct (blue for Serviço, amber/orange for Produto) everywhere they appear.
 */
export const CATALOG_ITEM_TYPE_BADGE: Record<CatalogItemType, string> = {
  SERVICE: "border border-blue-100 bg-blue-50 text-blue-700",
  PRODUCT: "border border-orange-100 bg-orange-50 text-orange-700",
};
