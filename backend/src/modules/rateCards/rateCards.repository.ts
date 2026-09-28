import { prisma } from "../../config/db";

export const rateCardsRepository = {
  create(creatorId: string, data: { deliverable: string; priceKobo: number; turnaroundDays: number }) {
    return prisma.rateCardItem.create({ data: { ...data, creatorId } });
  },
  delete(id: string) {
    return prisma.rateCardItem.delete({ where: { id } });
  },
  findById(id: string) {
    return prisma.rateCardItem.findUnique({ where: { id } });
  }
};
