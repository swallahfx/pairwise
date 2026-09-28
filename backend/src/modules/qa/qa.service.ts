import { prisma } from "../../config/db";
import { ForbiddenError, NotFoundError } from "../../common/errors";
import { notificationsService } from "../notifications/notifications.service";
import { qaRepository } from "./qa.repository";
import { AnswerQuestionInput, AskQuestionInput } from "./qa.schema";

// A public Q&A thread, not a private message — visible to anyone
// considering the same creator or program, same reasoning a marketplace
// puts pre-purchase questions in the open rather than in DMs: the answer
// is useful to the next person asking the same thing, not just the asker.
export const qaService = {
  async ask(askerId: string, input: AskQuestionInput) {
    let ownerUserId: string | null;
    let targetLabel: string;
    if (input.targetType === "CREATOR") {
      const creator = await prisma.creatorProfile.findUnique({ where: { id: input.targetId } });
      if (!creator || creator.gateStatus !== "APPROVED") throw new NotFoundError("Creator");
      ownerUserId = creator.userId;
      targetLabel = `/creators/${creator.id}`;
    } else {
      const listing = await prisma.upfrontListing.findUnique({ where: { id: input.targetId } });
      if (!listing || listing.gateStatus !== "APPROVED") throw new NotFoundError("Listing");
      ownerUserId = await targetOwnerUserId(input.targetType, input.targetId);
      targetLabel = `/upfront/${listing.id}`;
    }

    const question = await qaRepository.create(input.targetType, input.targetId, askerId, input.questionText);
    if (ownerUserId) {
      notificationsService.notify(ownerUserId, "QUESTION_ASKED", "Someone asked a question — take a look.", targetLabel);
    }
    return question;
  },

  listForTarget(targetType: "CREATOR" | "UPFRONT_LISTING", targetId: string) {
    return qaRepository.findForTarget(targetType, targetId);
  },

  // Only the account being asked about can answer: the creator themselves
  // for a CREATOR-targeted question, or whichever side listed the program
  // for an UPFRONT_LISTING one — never just any authenticated user.
  async answer(questionId: string, answererUserId: string, input: AnswerQuestionInput) {
    const question = await qaRepository.findById(questionId);
    if (!question) throw new NotFoundError("Question");
    if (question.answerText) throw new ForbiddenError("This question already has an answer");

    const ownerUserId = await targetOwnerUserId(question.targetType, (question.creatorId ?? question.listingId)!);
    if (ownerUserId !== answererUserId) {
      throw new ForbiddenError("Only the account being asked about can answer this");
    }

    const answered = await qaRepository.answer(questionId, input.answerText);
    notificationsService.notify(
      question.askerId,
      "QUESTION_ANSWERED",
      "Your question got an answer.",
      question.targetType === "CREATOR" ? `/creators/${question.creatorId}` : `/upfront/${question.listingId}`
    );
    return answered;
  }
};

async function targetOwnerUserId(
  targetType: "CREATOR" | "UPFRONT_LISTING",
  targetId: string
): Promise<string | null> {
  if (targetType === "CREATOR") {
    const creator = await prisma.creatorProfile.findUnique({ where: { id: targetId } });
    return creator?.userId ?? null;
  }
  const listing = await prisma.upfrontListing.findUnique({
    where: { id: targetId },
    include: { creator: true, brand: true }
  });
  if (!listing) return null;
  return listing.listerType === "CREATOR" ? (listing.creator?.userId ?? null) : (listing.brand?.userId ?? null);
}
