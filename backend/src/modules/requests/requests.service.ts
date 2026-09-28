import { ConflictError, NotFoundError } from "../../common/errors";
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
  async adminDelete(id: string) {
    const request = await requestsRepository.findById(id);
    if (!request) throw new NotFoundError("Request");
    const offers = await requestsRepository.countOffers(id);
    if (offers > 0) {
      throw new ConflictError("This request has offers against it and can't be deleted");
    }
    return requestsRepository.delete(id);
  }
};
