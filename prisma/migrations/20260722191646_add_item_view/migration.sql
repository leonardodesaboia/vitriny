-- CreateTable
CREATE TABLE "ItemView" (
    "serviceId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ItemView_pkey" PRIMARY KEY ("serviceId","date")
);

-- AddForeignKey
ALTER TABLE "ItemView" ADD CONSTRAINT "ItemView_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;
