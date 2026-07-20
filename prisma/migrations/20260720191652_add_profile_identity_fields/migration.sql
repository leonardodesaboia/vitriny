-- AlterTable
ALTER TABLE "ProviderProfile" ADD COLUMN     "address" TEXT,
ADD COLUMN     "businessHours" JSONB,
ADD COLUMN     "facebook" TEXT,
ADD COLUMN     "instagram" TEXT,
ADD COLUMN     "tiktok" TEXT;
