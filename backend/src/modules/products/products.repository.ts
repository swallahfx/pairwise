import { prisma } from "../../config/db";
type MonetizationStatus = "PRE_REVENUE" | "EARLY_REVENUE" | "ESTABLISHED";

export interface NewProductData {
  name: string;
  niche: string;
  link: string;
  pitch: string;
  monetizationStatus: MonetizationStatus;
  mrrKobo?: number;
  activeUsers?: number;
}

export const productsRepository = {
  create(developerId: string, data: NewProductData) {
    return prisma.product.create({ data: { ...data, developerId } });
  },
  findMany(niche?: string) {
    return prisma.product.findMany({
      where: niche ? { niche } : undefined,
      orderBy: { createdAt: "desc" }
    });
  },
  findById(id: string) {
    return prisma.product.findUnique({ where: { id } });
  },
  update(id: string, data: Partial<NewProductData>) {
    return prisma.product.update({ where: { id }, data });
  },
  delete(id: string) {
    return prisma.product.delete({ where: { id } });
  },
  countDependents(id: string) {
    return Promise.all([
      prisma.advertRequest.count({ where: { productId: id } }),
      prisma.offer.count({ where: { productId: id } })
    ]);
  }
};
