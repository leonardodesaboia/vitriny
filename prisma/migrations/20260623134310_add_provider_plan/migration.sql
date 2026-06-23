-- CreateEnum
CREATE TYPE "PlanTier" AS ENUM ('FREE', 'PRO');

-- AlterTable
ALTER TABLE "ProviderProfile" ADD COLUMN     "plan" "PlanTier" NOT NULL DEFAULT 'FREE';
