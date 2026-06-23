-- AlterTable
ALTER TABLE "QuoteRequest" ADD COLUMN "serviceId" TEXT;

-- CreateIndex
CREATE INDEX "QuoteRequest_serviceId_idx" ON "QuoteRequest"("serviceId");

-- AddForeignKey
ALTER TABLE "QuoteRequest" ADD CONSTRAINT "QuoteRequest_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE SET NULL ON UPDATE CASCADE;
