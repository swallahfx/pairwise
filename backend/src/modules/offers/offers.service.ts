import { ConflictError, ForbiddenError, NotFoundError } from "../../common/errors";
import { prisma } from "../../config/db";
import { notificationsService } from "../notifications/notifications.service";
import { creatorsRepository } from "../creators/creators.repository";
import { rateCardsRepository } from "../rateCards/rateCards.repository";
import { requestsRepository } from "../requests/requests.repository";
import { ordersService } from "../orders/orders.service";
import { offersRepository } from "./offers.repository";
import { ApplyToRequestInput, SendCustomOfferInput } from "./offers.schema";

type OfferWithParties = Awaited<ReturnType<typeof offersRepository.findById>>;

// This module is the meeting point of the PRD's three paths to a price
// (rate card / advert request / custom offer). All three now converge the
// same way: an offer starts PENDING, the other side has to accept it
// (agreeing to what's actually being delivered) before ordersService opens
// an Order and any money can move.
export const offersService = {
  // Path 1 — Rate card: the price is fixed and listed, but what the
  // developer specifically wants still isn't — that's `requirements`, and
  // it's what the creator is agreeing to by accepting, and what delivery
  // gets judged against before the money releases. So this now waits on
  // creator acceptance exactly like the other two paths, instead of
  // skipping straight to an order.
  async bookRateCard(developerUserId: string, rateCardItemId: string, requirements: string) {
    const item = await rateCardsRepository.findById(rateCardItemId);
    if (!item) throw new NotFoundError("Rate card item");

    const developer = await prisma.developerProfile.findUnique({ where: { userId: developerUserId } });
    if (!developer) throw new ForbiddenError("Only developer accounts can book a rate");

    const offer = await offersRepository.create({
      developerId: developer.id,
      creatorId: item.creatorId,
      rateCardItemId: item.id,
      source: "RATE_CARD",
      priceKobo: item.priceKobo,
      deliverable: item.deliverable,
      requirements,
      status: "PENDING"
    });

    notificationsService.notify(
      offer.creator.userId,
      "OFFER_UPDATE",
      `${offer.developer.user.name} wants to book "${offer.deliverable}" — review their requirements.`,
      "/offers"
    );
    return offer;
  },

  // Path 3 — Custom offer: developer proposes a price to one creator.
  // Starts PENDING; nothing is ordered until the creator accepts.
  async sendCustomOffer(developerUserId: string, input: SendCustomOfferInput) {
    const developer = await prisma.developerProfile.findUnique({ where: { userId: developerUserId } });
    if (!developer) throw new ForbiddenError("Only developer accounts can send an offer");

    const offer = await offersRepository.create({
      developerId: developer.id,
      creatorId: input.creatorId,
      productId: input.productId,
      source: "CUSTOM",
      priceKobo: input.priceKobo,
      deliverable: input.deliverable,
      status: "PENDING"
    });

    notificationsService.notify(
      offer.creator.userId,
      "OFFER_UPDATE",
      `${offer.developer.user.name} sent you a custom offer: "${offer.deliverable}".`,
      "/offers"
    );
    return offer;
  },

  // Path 2 — Advert request: a creator applies to an open, developer-posted
  // budget. Starts PENDING; the developer picks one respondent to accept.
  async applyToRequest(creatorUserId: string, requestId: string, input: ApplyToRequestInput) {
    const creator = await creatorsRepository.findByUserId(creatorUserId);
    if (!creator || creator.gateStatus !== "APPROVED") {
      throw new ForbiddenError("Your profile needs to be approved before you can apply to requests");
    }
    const request = await prisma.advertRequest.findUnique({ where: { id: requestId } });
    if (!request || request.status !== "OPEN") throw new NotFoundError("Open request");

    const offer = await offersRepository.create({
      developerId: request.developerId,
      creatorId: creator.id,
      productId: request.productId,
      requestId: request.id,
      source: "REQUEST",
      priceKobo: input.priceKobo ?? request.budgetKobo,
      deliverable: input.deliverable,
      status: "PENDING"
    });

    notificationsService.notify(
      offer.developer.userId,
      "OFFER_UPDATE",
      `${offer.creator.user.name} applied to your request with "${offer.deliverable}".`,
      "/offers"
    );
    return offer;
  },

  listApplicants(requestId: string) {
    return offersRepository.findByRequest(requestId);
  },

  listMine(userId: string, role: "DEVELOPER" | "CREATOR") {
    return offersRepository.findMine(userId, role);
  },

  listMineEitherSide(userId: string) {
    return offersRepository.findMineEitherSide(userId);
  },

  // Accepting a PENDING offer (either a custom offer the creator accepts,
  // or a request application the developer picks) always ends the same
  // way: mark it ACCEPTED, close the request if there was one, open an
  // order. This is the one place all three paths converge.
  async accept(offerId: string, actingUserId: string) {
    const offer = await offersRepository.findById(offerId);
    if (!offer) throw new NotFoundError("Offer");
    if (offer.status !== "PENDING") {
      throw new ConflictError(`Cannot accept an offer in status ${offer.status}`);
    }
    await assertCanRespond(offer, actingUserId);

    await offersRepository.updateStatus(offerId, "ACCEPTED");
    if (offer.requestId) {
      await prisma.advertRequest.update({ where: { id: offer.requestId }, data: { status: "CLOSED" } });
    }

    const order = await ordersService.createFromOffer(offer.id, offer.priceKobo, offer.developerId);
    const { userId: recipientId, message } = acceptNotificationFor(offer);
    notificationsService.notify(recipientId, "OFFER_UPDATE", message, `/orders/${order.id}`);
    return { offer, order };
  },

  async decline(offerId: string, actingUserId: string) {
    const offer = await offersRepository.findById(offerId);
    if (!offer) throw new NotFoundError("Offer");
    if (offer.status !== "PENDING") {
      throw new ConflictError(`Cannot decline an offer in status ${offer.status}`);
    }
    await assertCanRespond(offer, actingUserId);
    const updated = await offersRepository.updateStatus(offerId, "DECLINED");
    const { userId: recipientId, message } = declineNotificationFor(offer);
    notificationsService.notify(recipientId, "OFFER_UPDATE", message, "/offers");
    return updated;
  }
};

