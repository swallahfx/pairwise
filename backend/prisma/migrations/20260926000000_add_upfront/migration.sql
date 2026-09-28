-- CreateEnum
CREATE TYPE "ListerType" AS ENUM ('CREATOR', 'BRAND');

-- CreateEnum
CREATE TYPE "UpfrontPurchaseStatus" AS ENUM ('AGREED', 'FUNDED', 'APPROVED', 'AUTO_APPROVED', 'PAID', 'DISPUTED', 'REFUNDED');

-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'BRAND';

-- CreateTable
CREATE TABLE "BrandProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "website" TEXT,
    "industry" TEXT,
    "bankAccountNumber" TEXT,
    "bankCode" TEXT,
    "bankAccountName" TEXT,
    "paystackRecipientCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BrandProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UpfrontListing" (
    "id" TEXT NOT NULL,
    "listerType" "ListerType" NOT NULL,
    "creatorId" TEXT,
    "brandId" TEXT,
    "title" TEXT NOT NULL,
    "niche" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "audienceSummary" TEXT NOT NULL,
    "pricePerSlotKobo" INTEGER NOT NULL,
    "totalSlots" INTEGER NOT NULL,
    "slotsSold" INTEGER NOT NULL DEFAULT 0,
    "programDate" TIMESTAMP(3) NOT NULL,
    "gateStatus" "GateStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UpfrontListing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UpfrontPurchase" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "priceKobo" INTEGER NOT NULL,
    "platformFeeKobo" INTEGER NOT NULL,
    "totalKobo" INTEGER NOT NULL,
    "status" "UpfrontPurchaseStatus" NOT NULL DEFAULT 'AGREED',
    "paystackReference" TEXT,
    "paystackTransferCode" TEXT,
    "fundedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UpfrontPurchase_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BrandProfile_userId_key" ON "BrandProfile"("userId");

-- AddForeignKey
ALTER TABLE "BrandProfile" ADD CONSTRAINT "BrandProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UpfrontListing" ADD CONSTRAINT "UpfrontListing_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "CreatorProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UpfrontListing" ADD CONSTRAINT "UpfrontListing_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "BrandProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UpfrontPurchase" ADD CONSTRAINT "UpfrontPurchase_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "UpfrontListing"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UpfrontPurchase" ADD CONSTRAINT "UpfrontPurchase_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
