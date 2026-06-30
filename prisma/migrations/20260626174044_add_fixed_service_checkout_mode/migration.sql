-- CreateEnum
CREATE TYPE "FixedServiceCheckoutMode" AS ENUM ('REQUEST_ONLY', 'ALLOW_PIX_RESERVATION');

-- AlterTable
ALTER TABLE "QuoteRequest" ADD COLUMN     "fixedServiceAmount" DECIMAL(10,2),
ADD COLUMN     "pixReservationPaidAt" TIMESTAMP(3),
ADD COLUMN     "pixReservationRequestedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Service" ADD COLUMN     "fixedServiceCheckoutMode" "FixedServiceCheckoutMode" NOT NULL DEFAULT 'REQUEST_ONLY';
