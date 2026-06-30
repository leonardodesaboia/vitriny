ALTER TABLE "Service" ADD COLUMN "requiresSchedulingDetails" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "QuoteRequest" ADD COLUMN "desiredDate" TEXT;
ALTER TABLE "QuoteRequest" ADD COLUMN "desiredTime" TEXT;
ALTER TABLE "QuoteRequest" ADD COLUMN "location" TEXT;
