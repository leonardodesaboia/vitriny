-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'TRIALING', 'PAST_DUE', 'CANCELED', 'INCOMPLETE', 'INCOMPLETE_EXPIRED', 'UNPAID', 'PAUSED');

-- AlterTable
ALTER TABLE "ProviderProfile" ADD COLUMN     "stripeCustomerId" TEXT,
ADD COLUMN     "stripeSubscriptionId" TEXT,
ADD COLUMN     "stripePriceId" TEXT,
ADD COLUMN     "subscriptionStatus" "SubscriptionStatus",
ADD COLUMN     "currentPeriodEnd" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "ProviderProfile_stripeCustomerId_key" ON "ProviderProfile"("stripeCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "ProviderProfile_stripeSubscriptionId_key" ON "ProviderProfile"("stripeSubscriptionId");
