CREATE TYPE "ProviderBrandColor" AS ENUM ('FOREST', 'OCEAN', 'ROSE', 'GOLD');

CREATE TYPE "ProviderBrandFont" AS ENUM ('CLASSIC', 'MODERN', 'ELEGANT', 'GEOMETRIC');

ALTER TABLE "ProviderProfile"
ADD COLUMN "brandColor" "ProviderBrandColor" NOT NULL DEFAULT 'FOREST',
ADD COLUMN "brandFont" "ProviderBrandFont" NOT NULL DEFAULT 'CLASSIC';

UPDATE "ProviderProfile"
SET
  "brandColor" = CASE "themePreset"
    WHEN 'CLEAN' THEN 'OCEAN'::"ProviderBrandColor"
    WHEN 'BEAUTY' THEN 'ROSE'::"ProviderBrandColor"
    WHEN 'CREATIVE' THEN 'OCEAN'::"ProviderBrandColor"
    WHEN 'PREMIUM' THEN 'GOLD'::"ProviderBrandColor"
    ELSE 'FOREST'::"ProviderBrandColor"
  END,
  "brandFont" = CASE "themePreset"
    WHEN 'CLEAN' THEN 'MODERN'::"ProviderBrandFont"
    WHEN 'CREATIVE' THEN 'MODERN'::"ProviderBrandFont"
    WHEN 'BOLD' THEN 'MODERN'::"ProviderBrandFont"
    ELSE 'CLASSIC'::"ProviderBrandFont"
  END;
