import { ConflictError, ForbiddenError, NotFoundError } from "../../common/errors";
import { prisma } from "../../config/db";
import { env } from "../../config/env";
import { notificationsService } from "../notifications/notifications.service";
import { paymentsService } from "../payments/payments.service";
import { upfrontRepository } from "./upfront.repository";
import { AdminUpdateListingInput, CreateListingInput, CreateUpfrontReviewInput } from "./upfront.schema";

const AUTO_APPROVE_DAYS = 7;

type ListingWithLister = Awaited<ReturnType<typeof upfrontRepository.findById>>;
type PurchaseWithParties = Awaited<ReturnType<typeof upfrontRepository.findPurchaseById>>;

function assertIsBuyer(purchase: NonNullable<PurchaseWithParties>, userId: string) {
  if (purchase.buyerId !== userId) {
    throw new ForbiddenError("Only the buyer on this purchase can do that");
  }
}

// A listing's payout destination is whichever side actually listed it —
// there's no "the" lister profile the way there's one creator/developer
// per Order; it's exactly one of these two, decided by listerType.
function listerRecipientCode(listing: NonNullable<ListingWithLister>): string | null {
  return listing.listerType === "CREATOR" ? (listing.creator?.paystackRecipientCode ?? null) : (listing.brand?.paystackRecipientCode ?? null);
}

function listerUserId(listing: NonNullable<ListingWithLister>): string | null {
  return listing.listerType === "CREATOR" ? (listing.creator?.userId ?? null) : (listing.brand?.userId ?? null);
}

