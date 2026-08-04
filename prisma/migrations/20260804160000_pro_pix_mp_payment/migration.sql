-- AlterTable
ALTER TABLE "ProPixPayment" ADD COLUMN "mpPaymentId" TEXT,
ADD COLUMN "expiresAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "ProPixPayment_mpPaymentId_key" ON "ProPixPayment"("mpPaymentId");
