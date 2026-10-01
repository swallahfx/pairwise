import { ConflictError, NotFoundError } from "../../common/errors";
import { BlockedItem, blockedDeleteMessage, describeBlockedOrder, orderIsFinancial } from "../../common/financialGuard";
import { productsRepository } from "./products.repository";
import { AdminUpdateProductInput, CreateProductInput } from "./products.schema";

export const productsService = {
  async create(developerId: string, input: CreateProductInput) {
    return productsRepository.create(developerId, input);
  },
  async list(niche?: string) {
    return productsRepository.findMany(niche);
  },
  async getById(id: string) {
    const product = await productsRepository.findById(id);
    if (!product) throw new NotFoundError("Product");
    return product;
  },
  async adminUpdate(id: string, input: AdminUpdateProductInput) {
    const product = await productsRepository.findById(id);
    if (!product) throw new NotFoundError("Product");
    return productsRepository.update(id, input);
  },
  async deletePreview(id: string) {
    const product = await productsRepository.findById(id);
    if (!product) throw new NotFoundError("Product");
    const [directOffers, requests] = await productsRepository.findDependentsDetailed(id);

    const blocked: BlockedItem[] = [];
    const allOffers = [...directOffers, ...requests.flatMap((r) => r.offers)];
    const financialOffers = allOffers.filter((o) => o.order && orderIsFinancial(o.order.status));
    financialOffers.forEach((o) => blocked.push(describeBlockedOrder(o.order!)));

    const cascade: string[] = [];
    const safeOffers = allOffers.length - financialOffers.length;
    if (safeOffers > 0) cascade.push(`${safeOffers} offer(s) with no money moved yet`);
    if (requests.length > 0) cascade.push(`${requests.length} request(s) made against this product`);

    return { cascade, blocked, label: `product ${product.name}` };
  },

  async adminDelete(id: string) {
    const product = await productsRepository.findById(id);
    if (!product) throw new NotFoundError("Product");
    const { blocked } = await productsService.deletePreview(id);
    if (blocked.length > 0) throw new ConflictError(blockedDeleteMessage(blocked));
    return productsRepository.cascadeDelete(id);
  }
};
