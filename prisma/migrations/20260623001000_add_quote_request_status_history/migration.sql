-- CreateEnum
CREATE TYPE "QuoteRequestStatusActor" AS ENUM ('CUSTOMER', 'PROVIDER', 'SYSTEM');

-- CreateTable
CREATE TABLE "QuoteRequestStatusHistory" (
    "id" TEXT NOT NULL,
    "quoteRequestId" TEXT NOT NULL,
    "fromStatus" "QuoteRequestStatus",
    "toStatus" "QuoteRequestStatus" NOT NULL,
    "actor" "QuoteRequestStatusActor" NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuoteRequestStatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "QuoteRequestStatusHistory_quoteRequestId_idx" ON "QuoteRequestStatusHistory"("quoteRequestId");

-- CreateIndex
CREATE INDEX "QuoteRequestStatusHistory_createdAt_idx" ON "QuoteRequestStatusHistory"("createdAt");

-- AddForeignKey
ALTER TABLE "QuoteRequestStatusHistory" ADD CONSTRAINT "QuoteRequestStatusHistory_quoteRequestId_fkey" FOREIGN KEY ("quoteRequestId") REFERENCES "QuoteRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
