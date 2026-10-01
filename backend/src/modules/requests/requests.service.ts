import { ConflictError, NotFoundError } from "../../common/errors";
import { BlockedItem, blockedDeleteMessage, describeBlockedOrder, orderIsFinancial } from "../../common/financialGuard";
import { requestsRepository } from "./requests.repository";
import { AdminUpdateRequestInput, CreateRequestInput } from "./requests.schema";

export const requestsService = {
  create(developerId: string, input: CreateRequestInput) {
    return requestsRepository.create(developerId, input);
  },
  listOpen(niche?: string) {
    return requestsRepository.findOpen(niche);
  },
  listMine(developerUserId: string) {
    return requestsRepository.findMine(developerUserId);
  },
  adminListAll() {
    return requestsRepository.findAll();
  },
  async adminUpdate(id: string, input: AdminUpdateRequestInput) {
    const request = await requestsRepository.findById(id);
    if (!request) throw new NotFoundError("Request");
    return requestsRepository.update(id, input);
  },
  async deletePreview(id: string) {
    const request = await requestsRepository.findById(id);
    if (!request) throw new NotFoundError("Request");
    const offers = await requestsRepository.findOffersDetailed(id);

    const blocked: BlockedItem[] = [];
    const financialOffers = offers.filter((o) => o.order && orderIsFinancial(o.order.status));
    financialOffers.forEach((o) => blocked.push(describeBlockedOrder(o.order!)));

    const cascade: string[] = [];
    const safeOffers = offers.length - financialOffers.length;
    if (safeOffers > 0) cascade.push(`${safeOffers} offer(s) with no money moved yet`);

    return { cascade, blocked, label: "this request" };
  },

  async adminDelete(id: string) {
    const request = await requestsRepository.findById(id);
    if (!request) throw new NotFoundError("Request");
    const { blocked } = await requestsService.deletePreview(id);
    if (blocked.length > 0) throw new ConflictError(blockedDeleteMessage(blocked));
    return requestsRepository.cascadeDelete(id);
  }
};
