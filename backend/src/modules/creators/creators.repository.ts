import { prisma } from "../../config/db";
type GateStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface CreatorProfileUpdate {
  handle: string;
  platform: string;
  followerCount: number;
  engagementRate: number;
  nicheTags: string[];
  gateStatus: GateStatus;
}

// Pure data access — no business rules here. Anything that decides
// *whether* a query should run belongs in the service layer, not here.
export const creatorsRepository = {
  findByUserId(userId: string) {
    return prisma.creatorProfile.findUnique({
      where: { userId },
      include: { rateCardItems: true }
    });
  },

  findById(id: string) {
    return prisma.creatorProfile.findUnique({
      where: { id },
      include: { rateCardItems: true, user: { select: { name: true } } }
    });
  },

  // Admin's own creator profile is APPROVED so admin can exercise the
  // booking/rate-card flow directly (see auth.service.ts's
  // adminProfileBundle), but that's a testing/support account, not a real
  // marketplace listing — it stays reachable at its own URL (an admin
  // managing it via /creators/me, or anyone with a direct link) without
  // ever surfacing in the public directory a real developer browses.
  findApproved(niche?: string) {
    return prisma.creatorProfile.findMany({
      where: {
        gateStatus: "APPROVED",
        user: { role: { not: "ADMIN" } },
        ...(niche ? { nicheTags: { has: niche } } : {})
      },
      include: { rateCardItems: true, user: { select: { name: true } } }
    });
  },

  updateProfile(id: string, data: CreatorProfileUpdate) {
    return prisma.creatorProfile.update({ where: { id }, data });
  },

  findAll() {
    return prisma.creatorProfile.findMany({
      include: { rateCardItems: true, user: { select: { name: true, email: true } } },
      orderBy: { createdAt: "desc" }
    });
  },

  findPending() {
    return prisma.creatorProfile.findMany({
      where: { gateStatus: "PENDING" },
      include: { rateCardItems: true, user: { select: { name: true, email: true } } },
      orderBy: { createdAt: "asc" }
    });
  },

  updateGateStatus(id: string, gateStatus: GateStatus) {
    return prisma.creatorProfile.update({ where: { id }, data: { gateStatus } });
  },

  adminUpdate(id: string, data: Partial<CreatorProfileUpdate>) {
    return prisma.creatorProfile.update({ where: { id }, data });
  },

  // Everything a cascade delete needs to decide, in one shot: every offer
  // this creator holds (with its order, if any — the thing that can
  // actually be financial), and every Upfront listing they've put up (with
  // its purchases — same reasoning, one level down).
  findDependentsDetailed(id: string) {
    return Promise.all([
      prisma.offer.findMany({ where: { creatorId: id }, include: { order: true } }),
      prisma.upfrontListing.findMany({ where: { creatorId: id }, include: { purchases: true } }),
      prisma.rateCardItem.count({ where: { creatorId: id } })
    ]);
  },

  // Called only once the service has confirmed nothing financial is
  // attached (every order/purchase found is still AGREED, i.e. no money has
  // moved) — this wipes the whole graph in FK-safe order, then the profile
  // and the account itself.
  async cascadeDelete(id: string) {
    const creator = await prisma.creatorProfile.findUnique({ where: { id } });
    if (!creator) return null;
    const [offers, listings] = await Promise.all([
      prisma.offer.findMany({ where: { creatorId: id }, select: { id: true } }),
      prisma.upfrontListing.findMany({ where: { creatorId: id }, select: { id: true } })
    ]);
    const offerIds = offers.map((o) => o.id);
    const listingIds = listings.map((l) => l.id);

    return prisma.$transaction(async (tx) => {
      await tx.order.deleteMany({ where: { offerId: { in: offerIds } } });
      await tx.offer.deleteMany({ where: { creatorId: id } });
      await tx.rateCardItem.deleteMany({ where: { creatorId: id } });
      await tx.upfrontPurchase.deleteMany({ where: { listingId: { in: listingIds } } });
      await tx.question.deleteMany({ where: { listingId: { in: listingIds } } });
      await tx.upfrontListing.deleteMany({ where: { creatorId: id } });
      await tx.question.deleteMany({ where: { OR: [{ creatorId: id }, { askerId: creator.userId }] } });
      await tx.savedCreator.deleteMany({ where: { OR: [{ creatorId: id }, { userId: creator.userId }] } });
      await tx.notification.deleteMany({ where: { userId: creator.userId } });
      await tx.creatorProfile.delete({ where: { id } });
      return tx.user.delete({ where: { id: creator.userId } });
    });
  },

  async save(userId: string, creatorId: string) {
    const existing = await prisma.savedCreator.findUnique({ where: { userId_creatorId: { userId, creatorId } } });
    if (existing) return existing;
    return prisma.savedCreator.create({ data: { userId, creatorId } });
  },

  unsave(userId: string, creatorId: string) {
    return prisma.savedCreator.deleteMany({ where: { userId, creatorId } });
  },

  findSavedByUser(userId: string) {
    return prisma.savedCreator.findMany({
      where: { userId },
      include: {
        creator: { include: { rateCardItems: true, user: { select: { name: true } } } }
      },
      orderBy: { createdAt: "desc" }
    });
  }
};
