-- AlterTable
ALTER TABLE "Proposal" ADD COLUMN     "depositAmount" DECIMAL(10,2),
ADD COLUMN     "depositPaidAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "ProviderProfile" ADD COLUMN     "pixHolderName" TEXT,
ADD COLUMN     "pixKey" TEXT,
ADD COLUMN     "pixKeyType" TEXT;
