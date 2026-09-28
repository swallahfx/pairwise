import { prisma } from "../../config/db";
type OrderStatus =
  | "AGREED"
  | "FUNDED"
  | "IN_PROGRESS"
  | "SUBMITTED"
  | "REVISION_REQUESTED"
  | "APPROVED"
  | "AUTO_APPROVED"
  | "PAID"
  | "DISPUTED"
  | "REFUNDED";

export interface OrderUpdate {
  status?: OrderStatus;
  paystackReference?: string;
  paystackTransferCode?: string;
  fundedAt?: Date;
  submittedAt?: Date;
  approvedAt?: Date;
  paidAt?: Date;
}

const withParties = {
  offer: {
    include: {
      creator: { include: { user: { select: { name: true } } } },
      developer: { include: { user: { select: { name: true, email: true } } } }
    }
  }
} as const;

export const ordersRepository = {
  create(offerId: string, priceKobo: number, platformFeeKobo: number, totalKobo: number) {
    return prisma.order.create({
      data: { offerId, priceKobo, platformFeeKobo, totalKobo, status: "AGREED" }
    });
  },
  findById(id: string) {
    return prisma.order.findUnique({ where: { id }, include: withParties });
  },
  findByPaystackReference(reference: string) {
    return prisma.order.findFirst({ where: { paystackReference: reference }, include: withParties });
  },
  update(id: string, data: OrderUpdate) {
    return prisma.order.update({ where: { id }, data });
  },
  findFundedPastDeadline(cutoff: Date) {
    return prisma.order.findMany({
      where: { status: "SUBMITTED", submittedAt: { lte: cutoff } }
    });
  },
  findMine(userId: string, role: "DEVELOPER" | "CREATOR") {
    return prisma.order.findMany({
      where: {
        offer: role === "DEVELOPER" ? { developer: { userId } } : { creator: { userId } }
      },
      include: withParties,
      orderBy: { createdAt: "desc" }
    });
  },
  findMineEitherSide(userId: string) {
    return prisma.order.findMany({
      where: {
        offer: { OR: [{ developer: { userId } }, { creator: { userId } }] }
      },
      include: withParties,
      orderBy: { createdAt: "desc" }
    });
  },
  findAll() {
    return prisma.order.findMany({ include: withParties, orderBy: { createdAt: "desc" } });
  }
};
