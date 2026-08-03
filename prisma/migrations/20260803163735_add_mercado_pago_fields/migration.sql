-- AlterTable
ALTER TABLE "ProviderProfile" ADD COLUMN     "mpPayerId" TEXT,
ADD COLUMN     "mpPreapprovalId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "ProviderProfile_mpPreapprovalId_key" ON "ProviderProfile"("mpPreapprovalId");
