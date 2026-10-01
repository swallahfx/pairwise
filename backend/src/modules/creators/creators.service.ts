import { ConflictError, NotFoundError } from "../../common/errors";
import { BlockedItem, blockedDeleteMessage, describeBlockedOrder, describeBlockedPurchase, orderIsFinancial, purchaseIsFinancial } from "../../common/financialGuard";
import { AuthPayload } from "../../middleware/auth";
import { notificationsService } from "../notifications/notifications.service";
import { qaRepository } from "../qa/qa.repository";
import { reviewsRepository } from "../reviews/reviews.repository";
import { creatorsRepository } from "./creators.repository";
import { AdminUpdateCreatorInput, UpdateCreatorProfileInput } from "./creators.schema";

// Rates are visible only to a logged-in developer (or admin) — not other
// creators, not brands, and not logged-out visitors — with one exception:
// a creator viewing their own profile through this public route is still
// themself, not "another creator", so that case stays visible.
function ratesHiddenFrom(viewer: AuthPayload | undefined, profileUserId: string): boolean {
  if (viewer?.userId === profileUserId) return false;
  return viewer?.role !== "DEVELOPER" && viewer?.role !== "ADMIN";
}

// Below this many questions ever asked, a reply rate/response time is more
// noise than signal (one lucky or unlucky data point looks like a trend) —
// so the badge just doesn't render rather than showing something misleading.
const MIN_QUESTIONS_FOR_BADGE = 3;

async function replyStats(creatorId: string): Promise<{ replyRate: number | null; avgReplyHours: number | null }> {
  const questions = await qaRepository.findAllForCreator(creatorId);
  if (questions.length < MIN_QUESTIONS_FOR_BADGE) return { replyRate: null, avgReplyHours: null };

  const answered = questions.filter((q) => q.answeredAt);
  const replyRate = answered.length / questions.length;
  const avgReplyHours = answered.length
    ? answered.reduce((sum, q) => sum + (q.answeredAt!.getTime() - q.createdAt.getTime()), 0) /
      answered.length /
      (1000 * 60 * 60)
    : null;
  return { replyRate, avgReplyHours };
}

// The eligibility gate lives here, in one place, so "what does it take to
// list on Pairwize" is a business rule you can find and change in one spot —
// not scattered across a controller or, worse, enforced only in the UI.
// Clearing it is necessary but not sufficient: it only unlocks admin
// review (see listPendingForReview/reviewCreator), not an automatic
// APPROVED — a human still has to sign off before a creator goes live.
const MIN_FOLLOWERS = 1000;
const MIN_ENGAGEMENT_RATE = 0.02;

function passesEligibilityGate(followerCount: number, engagementRate: number): boolean {
  return followerCount >= MIN_FOLLOWERS && engagementRate >= MIN_ENGAGEMENT_RATE;
}