// This module is deliberately separate from offers/orders rather than
// reusing them — a pre-sold future program isn't a bespoke commissioned
// deliverable, it has no submit/revision step, and its lister can be a
// creator or a brand rather than always exactly one CreatorProfile.
// payments.service.ts is reused as-is since it already deals in raw
// amounts and Paystack references, not Order-shaped objects.
export const upfrontService = {
  async createListing(userId: string, listerType: "CREATOR" | "BRAND", input: CreateListingInput) {
    if (listerType === "CREATOR") {
      const creator = await prisma.creatorProfile.findUnique({ where: { userId } });
      if (!creator) throw new NotFoundError("Creator profile");
      if (creator.gateStatus !== "APPROVED") {
        throw new ForbiddenError("Your profile needs to be approved before listing an Upfront program");
      }
      return upfrontRepository.create({ ...input, listerType, creatorId: creator.id });
    }

    const brand = await prisma.brandProfile.findUnique({ where: { userId } });
    if (!brand) throw new NotFoundError("Brand profile");
    return upfrontRepository.create({ ...input, listerType, brandId: brand.id });
  },

  async listApproved(niche?: string) {
    const listings = await upfrontRepository.findApproved(niche);
    const statsByListing = await upfrontRepository.statsForListings(listings.map((l: { id: string }) => l.id));
    return listings.map((l: (typeof listings)[number]) => ({
      ...l,
      avgRating: statsByListing.get(l.id)?.avgRating ?? null,
      reviewCount: statsByListing.get(l.id)?.reviewCount ?? 0
    }));
  },

  async getPublicListing(id: string) {
    const listing = await upfrontRepository.findById(id);
    if (!listing || listing.gateStatus !== "APPROVED") throw new NotFoundError("Listing");
    const stats = await upfrontRepository.statsByListing(id);
    const reviews = await upfrontRepository.findReviewsByListing(id);
    return { ...listing, ...stats, reviews };
  },

  async listMine(userId: string, listerType: "CREATOR" | "BRAND") {
    if (listerType === "CREATOR") {
      const creator = await prisma.creatorProfile.findUnique({ where: { userId } });
      if (!creator) throw new NotFoundError("Creator profile");
      return upfrontRepository.findByCreator(creator.id);
    }
    const brand = await prisma.brandProfile.findUnique({ where: { userId } });
    if (!brand) throw new NotFoundError("Brand profile");
    return upfrontRepository.findByBrand(brand.id);
  },

  async listSalesForLister(userId: string, listerType: "CREATOR" | "BRAND") {
    if (listerType === "CREATOR") {
      const creator = await prisma.creatorProfile.findUnique({ where: { userId } });
      if (!creator) throw new NotFoundError("Creator profile");
      return upfrontRepository.findPurchasesForLister({ creatorId: creator.id });
    }
    const brand = await prisma.brandProfile.findUnique({ where: { userId } });
    if (!brand) throw new NotFoundError("Brand profile");
    return upfrontRepository.findPurchasesForLister({ brandId: brand.id });
  },

  // Every listing starts PENDING regardless of lister — there's no
  // automatic eligibility check the way creators.service has one for rate
  // cards, so this queue is simply everything awaiting a first look.
  listPendingForReview() {
    return upfrontRepository.findPending();
  },

  async reviewListing(id: string, decision: "APPROVED" | "REJECTED") {
    const listing = await upfrontRepository.findById(id);
    if (!listing) throw new NotFoundError("Listing");
    if (listing.gateStatus !== "PENDING") {
      throw new ConflictError(`Cannot review a listing in status ${listing.gateStatus}`);
    }
    const updated = await upfrontRepository.updateGateStatus(id, decision);
    const listerId = listerUserId(listing);
    if (listerId) {
      notificationsService.notify(
        listerId,
        "LISTING_REVIEW_STATUS",
        decision === "APPROVED"
          ? `Your listing "${listing.title}" was approved and is now public.`
          : `Your listing "${listing.title}" was rejected.`,
        `/upfront/${listing.id}`
      );
    }
    return updated;
  },

  adminListAllListings() {
    return upfrontRepository.findAll();
  },

  adminListAllPurchases() {
    return upfrontRepository.findAllPurchases();
  },

  async adminUpdateListing(id: string, input: AdminUpdateListingInput) {
    const listing = await upfrontRepository.findById(id);
    if (!listing) throw new NotFoundError("Listing");
    return upfrontRepository.adminUpdate(id, input);
  },

  async adminDeleteListing(id: string) {
    const listing = await upfrontRepository.findById(id);
    if (!listing) throw new NotFoundError("Listing");
    if (listing.slotsSold > 0) {
      throw new ConflictError("This listing has sold slots and can't be deleted");
    }
    return upfrontRepository.delete(id);
  },

  async buySlot(listingId: string, buyerUserId: string) {
    const listing = await upfrontRepository.findById(listingId);
    if (!listing || listing.gateStatus !== "APPROVED") throw new NotFoundError("Listing");
    if (listing.slotsSold >= listing.totalSlots) {
      throw new ConflictError("No slots remaining on this listing");
    }

    const { platformFeeKobo, totalKobo } = paymentsService.computeFee(listing.pricePerSlotKobo);
    await upfrontRepository.incrementSlotsSold(listingId);
    return upfrontRepository.createPurchase({
      listingId,
      buyerId: buyerUserId,
      priceKobo: listing.pricePerSlotKobo,
      platformFeeKobo,
      totalKobo
    });
  },

  async getPurchase(id: string) {
    const purchase = await upfrontRepository.findPurchaseById(id);
    if (!purchase) throw new NotFoundError("Purchase");
    return purchase;
  },

  listMyPurchases(buyerId: string) {
    return upfrontRepository.findPurchasesMine(buyerId);
  },

  async fundPurchase(purchaseId: string, userId: string) {
    const purchase = await upfrontRepository.findPurchaseById(purchaseId);
    if (!purchase) throw new NotFoundError("Purchase");
    assertIsBuyer(purchase, userId);
    if (purchase.status !== "AGREED") {
      throw new ConflictError(`Cannot fund a purchase in status ${purchase.status}`);
    }

    const reference = `upfront_${purchase.id}_${Date.now()}`;
    const callbackUrl = `${env.clientOrigin}/upfront/checkout/${purchase.id}/callback`;
    const { authorization_url } = await paymentsService.initializeTransaction(
      purchase.totalKobo,
      purchase.buyer.email,
      reference,
      callbackUrl,
      { upfrontPurchaseId: purchase.id }
    );

    await upfrontRepository.updatePurchase(purchase.id, { paystackReference: reference });
    return { authorizationUrl: authorization_url };
  },

  // Mirrors orders.service's confirmFunding exactly — called from both the
  // webhook and the checkout-callback page, safe to call more than once.
  async confirmFunding(reference: string) {
    const purchase = await upfrontRepository.findPurchaseByReference(reference);
    if (!purchase) throw new NotFoundError("Purchase");
    if (purchase.status !== "AGREED") return purchase;

    const verified = await paymentsService.verifyTransaction(reference);
    if (verified.status !== "success") {
      throw new ConflictError(`Payment was not successful (status: ${verified.status})`);
    }
    if (verified.amount !== purchase.totalKobo) {
      throw new ConflictError("Paid amount does not match the purchase total");
    }

    const updated = await upfrontRepository.updatePurchase(purchase.id, { status: "FUNDED", fundedAt: new Date() });
    const listerId = listerUserId(purchase.listing);
    if (listerId) {
      notificationsService.notify(
        listerId,
        "UPFRONT_UPDATE",
        `A slot on "${purchase.listing.title}" was funded.`,
        `/upfront/${purchase.listing.id}`
      );
    }
    return updated;
  },

  async approvePurchase(purchaseId: string, userId: string) {
    const purchase = await upfrontRepository.findPurchaseById(purchaseId);
    if (!purchase) throw new NotFoundError("Purchase");
    assertIsBuyer(purchase, userId);
    return upfrontService.release(purchaseId, "APPROVED");
  },

  // Sweeps purchases whose program already ran a week ago and are still
  // sitting FUNDED — a buyer who never confirms doesn't get to hold a
  // lister's payout hostage indefinitely, same reasoning as the Order
  // auto-approve sweep, just keyed off programDate instead of submittedAt.
  async autoApproveOverduePurchases() {
    const cutoff = new Date(Date.now() - AUTO_APPROVE_DAYS * 24 * 60 * 60 * 1000);
    const overdue = await upfrontRepository.findFundedPastDeadline(cutoff);
    for (const purchase of overdue) {
      await upfrontService.release(purchase.id, "AUTO_APPROVED");
    }
    return overdue.length;
  },

  async release(purchaseId: string, _resultStatus: "APPROVED" | "AUTO_APPROVED") {
    const purchase = await upfrontRepository.findPurchaseById(purchaseId);
    if (!purchase || purchase.status !== "FUNDED") {
      throw new ConflictError("Purchase must be funded before it can be approved");
    }

    const recipientCode = listerRecipientCode(purchase.listing);
    if (!recipientCode) {
      throw new ConflictError("The lister has not set up a payout account yet");
    }

    let transfer: Awaited<ReturnType<typeof paymentsService.transferToCreator>>;
    try {
      transfer = await paymentsService.transferToCreator(
        purchase.priceKobo,
        recipientCode,
        `Payout for upfront purchase ${purchase.id}`
      );
    } catch (err) {
      // Same reasoning as orders.service's payoutToCreator — surface
      // Paystack's actual reason (e.g. an account-tier restriction) instead
      // of a generic 500 that tells the caller nothing.
      throw new ConflictError(`Payout failed: ${err instanceof Error ? err.message : "unknown Paystack error"}`);
    }

    const updated = await upfrontRepository.updatePurchase(purchaseId, {
      status: "PAID",
      approvedAt: new Date(),
      paidAt: new Date(),
      paystackTransferCode: transfer.transfer_code
    });
    const listerId = listerUserId(purchase.listing);
    if (listerId) {
      notificationsService.notify(
        listerId,
        "UPFRONT_UPDATE",
        `Payment released for a slot on "${purchase.listing.title}".`,
        `/upfront/${purchase.listing.id}`
      );
    }
    return updated;
  },

  // Admin-only overrides for a purchase gone wrong — a manual status change,
  // not an automatic Paystack reversal (there's no code path here that
  // actually calls Paystack's refund API or claws back a transfer already
  // made). DISPUTED just flags it for human follow-up; REFUNDED records
  // that the buyer was made whole outside the platform. Blocking REFUNDED
  // once a purchase is already PAID is deliberate — the lister has been
  // paid out by then, so "refunded" would misrepresent what actually
  // happened to the money without a real reversal behind it.
  async adminDispute(purchaseId: string) {
    const purchase = await upfrontRepository.findPurchaseById(purchaseId);
    if (!purchase) throw new NotFoundError("Purchase");
    if (purchase.status === "PAID" || purchase.status === "REFUNDED") {
      throw new ConflictError(`Cannot dispute a purchase in status ${purchase.status}`);
    }
    const updated = await upfrontRepository.updatePurchase(purchaseId, { status: "DISPUTED" });
    const message = `A purchase on "${purchase.listing.title}" was marked disputed by an admin.`;
    notificationsService.notify(purchase.buyerId, "UPFRONT_UPDATE", message, `/upfront/purchases`);
    const listerId = listerUserId(purchase.listing);
    if (listerId) notificationsService.notify(listerId, "UPFRONT_UPDATE", message, `/upfront/${purchase.listing.id}`);
    return updated;
  },

  // Same reasoning as reviewsService for orders: only the buyer who paid,
  // only once the program's actually run and paid out, and only once —
  // this is a trust signal for the next buyer, not an open comment box.
  async leaveReview(purchaseId: string, buyerUserId: string, input: CreateUpfrontReviewInput) {
    const purchase = await upfrontRepository.findPurchaseById(purchaseId);
    if (!purchase) throw new NotFoundError("Purchase");
    assertIsBuyer(purchase, buyerUserId);
    if (purchase.status !== "PAID") throw new ConflictError("Can only review a completed purchase");

    const existing = await upfrontRepository.findReviewByPurchase(purchaseId);
    if (existing) throw new ConflictError("This purchase already has a review");

    return upfrontRepository.createReview(purchaseId, buyerUserId, purchase.listingId, input.rating, input.text);
  },

  async adminRefund(purchaseId: string) {
    const purchase = await upfrontRepository.findPurchaseById(purchaseId);
    if (!purchase) throw new NotFoundError("Purchase");
    if (purchase.status !== "DISPUTED" && purchase.status !== "FUNDED") {
      throw new ConflictError(
        `Cannot refund a purchase in status ${purchase.status} — only a funded or disputed purchase can be marked refunded`
      );
    }
    const updated = await upfrontRepository.updatePurchase(purchaseId, { status: "REFUNDED" });
    const message = `A purchase on "${purchase.listing.title}" was marked refunded by an admin.`;
    notificationsService.notify(purchase.buyerId, "UPFRONT_UPDATE", message, `/upfront/purchases`);
    const listerId = listerUserId(purchase.listing);
    if (listerId) notificationsService.notify(listerId, "UPFRONT_UPDATE", message, `/upfront/${purchase.listing.id}`);
    return updated;
  }
};
