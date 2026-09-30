-- AlterTable
ALTER TABLE "User" ADD COLUMN     "lastViewedCreatorsAt" TIMESTAMP(3),
ADD COLUMN     "lastViewedRequestsAt" TIMESTAMP(3),
ADD COLUMN     "lastViewedUpfrontAt" TIMESTAMP(3);
