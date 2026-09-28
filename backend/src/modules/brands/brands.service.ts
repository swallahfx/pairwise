import { ConflictError, NotFoundError } from "../../common/errors";
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

  async adminDelete(id: string) {
    const brand = await brandsRepository.findById(id);
    if (!brand) throw new NotFoundError("Brand profile");
    const listings = await brandsRepository.countListings(id);
    if (listings > 0) {
      throw new ConflictError("This brand has Upfront listings — remove those first");
    }
    return brandsRepository.delete(id);
  }
};
