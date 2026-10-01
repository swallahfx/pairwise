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
  // Money against a product can sit two levels down — a direct offer, or an
  // offer made against one of the product's own requests — so both paths
  // need their orders pulled up front for the blocked/safe split.
  findDependentsDetailed(id: string) {
    return Promise.all([
      prisma.offer.findMany({ where: { productId: id }, include: { order: true } }),
      prisma.advertRequest.findMany({
        where: { productId: id },
        include: { offers: { include: { order: true } } }
      })
    ]);
  },

  async cascadeDelete(id: string) {
    const [directOffers, requests] = await prisma.$transaction([
      prisma.offer.findMany({ where: { productId: id }, select: { id: true } }),
      prisma.advertRequest.findMany({ where: { productId: id }, select: { id: true } })
    ]);
    const requestIds = requests.map((r) => r.id);
    const requestOffers = await prisma.offer.findMany({ where: { requestId: { in: requestIds } }, select: { id: true } });
    const offerIds = [...directOffers.map((o) => o.id), ...requestOffers.map((o) => o.id)];

    return prisma.$transaction(async (tx) => {
      await tx.order.deleteMany({ where: { offerId: { in: offerIds } } });
      await tx.offer.deleteMany({ where: { id: { in: offerIds } } });
      await tx.advertRequest.deleteMany({ where: { productId: id } });
      return tx.product.delete({ where: { id } });
    });
  }
};
