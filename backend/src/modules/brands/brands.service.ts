import { ConflictError, NotFoundError } from "../../common/errors";
import { BlockedItem, blockedDeleteMessage, describeBlockedPurchase, purchaseIsFinancial } from "../../common/financialGuard";
import { brandsRepository } from "./brands.repository";
import { AdminUpdateBrandInput, UpdateBrandProfileInput } from "./brands.schema";

// No eligibility gate here, unlike creators.service — there's no automatic
// metric to check for a company, so a brand account is usable immediately
// after signup. Only its individual Upfront listings go through review.
export const brandsService = {
  adminListAll() {
    return brandsRepository.findAll();
  },

  async getMyProfile(userId: string) {
    const profile = await brandsRepository.findByUserId(userId);
    if (!profile) throw new NotFoundError("Brand profile");
    return profile;
  },

  async updateProfile(userId: string, input: UpdateBrandProfileInput) {
    const existing = await brandsRepository.findByUserId(userId);
    if (!existing) throw new NotFoundError("Brand profile");
    return brandsRepository.updateProfile(existing.id, input);
  },

  async adminUpdate(id: string, input: AdminUpdateBrandInput) {
    const brand = await brandsRepository.findById(id);
    if (!brand) throw new NotFoundError("Brand profile");
    return brandsRepository.adminUpdate(id, input);
  },

  async deletePreview(id: string) {
    const brand = await brandsRepository.findById(id);
    if (!brand) throw new NotFoundError("Brand profile");
    const listings = await brandsRepository.findListingsDetailed(id);

    const blocked: BlockedItem[] = [];
    let safeListingCount = 0;
    for (const listing of listings) {
      const financialPurchases = listing.purchases.filter((p) => purchaseIsFinancial(p.status));
      if (financialPurchases.length > 0) {
        financialPurchases.forEach((p) => blocked.push(describeBlockedPurchase(p, listing.title)));
      } else {
        safeListingCount += 1;
      }
    }

    const cascade: string[] = [];
    if (safeListingCount > 0) cascade.push(`${safeListingCount} Upfront listing(s)`);

    return { cascade, blocked, label: `brand ${brand.companyName}` };
  },

  async adminDelete(id: string) {
    const brand = await brandsRepository.findById(id);
    if (!brand) throw new NotFoundError("Brand profile");
    const { blocked } = await brandsService.deletePreview(id);
    if (blocked.length > 0) throw new ConflictError(blockedDeleteMessage(blocked));
    return brandsRepository.cascadeDelete(id);
  }
};
