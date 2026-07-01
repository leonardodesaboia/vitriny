-- CreateEnum
CREATE TYPE "CatalogItemType" AS ENUM ('SERVICE', 'PRODUCT');

-- AlterTable
ALTER TABLE "Service" ADD COLUMN "itemType" "CatalogItemType" NOT NULL DEFAULT 'SERVICE';
