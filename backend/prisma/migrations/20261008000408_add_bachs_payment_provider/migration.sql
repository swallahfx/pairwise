-- CreateEnum
CREATE TYPE "PaymentProvider" AS ENUM ('PAYSTACK', 'BACHS');

-- AlterTable
ALTER TABLE "BrandProfile" ADD COLUMN     "bachsAccountId" TEXT;

-- AlterTable
ALTER TABLE "CreatorProfile" ADD COLUMN     "bachsAccountId" TEXT;

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "paymentProvider" "PaymentProvider";

-- AlterTable
ALTER TABLE "UpfrontPurchase" ADD COLUMN     "paymentProvider" "PaymentProvider";
