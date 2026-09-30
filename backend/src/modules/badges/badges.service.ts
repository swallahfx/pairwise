import { prisma } from "../../config/db";

type Section = "requests" | "upfront" | "creators";

// "New since you last looked" counts for the Requests/Upfront/Creators nav
// badges. Which sections are worth counting depends on role — a developer
// already knows what they posted, so requests isn't their discovery page,
// but /creators is; a creator has the opposite pairing. Each count is
// scoped to only what that role could actually act on (OPEN requests, not
// closed ones; APPROVED listings/creators, not pending review), so the
// number always matches what they'd actually find by clicking in.
export const badgesService = {
  async counts(userId: string, role: "DEVELOPER" | "CREATOR" | "BRAND" | "ADMIN") {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { lastViewedRequestsAt: true, lastViewedUpfrontAt: true, lastViewedCreatorsAt: true }
    });
    if (!user) return { requests: 0, upfront: 0, creators: 0 };

    const wantsRequests = role === "CREATOR" || role === "ADMIN";
    const wantsUpfront = role === "CREATOR" || role === "BRAND" || role === "ADMIN";
    const wantsCreators = role === "DEVELOPER" || role === "ADMIN";

    const [requests, upfront, creators] = await Promise.all([
      wantsRequests
        ? prisma.advertRequest.count({
            where: { status: "OPEN", createdAt: { gt: user.lastViewedRequestsAt ?? new Date(0) } }
          })
        : 0,
      wantsUpfront
        ? prisma.upfrontListing.count({
            where: {
              gateStatus: "APPROVED",
              createdAt: { gt: user.lastViewedUpfrontAt ?? new Date(0) },
              NOT: { OR: [{ creator: { user: { role: "ADMIN" } } }, { brand: { user: { role: "ADMIN" } } }] }
            }
          })
        : 0,
      wantsCreators
        ? prisma.creatorProfile.count({
            where: {
              gateStatus: "APPROVED",
              createdAt: { gt: user.lastViewedCreatorsAt ?? new Date(0) },
              user: { role: { not: "ADMIN" } }
            }
          })
        : 0
    ]);

    return { requests, upfront, creators };
  },

  markViewed(userId: string, section: Section) {
    const field =
      section === "requests"
        ? "lastViewedRequestsAt"
        : section === "upfront"
          ? "lastViewedUpfrontAt"
          : "lastViewedCreatorsAt";
    return prisma.user.update({ where: { id: userId }, data: { [field]: new Date() } });
  }
};
