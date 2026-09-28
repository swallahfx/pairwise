import { prisma } from "../../config/db";

type OfferSource = "RATE_CARD" | "REQUEST" | "CUSTOM";
type OfferStatus = "PENDING" | "ACCEPTED" | "COUNTERED" | "DECLINED";

export interface NewOfferData {
  developerId: string;
  creatorId: string;
  productId?: string;
  rateCardItemId?: string;
  requestId?: string;
  source: OfferSource;
  priceKobo: number;
  deliverable: string;
  status: OfferStatus;
}

export const offersRepository = {
  create(data: NewOfferData) {
    return prisma.offer.create({ data });
  },
  findById(id: string) {
    return prisma.offer.findUnique({ where: { id } });
  },
  updateStatus(id: string, status: OfferStatus) {
    return prisma.offer.update({ where: { id }, data: { status } });
  },
  findByRequest(requestId: string) {
    return prisma.offer.findMany({
      where: { requestId },
      include: { creator: { include: { user: { select: { name: true } } } } },
      orderBy: { createdAt: "desc" }
    });
  },
  findMine(userId: string, role: "DEVELOPER" | "CREATOR") {
    return prisma.offer.findMany({
      where: role === "DEVELOPER" ? { developer: { userId } } : { creator: { userId } },
      include: {
        creator: { include: { user: { select: { name: true } } } },
        developer: { include: { user: { select: { name: true } } } },
        product: true,
        order: true
      },
      orderBy: { createdAt: "desc" }
    });
  },
  findMineEitherSide(userId: string) {
    return prisma.offer.findMany({
      where: { OR: [{ developer: { userId } }, { creator: { userId } }] },
      include: {
        creator: { include: { user: { select: { name: true } } } },
        developer: { include: { user: { select: { name: true } } } },
        product: true,
        order: true
      },
      orderBy: { createdAt: "desc" }
    });
  }
};
