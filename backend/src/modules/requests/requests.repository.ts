import { prisma } from "../../config/db";

export interface NewRequestData {
  productId: string;
  budgetKobo: number;
  brief: string;
  nicheTags: string[];
  deadline: Date;
}

export const requestsRepository = {
  create(developerId: string, data: NewRequestData) {
    return prisma.advertRequest.create({ data: { ...data, developerId, productId: data.productId } });
  },
  findOpen(niche?: string) {
    return prisma.advertRequest.findMany({
      where: { status: "OPEN", ...(niche ? { nicheTags: { has: niche } } : {}) },
      include: { product: true },
      orderBy: { createdAt: "desc" }
    });
  },
  findMine(developerUserId: string) {
    return prisma.advertRequest.findMany({
      where: { developer: { userId: developerUserId } },
      include: { product: true, _count: { select: { offers: true } } },
      orderBy: { createdAt: "desc" }
    });
  },
  findById(id: string) {
    return prisma.advertRequest.findUnique({ where: { id } });
  },
  findAll() {
    return prisma.advertRequest.findMany({
      include: { product: true, _count: { select: { offers: true } } },
      orderBy: { createdAt: "desc" }
    });
  },
  update(id: string, data: Partial<NewRequestData>) {
    return prisma.advertRequest.update({ where: { id }, data });
  },
  findOffersDetailed(id: string) {
    return prisma.offer.findMany({ where: { requestId: id }, include: { order: true } });
  },
  async cascadeDelete(id: string) {
    const offers = await prisma.offer.findMany({ where: { requestId: id }, select: { id: true } });
    const offerIds = offers.map((o) => o.id);
    return prisma.$transaction(async (tx) => {
      await tx.order.deleteMany({ where: { offerId: { in: offerIds } } });
      await tx.offer.deleteMany({ where: { requestId: id } });
      return tx.advertRequest.delete({ where: { id } });
    });
  }
};
