-- CreateTable
CREATE TABLE "ProPixPayment" (
    "id" TEXT NOT NULL,
    "providerProfileId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "clientPaidAt" TIMESTAMP(3),
    "confirmedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProPixPayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProPixPayment_providerProfileId_idx" ON "ProPixPayment"("providerProfileId");

-- AddForeignKey
ALTER TABLE "ProPixPayment" ADD CONSTRAINT "ProPixPayment_providerProfileId_fkey" FOREIGN KEY ("providerProfileId") REFERENCES "ProviderProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
