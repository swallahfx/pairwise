import { prisma } from "../../config/db";

type ListerType = "CREATOR" | "BRAND";
type GateStatus = "PENDING" | "APPROVED" | "REJECTED";
type PurchaseStatus = "AGREED" | "FUNDED" | "APPROVED" | "AUTO_APPROVED" | "PAID" | "DISPUTED" | "REFUNDED";

export interface NewListingData {
  listerType: ListerType;
  creatorId?: string;
  brandId?: string;
  title: string;
  niche: string;
  description: string;
  audienceSummary: string;
  pricePerSlotKobo: number;
  totalSlots: number;
  programDate: Date;
}

export interface ListingUpdate {
  title?: string;
  niche?: string;
  description?: string;
  audienceSummary?: string;
  pricePerSlotKobo?: number;
  totalSlots?: number;
  programDate?: Date;
  gateStatus?: GateStatus;
}

export interface NewPurchaseData {
  listingId: string;
  buyerId: string;
  priceKobo: number;
  platformFeeKobo: number;
  totalKobo: number;
}

export interface PurchaseUpdate {
  status?: PurchaseStatus;
  paystackReference?: string;
  paystackTransferCode?: string;
  fundedAt?: Date;
  approvedAt?: Date;
  paidAt?: Date;
}

// Same shape everywhere a listing needs to show/verify who's selling it —
// the creator's display name or the brand's company name, plus whichever
// side's payout account actually matters when a purchase releases.
const withLister = {
  creator: { include: { user: { select: { name: true } } } },
  brand: true
} as const;

export const upfrontRepository = {
  create(data: NewListingData) {
    return prisma.upfrontListing.create({ data });
  },

  findById(id: string) {
    return prisma.upfrontListing.findUnique({ where: { id }, include: withLister });
  },

  // Same reasoning as creatorsRepository.findApproved — an admin's own
  // auto-provisioned creator/brand profile can list a test program to
  // exercise the flow, but it shouldn't surface in the public directory a
  // real buyer browses. A null relation (the lister's other side) reads as
  // "doesn't match" here, so this correctly only excludes the side that's
  // actually set on each row.
  findApproved(niche?: string) {
    return prisma.upfrontListing.findMany({
      where: {
        gateStatus: "APPROVED",
        ...(niche ? { niche } : {}),
        NOT: {
          OR: [{ creator: { user: { role: "ADMIN" } } }, { brand: { user: { role: "ADMIN" } } }]
        }
      },
      include: withLister,
      orderBy: { createdAt: "desc" }
    });
  },

  findByCreator(creatorId: string) {
    return prisma.upfrontListing.findMany({ where: { creatorId }, orderBy: { createdAt: "desc" } });
  },

  findByBrand(brandId: string) {
    return prisma.upfrontListing.findMany({ where: { brandId }, orderBy: { createdAt: "desc" } });
  },

  findPending() {
    return prisma.upfrontListing.findMany({
      where: { gateStatus: "PENDING" },
      include: withLister,
      orderBy: { createdAt: "asc" }
    });
  },

  findAll() {
    return prisma.upfrontListing.findMany({ include: withLister, orderBy: { createdAt: "desc" } });
  },

  updateGateStatus(id: string, gateStatus: GateStatus) {
    return prisma.upfrontListing.update({ where: { id }, data: { gateStatus } });
  },

  adminUpdate(id: string, data: ListingUpdate) {
    return prisma.upfrontListing.update({ where: { id }, data });
  },

  delete(id: string) {
    return prisma.upfrontListing.delete({ where: { id } });
  },

  incrementSlotsSold(id: string) {
    return prisma.upfrontListing.update({ where: { id }, data: { slotsSold: { increment: 1 } } });
  },

  createPurchase(data: NewPurchaseData) {
    return prisma.upfrontPurchase.create({ data });
  },

  findPurchaseById(id: string) {
    return prisma.upfrontPurchase.findUnique({
      where: { id },
      include: { listing: { include: withLister }, buyer: { select: { name: true, email: true } } }
    });
  },

  findPurchaseByReference(reference: string) {
    return prisma.upfrontPurchase.findFirst({
      where: { paystackReference: reference },
      include: { listing: { include: withLister }, buyer: { select: { name: true, email: true } } }
    });
  },

  updatePurchase(id: string, data: PurchaseUpdate) {
    return prisma.upfrontPurchase.update({ where: { id }, data });
  },

  findPurchasesMine(buyerId: string) {
    return prisma.upfrontPurchase.findMany({
      where: { buyerId },
      include: { listing: true, review: true },
      orderBy: { createdAt: "desc" }
    });
  },

  // The buyer-facing "findPurchasesMine" has a lister-facing counterpart
  // here: a creator/brand couldn't otherwise see who bought a slot on
  // their own listing, or its funding/approval status, since the listing's
  // own "mine" view only ever showed an aggregate slotsSold count.
  findPurchasesForLister(listerId: { creatorId: string } | { brandId: string }) {
    return prisma.upfrontPurchase.findMany({
      where: { listing: listerId },
      include: { listing: { select: { title: true } }, buyer: { select: { name: true, email: true } } },
      orderBy: { createdAt: "desc" }
    });
  },

  findAllPurchases() {
    return prisma.upfrontPurchase.findMany({
      include: { listing: { include: withLister }, buyer: { select: { name: true, email: true } } },
      orderBy: { createdAt: "desc" }
    });
  },

  findFundedPastDeadline(cutoff: Date) {
    return prisma.upfrontPurchase.findMany({
      where: { status: "FUNDED", listing: { programDate: { lte: cutoff } } }
    });
  },

  createReview(purchaseId: string, buyerId: string, listingId: string, rating: number, text: string) {
    return prisma.upfrontReview.create({ data: { purchaseId, buyerId, listingId, rating, text } });
  },

  findReviewByPurchase(purchaseId: string) {
    return prisma.upfrontReview.findUnique({ where: { purchaseId } });
  },

  findReviewsByListing(listingId: string) {
    return prisma.upfrontReview.findMany({
      where: { listingId },
      include: { buyer: { select: { name: true } } },
      orderBy: { createdAt: "desc" }
    });
  },

  async statsByListing(listingId: string) {
    const result = await prisma.upfrontReview.aggregate({
      where: { listingId },
      _avg: { rating: true },
      _count: true
    });
    return { avgRating: result._avg.rating, reviewCount: result._count };
  },

  async statsForListings(listingIds: string[]) {
    const rows = await prisma.upfrontReview.groupBy({
      by: ["listingId"],
      where: { listingId: { in: listingIds } },
      _avg: { rating: true },
      _count: true
    });
    return new Map(rows.map((r) => [r.listingId, { avgRating: r._avg.rating, reviewCount: r._count }]));
  }
};
