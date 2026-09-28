-- AlterTable
ALTER TABLE "AdvertRequest" DROP COLUMN "budgetCents",
ADD COLUMN     "budgetKobo" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "CreatorProfile" DROP COLUMN "stripeAccountId",
ADD COLUMN     "bankAccountName" TEXT,
ADD COLUMN     "bankAccountNumber" TEXT,
ADD COLUMN     "bankCode" TEXT,
ADD COLUMN     "paystackRecipientCode" TEXT;

-- AlterTable
ALTER TABLE "Offer" DROP COLUMN "priceCents",
ADD COLUMN     "priceKobo" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "Order" DROP COLUMN "platformFeeCents",
DROP COLUMN "priceCents",
DROP COLUMN "stripePaymentIntentId",
DROP COLUMN "stripeTransferId",
DROP COLUMN "totalCents",
ADD COLUMN     "paystackReference" TEXT,
ADD COLUMN     "paystackTransferCode" TEXT,
ADD COLUMN     "platformFeeKobo" INTEGER NOT NULL,
ADD COLUMN     "priceKobo" INTEGER NOT NULL,
ADD COLUMN     "totalKobo" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "Product" DROP COLUMN "mrrCents",
ADD COLUMN     "mrrKobo" INTEGER;

-- AlterTable
ALTER TABLE "RateCardItem" DROP COLUMN "priceCents",
ADD COLUMN     "priceKobo" INTEGER NOT NULL;
