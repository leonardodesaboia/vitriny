-- CreateTable
CREATE TABLE "QuoteRequestInternalNote" (
    "id" TEXT NOT NULL,
    "quoteRequestId" TEXT NOT NULL,
    "authorUserId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuoteRequestInternalNote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "QuoteRequestInternalNote_quoteRequestId_idx" ON "QuoteRequestInternalNote"("quoteRequestId");

-- CreateIndex
CREATE INDEX "QuoteRequestInternalNote_authorUserId_idx" ON "QuoteRequestInternalNote"("authorUserId");

-- AddForeignKey
ALTER TABLE "QuoteRequestInternalNote" ADD CONSTRAINT "QuoteRequestInternalNote_quoteRequestId_fkey" FOREIGN KEY ("quoteRequestId") REFERENCES "QuoteRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteRequestInternalNote" ADD CONSTRAINT "QuoteRequestInternalNote_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
