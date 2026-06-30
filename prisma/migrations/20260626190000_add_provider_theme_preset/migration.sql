CREATE TYPE "ProviderThemePreset" AS ENUM ('DEFAULT', 'CLEAN', 'BEAUTY', 'CREATIVE', 'PREMIUM');

ALTER TABLE "ProviderProfile" ADD COLUMN "themePreset" "ProviderThemePreset" NOT NULL DEFAULT 'DEFAULT';
