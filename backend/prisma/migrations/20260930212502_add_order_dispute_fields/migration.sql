-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "disputeReason" TEXT,
ADD COLUMN     "disputeRespondedAt" TIMESTAMP(3),
ADD COLUMN     "disputeResponse" TEXT,
ADD COLUMN     "disputedAt" TIMESTAMP(3),
ADD COLUMN     "disputedByUserId" TEXT;
