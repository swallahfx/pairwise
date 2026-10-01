import { prisma } from "../../config/db";

export interface BrandProfileUpdate {
  companyName: string;
  website?: string;
  industry?: string;
}

export const brandsRepository = {
  findAll() {
    return prisma.brandProfile.findMany({
      include: { user: { select: { name: true, email: true } } },
      orderBy: { createdAt: "desc" }
    });
  },

  findByUserId(userId: string) {
    return prisma.brandProfile.findUnique({
      where: { userId },
      include: { user: { select: { name: true, email: true } } }
    });
  },

  updateProfile(id: string, data: BrandProfileUpdate) {
    return prisma.brandProfile.update({ where: { id }, data });
  },

  findById(id: string) {
    return prisma.brandProfile.findUnique({ where: { id }, include: { user: { select: { name: true, email: true } } } });
  },

  adminUpdate(id: string, data: Partial<BrandProfileUpdate>) {
    return prisma.brandProfile.update({ where: { id }, data });
  },

  findListingsDetailed(id: string) {
    return prisma.upfrontListing.findMany({ where: { brandId: id }, include: { purchases: true } });
  },

  async cascadeDelete(id: string) {
    const brand = await prisma.brandProfile.findUnique({ where: { id } });
    if (!brand) return null;
    const listings = await prisma.upfrontListing.findMany({ where: { brandId: id }, select: { id: true } });
    const listingIds = listings.map((l) => l.id);

    return prisma.$transaction(async (tx) => {
      await tx.upfrontPurchase.deleteMany({ where: { listingId: { in: listingIds } } });
      await tx.question.deleteMany({ where: { listingId: { in: listingIds } } });
      await tx.upfrontListing.deleteMany({ where: { brandId: id } });
      await tx.notification.deleteMany({ where: { userId: brand.userId } });
      await tx.question.deleteMany({ where: { askerId: brand.userId } });
      await tx.savedCreator.deleteMany({ where: { userId: brand.userId } });
      await tx.brandProfile.delete({ where: { id } });
      return tx.user.delete({ where: { id: brand.userId } });
    });
  }
};