// The respondent is always whichever side didn't set the price
// (assertCanRespond enforces that), so the notification always goes the
// other way — to the side now waiting on an order to fund, or on someone
// to try again elsewhere.
function acceptNotificationFor(offer: NonNullable<OfferWithParties>) {
  return offer.source === "REQUEST"
    ? { userId: offer.creator.userId, message: `Your application for "${offer.deliverable}" was accepted.` }
    : {
        userId: offer.developer.userId,
        message: `${offer.creator.user.name} accepted your booking for "${offer.deliverable}" — fund it to get started.`
      };
}

function declineNotificationFor(offer: NonNullable<OfferWithParties>) {
  return offer.source === "REQUEST"
    ? { userId: offer.creator.userId, message: `Your application for "${offer.deliverable}" was declined.` }
    : { userId: offer.developer.userId, message: `Your offer for "${offer.deliverable}" was declined.` };
}

// A PENDING offer only has one legitimate respondent: whichever side
// didn't set the price. A custom offer or rate-card booking was priced by
// (or, for a rate card, on behalf of) the developer, so only the creator it
// was sent to can accept/decline it; a request application was priced by
// the creator who applied, so only the developer who posted the request
// can pick it. Without this check any authenticated user could
// accept/decline an offer that isn't theirs.
async function assertCanRespond(
  offer: { source: string; creatorId: string; developerId: string },
  actingUserId: string
) {
  if (offer.source === "CUSTOM" || offer.source === "RATE_CARD") {
    const creator = await creatorsRepository.findByUserId(actingUserId);
    if (!creator || creator.id !== offer.creatorId) {
      throw new ForbiddenError("Only the creator this offer was sent to can respond to it");
    }
  } else if (offer.source === "REQUEST") {
    const developer = await prisma.developerProfile.findUnique({ where: { userId: actingUserId } });
    if (!developer || developer.id !== offer.developerId) {
      throw new ForbiddenError("Only the developer who posted this request can pick an applicant");
    }
  } else {
    throw new ConflictError("This offer type cannot be responded to directly");
  }
}
