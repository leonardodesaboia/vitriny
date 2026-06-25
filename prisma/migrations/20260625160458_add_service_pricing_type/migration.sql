-- CreateEnum
CREATE TYPE "ServicePricingType" AS ENUM ('FIXED', 'CUSTOM');

-- AlterTable
ALTER TABLE "Service" ADD COLUMN     "pricingType" "ServicePricingType" NOT NULL DEFAULT 'CUSTOM';
