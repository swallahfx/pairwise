import { prisma } from "../../config/db";

export const reviewsRepository = {
  create(orderId: string, developerId: string, creatorId: string, rating: number, text: string) {
    return prisma.review.create({ data: { orderId, developerId, creatorId, rating, text } });
  },
  findByOrder(orderId: string) {
    return prisma.review.findUnique({ where: { orderId } });
  },
  findByCreator(creatorId: string) {
    return prisma.review.findMany({
      where: { creatorId },
      include: { developer: { include: { user: { select: { name: true } } } } },
      orderBy: { createdAt: "desc" }
    });
  },
  async statsByCreator(creatorId: string) {
    const result = await prisma.review.aggregate({
      where: { creatorId },
      _avg: { rating: true },
      _count: true
    });
    return { avgRating: result._avg.rating, reviewCount: result._count };
  },
  // Batched aggregate for the directory listing — one groupBy instead of an
  // N+1 aggregate query per card.
  async statsForCreators(creatorIds: string[]) {
    const rows = await prisma.review.groupBy({
      by: ["creatorId"],
      where: { creatorId: { in: creatorIds } },
      _avg: { rating: true },
      _count: true
    });
    const byCreator = new Map(rows.map((r) => [r.creatorId, { avgRating: r._avg.rating, reviewCount: r._count }]));
    return byCreator;
  }
};
