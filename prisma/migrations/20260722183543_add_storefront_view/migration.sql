-- CreateTable
CREATE TABLE "StorefrontView" (
    "providerId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "StorefrontView_pkey" PRIMARY KEY ("providerId","date")
);

-- AddForeignKey
ALTER TABLE "StorefrontView" ADD CONSTRAINT "StorefrontView_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "ProviderProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
