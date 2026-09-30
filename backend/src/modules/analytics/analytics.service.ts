import { prisma } from "../../config/db";

const REVENUE_DAYS = 30;

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
      offersByStatus,
      offersBySource,
      totalReviews,
      totalQuestions,
      answeredQuestions,
      totalProducts,
      openRequests,
      revenueOrders,
      revenuePurchases,
      topCreators
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
      prisma.offer.groupBy({ by: ["status"], _count: true }),
      prisma.offer.groupBy({ by: ["source"], _count: true }),
      prisma.review.count(),
      prisma.question.count(),
      prisma.question.count({ where: { answerText: { not: null } } }),
      prisma.product.count(),
      prisma.advertRequest.count({ where: { status: "OPEN" } }),
      // Raw paidAt+totalKobo rows for the trend line below — bucketing by
      // day happens in JS rather than a DB-side date_trunc, since this is
      // one lightweight in-memory pass over what's realistically at most a
      // few thousand rows, not worth a raw SQL query for.
      prisma.order.findMany({
        where: { status: "PAID", paidAt: { not: null } },
        select: { paidAt: true, totalKobo: true }
      }),
      prisma.upfrontPurchase.findMany({
        where: { status: "PAID", paidAt: { not: null } },
        select: { paidAt: true, totalKobo: true }
      }),
      // Top earners from bespoke work only (what a creator actually keeps,
      // i.e. priceKobo before the platform fee) — Upfront earnings aren't
      // folded in here since a lister there can be a brand, not a creator,
      // so "top creators" wouldn't cleanly cover both.
      prisma.order.groupBy({
        by: ["offerId"],
        where: { status: "PAID" },
        _sum: { priceKobo: true }
      })
    ]);

    const gmvKobo = (paidOrders._sum.totalKobo ?? 0) + (paidPurchases._sum.totalKobo ?? 0);
    const platformFeeKobo = (paidOrders._sum.platformFeeKobo ?? 0) + (paidPurchases._sum.platformFeeKobo ?? 0);

    const revenueByDay = bucketRevenueByDay([...revenueOrders, ...revenuePurchases], REVENUE_DAYS);
    const topCreatorsByEarnings = await topCreatorsFromOrderGroups(topCreators);

    return {
      gmvKobo,
      platformFeeKobo,
      ordersByStatus: ordersByStatus.map((r) => ({ status: r.status, count: r._count })),
      purchasesByStatus: purchasesByStatus.map((r) => ({ status: r.status, count: r._count })),
      usersByRole: usersByRole.map((r) => ({ role: r.role, count: r._count })),
      creatorsByGateStatus: creatorsByGateStatus.map((r) => ({ status: r.gateStatus, count: r._count })),
      listingsByGateStatus: listingsByGateStatus.map((r) => ({ status: r.gateStatus, count: r._count })),
      offersByStatus: offersByStatus.map((r) => ({ status: r.status, count: r._count })),
      offersBySource: offersBySource.map((r) => ({ status: r.source, count: r._count })),
      totalReviews,
      totalQuestions,
      answeredQuestions,
      totalProducts,
      openRequests,
      revenueByDay,
      topCreatorsByEarnings
    };
  }
};

function bucketRevenueByDay(rows: { paidAt: Date | null; totalKobo: number }[], days: number) {
  const buckets = new Map<string, number>();
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    buckets.set(d.toISOString().slice(0, 10), 0);
  }
  for (const row of rows) {
    if (!row.paidAt) continue;
    const key = row.paidAt.toISOString().slice(0, 10);
    if (buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + row.totalKobo);
  }
  return Array.from(buckets.entries()).map(([date, gmvKobo]) => ({ date, gmvKobo }));
}

// groupBy only gives offerId, not who the creator is — one more query to
// join that in, kept separate so the top-5 slice only pulls creator names
// for rows that actually matter rather than joining on every paid order.
async function topCreatorsFromOrderGroups(groups: { offerId: string; _sum: { priceKobo: number | null } }[]) {
  const earningsByOffer = new Map(groups.map((g) => [g.offerId, g._sum.priceKobo ?? 0]));
  const offers = await prisma.offer.findMany({
    where: { id: { in: [...earningsByOffer.keys()] } },
    select: { id: true, creatorId: true, creator: { select: { user: { select: { name: true } }, handle: true } } }
  });

  const earningsByCreator = new Map<string, { name: string; handle: string; earningsKobo: number }>();
  for (const offer of offers) {
    const earnings = earningsByOffer.get(offer.id) ?? 0;
    const existing = earningsByCreator.get(offer.creatorId);
    if (existing) {
      existing.earningsKobo += earnings;
    } else {
      earningsByCreator.set(offer.creatorId, {
        name: offer.creator.user.name,
        handle: offer.creator.handle,
        earningsKobo: earnings
      });
    }
  }

  return Array.from(earningsByCreator.values())
    .sort((a, b) => b.earningsKobo - a.earningsKobo)
    .slice(0, 5);
}
