import { prisma } from "../../config/db";
import { ConflictError, ForbiddenError, NotFoundError } from "../../common/errors";
import { reviewsRepository } from "./reviews.repository";
import { CreateReviewInput } from "./reviews.schema";

// Reviews are only meaningful tied to a real completed transaction —
// deliberately narrower than an open comment box. You can only review an
// order that's actually PAID, and only the developer who hired the creator
// on that specific order can leave one: it's a trust signal for the *next*
// developer deciding whether to book this creator, so it has to come from
// the buyer's side, not the creator's own account.
export const reviewsService = {
  async create(developerUserId: string, orderId: string, input: CreateReviewInput) {
    const order = await prisma.order.findUnique({ where: { id: orderId }, include: { offer: true } });
    if (!order) throw new NotFoundError("Order");
    if (order.status !== "PAID") throw new ConflictError("Can only review a completed order");

    const developer = await prisma.developerProfile.findUnique({ where: { userId: developerUserId } });
    if (!developer || order.offer.developerId !== developer.id) {
      throw new ForbiddenError("Only the developer on this order can leave this review");
    }

    const existing = await reviewsRepository.findByOrder(orderId);
    if (existing) throw new ConflictError("This order already has a review");

    return reviewsRepository.create(orderId, developer.id, order.offer.creatorId, input.rating, input.text);
  },

  listForCreator(creatorId: string) {
    return reviewsRepository.findByCreator(creatorId);
  },

  statsForCreator(creatorId: string) {
    return reviewsRepository.statsByCreator(creatorId);
  }
};
