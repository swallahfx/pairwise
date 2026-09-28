import { ForbiddenError, NotFoundError } from "../../common/errors";
import { creatorsRepository } from "../creators/creators.repository";
import { rateCardsRepository } from "./rateCards.repository";
import { CreateRateCardItemInput } from "./rateCards.schema";

export const rateCardsService = {
  async addItem(userId: string, input: CreateRateCardItemInput) {
    const profile = await creatorsRepository.findByUserId(userId);
    if (!profile) throw new NotFoundError("Creator profile");
    if (profile.gateStatus !== "APPROVED") {
      throw new ForbiddenError("Your profile needs to clear the eligibility bar before you can list rates");
    }
    return rateCardsRepository.create(profile.id, input);
  },

  async removeItem(userId: string, itemId: string) {
    const item = await rateCardsRepository.findById(itemId);
    if (!item) throw new NotFoundError("Rate card item");
    const profile = await creatorsRepository.findByUserId(userId);
    if (!profile || item.creatorId !== profile.id) {
      throw new ForbiddenError("You can only remove your own rate card items");
    }
    return rateCardsRepository.delete(itemId);
  }
};
