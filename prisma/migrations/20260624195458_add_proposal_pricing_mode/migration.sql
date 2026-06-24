-- CreateEnum
CREATE TYPE "ProposalPricingMode" AS ENUM ('SIMPLE', 'ITEMIZED');

-- AlterTable
ALTER TABLE "Proposal" ADD COLUMN     "pricingMode" "ProposalPricingMode" NOT NULL DEFAULT 'SIMPLE';
