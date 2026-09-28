import { prisma } from "../../config/db";

type TargetType = "CREATOR" | "UPFRONT_LISTING";

export const qaRepository = {
  create(targetType: TargetType, targetId: string, askerId: string, questionText: string) {
    return prisma.question.create({
      data: {
        targetType,
        askerId,
        questionText,
        creatorId: targetType === "CREATOR" ? targetId : undefined,
        listingId: targetType === "UPFRONT_LISTING" ? targetId : undefined
      }
    });
  },

  findById(id: string) {
    return prisma.question.findUnique({ where: { id } });
  },

  findForTarget(targetType: TargetType, targetId: string) {
    return prisma.question.findMany({
      where: targetType === "CREATOR" ? { creatorId: targetId } : { listingId: targetId },
      include: { asker: { select: { name: true } } },
      orderBy: { createdAt: "desc" }
    });
  },

  answer(id: string, answerText: string) {
    return prisma.question.update({ where: { id }, data: { answerText, answeredAt: new Date() } });
  },

  // Powers the response-time/reply-rate badge: every question ever asked of
  // this creator, answered or not — the service layer decides what counts
  // as "enough data" to actually show the badge.
  findAllForCreator(creatorId: string) {
    return prisma.question.findMany({ where: { creatorId } });
  }
};
