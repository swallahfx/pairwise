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
  deliveryNote?: string;
  disputeReason?: string;
  disputedByUserId?: string;
  disputedAt?: Date;
  disputeResponse?: string;
  disputeRespondedAt?: Date;
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
  create(offerId: string, priceKobo: number, platformFeeKobo: number, totalKobo: number, feeWaived: boolean) {
    return prisma.order.create({
      data: { offerId, priceKobo, platformFeeKobo, totalKobo, feeWaived, status: "AGREED" }
    });
  },
  // "Funded" here means ever moved past AGREED — an abandoned order a
  // developer never actually paid for shouldn't burn their one free
  // campaign, so this only counts orders that had real money behind them.
  countFundedForDeveloper(developerId: string) {
    return prisma.order.count({ where: { offer: { developerId }, status: { not: "AGREED" } } });
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
