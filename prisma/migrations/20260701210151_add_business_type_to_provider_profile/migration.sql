-- CreateEnum
CREATE TYPE "BusinessType" AS ENUM ('PRODUCTS', 'SERVICES', 'BOTH');

-- AlterTable
ALTER TABLE "ProviderProfile" ADD COLUMN     "businessType" "BusinessType" NOT NULL DEFAULT 'SERVICES';
