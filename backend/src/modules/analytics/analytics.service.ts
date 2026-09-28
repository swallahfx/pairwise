import { prisma } from "../../config/db";

// Every number here is derived straight from existing tables — no new
// aggregate/snapshot table to keep in sync, since the admin "Manage data"
// tab already gives full visibility into the rows these counts summarize.
export const analyticsService = {
  async summary() {
    const [
      paidOrders,
      paidPurchases,
      ordersByStatus,
      purchasesByStatus,
      usersByRole,
      creatorsByGateStatus,
      listingsByGateStatus,
      totalReviews,
      totalQuestions,
      answeredQuestions
    ] = await Promise.all([
      prisma.order.aggregate({ where: { status: "PAID" }, _sum: { totalKobo: true, platformFeeKobo: true } }),
      prisma.upfrontPurchase.aggregate({
        where: { status: "PAID" },
        _sum: { totalKobo: true, platformFeeKobo: true }
      }),
      prisma.order.groupBy({ by: ["status"], _count: true }),
      prisma.upfrontPurchase.groupBy({ by: ["status"], _count: true }),
      prisma.user.groupBy({ by: ["role"], _count: true }),
      prisma.creatorProfile.groupBy({ by: ["gateStatus"], _count: true }),
      prisma.upfrontListing.groupBy({ by: ["gateStatus"], _count: true }),
      prisma.review.count(),
      prisma.question.count(),
      prisma.question.count({ where: { answerText: { not: null } } })
    ]);

    const gmvKobo = (paidOrders._sum.totalKobo ?? 0) + (paidPurchases._sum.totalKobo ?? 0);
    const platformFeeKobo = (paidOrders._sum.platformFeeKobo ?? 0) + (paidPurchases._sum.platformFeeKobo ?? 0);

    return {
      gmvKobo,
      platformFeeKobo,
      ordersByStatus: ordersByStatus.map((r) => ({ status: r.status, count: r._count })),
      purchasesByStatus: purchasesByStatus.map((r) => ({ status: r.status, count: r._count })),
      usersByRole: usersByRole.map((r) => ({ role: r.role, count: r._count })),
      creatorsByGateStatus: creatorsByGateStatus.map((r) => ({ status: r.gateStatus, count: r._count })),
      listingsByGateStatus: listingsByGateStatus.map((r) => ({ status: r.gateStatus, count: r._count })),
      totalReviews,
      totalQuestions,
      answeredQuestions
    };
  }
};