export const creatorsService = {
  adminListAll() {
    return creatorsRepository.findAll();
  },

  async getMyProfile(userId: string) {
    const profile = await creatorsRepository.findByUserId(userId);
    if (!profile) throw new NotFoundError("Creator profile");
    return profile;
  },

  async updateProfile(userId: string, input: UpdateCreatorProfileInput) {
    const existing = await creatorsRepository.findByUserId(userId);
    if (!existing) throw new NotFoundError("Creator profile");

    // Failing the bar is still automatic — there's nothing for an admin to
    // review. Clearing it puts (or keeps) an already-reviewed creator
    // through admin approval; it never downgrades an already-APPROVED
    // creator back to PENDING just for editing their own profile.
    const meetsThreshold = passesEligibilityGate(input.followerCount, input.engagementRate);
    const gateStatus = !meetsThreshold ? "REJECTED" : existing.gateStatus === "APPROVED" ? "APPROVED" : "PENDING";

    return creatorsRepository.updateProfile(existing.id, { ...input, gateStatus });
  },

  // The admin review queue: only creators who've actually cleared the
  // eligibility bar and are awaiting a decision — not every PENDING row,
  // which also includes brand-new signups who haven't filled in a profile
  // yet (followerCount 0 by default, nothing yet for an admin to judge).
  async listPendingForReview() {
    const pending = await creatorsRepository.findPending();
    return pending.filter((c) => passesEligibilityGate(c.followerCount, c.engagementRate));
  },

  async reviewCreator(id: string, decision: "APPROVED" | "REJECTED") {
    const creator = await creatorsRepository.findById(id);
    if (!creator) throw new NotFoundError("Creator profile");
    if (creator.gateStatus !== "PENDING") {
      throw new ConflictError(`Cannot review a creator in status ${creator.gateStatus}`);
    }
    const updated = await creatorsRepository.updateGateStatus(id, decision);
    notificationsService.notify(
      creator.userId,
      "CREATOR_REVIEW_STATUS",
      decision === "APPROVED"
        ? "You're approved! Your rate card is now visible in the directory."
        : "Your creator application was rejected.",
      "/creators/me"
    );
    return updated;
  },

  async getPublicProfile(id: string, viewer?: AuthPayload) {
    const profile = await creatorsRepository.findById(id);
    if (!profile || profile.gateStatus !== "APPROVED") {
      throw new NotFoundError("Creator");
    }
    const [stats, reply] = await Promise.all([reviewsRepository.statsByCreator(id), replyStats(id)]);
    const ratesHidden = ratesHiddenFrom(viewer, profile.userId);
    return {
      ...profile,
      ...stats,
      ...reply,
      rateCardItems: ratesHidden ? [] : profile.rateCardItems,
      ratesHidden
    };
  },

  async listDirectory(niche?: string, sort?: "price_asc" | "price_desc", viewer?: AuthPayload) {
    const creators = await creatorsRepository.findApproved(niche);
    const statsByCreator = await reviewsRepository.statsForCreators(creators.map((c: { id: string }) => c.id));

    // Sorting by "price" for a creator with multiple rate card items sorts
    // by their cheapest listed deliverable — the number a developer would
    // actually see first when comparing cards in the directory.
    const withMinPrice = creators.map((c: (typeof creators)[number]) => ({
      ...c,
      minPriceKobo: c.rateCardItems.length
        ? Math.min(...c.rateCardItems.map((r: (typeof c.rateCardItems)[number]) => r.priceKobo))
        : Number.MAX_SAFE_INTEGER,
      avgRating: statsByCreator.get(c.id)?.avgRating ?? null,
      reviewCount: statsByCreator.get(c.id)?.reviewCount ?? 0
    }));

    if (sort === "price_asc") {
      withMinPrice.sort((a: { minPriceKobo: number }, b: { minPriceKobo: number }) => a.minPriceKobo - b.minPriceKobo);
    }
    if (sort === "price_desc") {
      withMinPrice.sort((a: { minPriceKobo: number }, b: { minPriceKobo: number }) => b.minPriceKobo - a.minPriceKobo);
    }

    // Sort order above still reflects real pricing (so "top rated" browsing
    // isn't distorted), but the actual numbers — including the internal
    // minPriceKobo sort key — never reach the response for a creator
    // looking at another creator's card.
    return withMinPrice.map((c) => {
      const ratesHidden = ratesHiddenFrom(viewer, c.userId);
      if (!ratesHidden) return { ...c, ratesHidden };
      const { minPriceKobo: _minPriceKobo, ...rest } = c;
      return { ...rest, rateCardItems: [], ratesHidden };
    });
  },

  async adminUpdate(id: string, input: AdminUpdateCreatorInput) {
    const creator = await creatorsRepository.findById(id);
    if (!creator) throw new NotFoundError("Creator profile");
    return creatorsRepository.adminUpdate(id, input);
  },

  // What a cascade delete would actually do, worked out ahead of time so the
  // admin sees it before committing to anything: everything safe to wipe
  // (rate cards, non-financial offers/listings...), and — separately —
  // anything with real money attached, which blocks the whole delete rather
  // than being silently skipped.
  async deletePreview(id: string) {
    const creator = await creatorsRepository.findById(id);
    if (!creator) throw new NotFoundError("Creator profile");
    const [offers, listings, rateCardItemCount] = await creatorsRepository.findDependentsDetailed(id);

    const blocked: BlockedItem[] = [];
    const cascade: string[] = [];

    const financialOffers = offers.filter((o) => o.order && orderIsFinancial(o.order.status));
    financialOffers.forEach((o) => blocked.push(describeBlockedOrder(o.order!)));
    const safeOffers = offers.length - financialOffers.length;
    if (safeOffers > 0) cascade.push(`${safeOffers} offer(s) with no money moved yet`);
    if (rateCardItemCount > 0) cascade.push(`${rateCardItemCount} rate card item(s)`);

    let safeListingCount = 0;
    for (const listing of listings) {
      const financialPurchases = listing.purchases.filter((p) => purchaseIsFinancial(p.status));
      if (financialPurchases.length > 0) {
        financialPurchases.forEach((p) => blocked.push(describeBlockedPurchase(p, listing.title)));
      } else {
        safeListingCount += 1;
      }
    }
    if (safeListingCount > 0) cascade.push(`${safeListingCount} Upfront listing(s)`);

    return { cascade, blocked, label: `creator ${creator.handle} (${creator.user.name})` };
  },

  async adminDelete(id: string) {
    const creator = await creatorsRepository.findById(id);
    if (!creator) throw new NotFoundError("Creator profile");
    const { blocked } = await creatorsService.deletePreview(id);
    if (blocked.length > 0) throw new ConflictError(blockedDeleteMessage(blocked));
    return creatorsRepository.cascadeDelete(id);
  },

  async saveCreator(userId: string, creatorId: string) {
    const creator = await creatorsRepository.findById(creatorId);
    if (!creator || creator.gateStatus !== "APPROVED") throw new NotFoundError("Creator");
    return creatorsRepository.save(userId, creatorId);
  },

  unsaveCreator(userId: string, creatorId: string) {
    return creatorsRepository.unsave(userId, creatorId);
  },

  listSaved(userId: string) {
    return creatorsRepository.findSavedByUser(userId);
  }
};
