import { ConflictError, NotFoundError } from "../../common/errors";
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
  async adminDelete(id: string) {
    const product = await productsRepository.findById(id);
    if (!product) throw new NotFoundError("Product");
    const [requests, offers] = await productsRepository.countDependents(id);
    if (requests > 0 || offers > 0) {
      throw new ConflictError("This product has requests or offers against it and can't be deleted");
    }
    return productsRepository.delete(id);
  }
};
