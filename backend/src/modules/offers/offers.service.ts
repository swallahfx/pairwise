import { ConflictError, ForbiddenError, NotFoundError } from "../../common/errors";
import { prisma } from "../../config/db";
import { creatorsRepository } from "../creators/creators.repository";
import { rateCardsRepository } from "../rateCards/rateCards.repository";
import { requestsRepository } from "../requests/requests.repository";
import { ordersService } from "../orders/orders.service";
import { offersRepository } from "./offers.repository";
import { ApplyToRequestInput, SendCustomOfferInput } from "./offers.schema";

// This module is the meeting point of the PRD's three paths to a price
// (rate card / advert request / custom offer). Whichever path is taken,
// it ends the same way: an ACCEPTED offer hands off to
// ordersService.createFromOffer, and one Order object takes it from there.
export const offersService = {
  // Path 1 — Rate card: the price is already fixed and listed, so there's
  // nothing to negotiate. The offer is created ACCEPTED immediately and an
  // order is opened in the same call.
  async bookRateCard(developerUserId: string, rateCardItemId: string) {
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
      status: "ACCEPTED"
    });

    const order = await ordersService.createFromOffer(offer.id, offer.priceKobo);
    return { offer, order };
  },

  // Path 3 — Custom offer: developer proposes a price to one creator.
  // Starts PENDING; nothing is ordered until the creator accepts.
  async sendCustomOffer(developerUserId: string, input: SendCustomOfferInput) {
    const developer = await prisma.developerProfile.findUnique({ where: { userId: developerUserId } });
    if (!developer) throw new ForbiddenError("Only developer accounts can send an offer");

    return offersRepository.create({
      developerId: developer.id,
      creatorId: input.creatorId,
      productId: input.productId,
      source: "CUSTOM",
      priceKobo: input.priceKobo,
      deliverable: input.deliverable,
      status: "PENDING"
    });
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

    return offersRepository.create({
      developerId: request.developerId,
      creatorId: creator.id,
      productId: request.productId,
      requestId: request.id,
      source: "REQUEST",
      priceKobo: input.priceKobo ?? request.budgetKobo,
      deliverable: input.deliverable,
      status: "PENDING"
    });
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

    const order = await ordersService.createFromOffer(offer.id, offer.priceKobo);
    return { offer, order };
  },

  async decline(offerId: string, actingUserId: string) {
    const offer = await offersRepository.findById(offerId);
    if (!offer) throw new NotFoundError("Offer");
    if (offer.status !== "PENDING") {
      throw new ConflictError(`Cannot decline an offer in status ${offer.status}`);
    }
    await assertCanRespond(offer, actingUserId);
    return offersRepository.updateStatus(offerId, "DECLINED");
  }
};

// A PENDING offer only has one legitimate respondent: whichever side
// didn't set the price. A custom offer was priced by the developer, so
// only the creator it was sent to can accept/decline it; a request
// application was priced by the creator who applied, so only the
// developer who posted the request can pick it. Without this check any
// authenticated user could accept/decline an offer that isn't theirs.
async function assertCanRespond(
  offer: { source: string; creatorId: string; developerId: string },
  actingUserId: string
) {
  if (offer.source === "CUSTOM") {
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
