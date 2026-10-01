import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import { prisma } from "../../config/db";
import { env } from "../../config/env";
import { ConflictError, NotFoundError, UnauthorizedError } from "../../common/errors";
import { BlockedItem, blockedDeleteMessage, describeBlockedOrder, describeBlockedPurchase, orderIsFinancial, purchaseIsFinancial } from "../../common/financialGuard";
import { AdminCreateUserInput, GoogleAuthInput, LoginInput, RegisterInput } from "./auth.schema";

const googleClient = new OAuth2Client(env.googleClientId);

// Both the password path and the Google path create the same shape of
// profile row — kept in one place so a new signup always gets exactly the
// eligibility-gated creator profile or empty developer profile it needs,
// regardless of which path created the account.
// Shared by adminCreateUser and prisma/seed.ts (which backfills the same
// bundle onto any admin created before this existed) — an admin's own
// creator profile is pre-approved directly rather than run through
// passesEligibilityGate, same as a normal creator's preApprove flag.
export function adminProfileBundle(name: string, email: string) {
  const handle = "@" + email.split("@")[0];
  return {
    developerProfile: { create: {} },
    creatorProfile: {
      create: {
        handle,
        platform: "Admin",
        followerCount: 0,
        engagementRate: 0,
        nicheTags: [],
        gateStatus: "APPROVED" as const
      }
    },
    brandProfile: { create: { companyName: `${name} (Admin)` } }
  };
}

function newProfileData(role: "DEVELOPER" | "CREATOR" | "BRAND") {
  if (role === "DEVELOPER") return { developerProfile: { create: {} } };
  if (role === "BRAND") return { brandProfile: { create: { companyName: "" } } };
  return {
    creatorProfile: {
      create: { handle: "", platform: "", followerCount: 0, engagementRate: 0, nicheTags: [] }
    }
  };
}

// All business rules for signup/login live here — the controller only
// translates HTTP <-> service calls, and never touches Prisma directly.
export const authService = {
  async register(input: RegisterInput) {
    const existing = await prisma.user.findUnique({ where: { email: input.email } });
    if (existing) throw new ConflictError("An account with that email already exists");

    const passwordHash = await bcrypt.hash(input.password, 10);

    const user = await prisma.user.create({
      data: {
        email: input.email,
        passwordHash,
        name: input.name,
        role: input.role,
        ...newProfileData(input.role)
      }
    });

    return authService.issueToken(user.id, user.role, user.name, user.email);
  },

  async login(input: LoginInput) {
    const user = await prisma.user.findUnique({ where: { email: input.email } });
    if (!user) throw new UnauthorizedError("Invalid email or password");
    if (!user.passwordHash) {
      throw new UnauthorizedError("This account signs in with Google — use the Google button instead");
    }

    const valid = await bcrypt.compare(input.password, user.passwordHash);
    if (!valid) throw new UnauthorizedError("Invalid email or password");

    return authService.issueToken(user.id, user.role, user.name, user.email);
  },

  // Verifies the ID token Google's Identity Services button hands back to
  // the frontend (a signed JWT asserting a verified Google email — no
  // client secret or redirect flow needed for this). An existing account
  // with a matching email is linked and logged in; a brand new email needs
  // `role` so we know which profile to create, same as password register.
  async googleAuth(input: GoogleAuthInput) {
    if (!env.googleClientId) {
      throw new ConflictError("Google sign-in isn't configured on this server");
    }

    let payload;
    try {
      const ticket = await googleClient.verifyIdToken({
        idToken: input.credential,
        audience: env.googleClientId
      });
      payload = ticket.getPayload();
    } catch {
      throw new UnauthorizedError("Invalid Google credential");
    }

    if (!payload?.email || !payload.email_verified) {
      throw new UnauthorizedError("That Google account has no verified email");
    }

    const existing = await prisma.user.findUnique({ where: { email: payload.email } });
    if (existing) {
      if (!existing.googleId) {
        await prisma.user.update({ where: { id: existing.id }, data: { googleId: payload.sub } });
      }
      return authService.issueToken(existing.id, existing.role, existing.name, existing.email);
    }

    if (!input.role) {
      throw new ConflictError("No account for this Google email yet — pick a role to sign up");
    }

    const user = await prisma.user.create({
      data: {
        email: payload.email,
        googleId: payload.sub,
        name: payload.name ?? payload.email.split("@")[0],
        role: input.role,
        ...newProfileData(input.role)
      }
    });

    return authService.issueToken(user.id, user.role, user.name, user.email);
  },

  issueToken(userId: string, role: "DEVELOPER" | "CREATOR" | "ADMIN" | "BRAND", name: string, email: string) {
    const token = jwt.sign({ userId, role }, env.jwtSecret, { expiresIn: "7d" });
    return { token, userId, role, name, email };
  },

  // The one place an operator can stand up an account directly instead of
  // through self-serve signup — useful for onboarding a partner brand,
  // pre-approving a known creator, or seeding another admin. Never issues
  // a token for the new account; the admin isn't logging in as them.
  async adminCreateUser(input: AdminCreateUserInput) {
    const existing = await prisma.user.findUnique({ where: { email: input.email } });
    if (existing) throw new ConflictError("An account with that email already exists");

    const passwordHash = await bcrypt.hash(input.password, 10);
    // ADMIN gets all three profiles at once, pre-approved — an admin
    // account needs to act as a developer, creator, and brand to actually
    // exercise (and support) every flow on the platform, not just view
    // data about them. The other three roles still get exactly one
    // profile each, matching what self-serve signup would create.
    const profileData =
      input.role === "ADMIN"
        ? adminProfileBundle(input.name, input.email)
        : input.role === "DEVELOPER"
          ? { developerProfile: { create: {} } }
          : input.role === "BRAND"
            ? {
                brandProfile: {
                  create: {
                    companyName: input.companyName ?? "",
                    website: input.website || undefined,
                    industry: input.industry || undefined
                  }
                }
              }
            : input.role === "CREATOR"
              ? {
                  creatorProfile: {
                    create: {
                      handle: input.handle ?? "",
                      platform: input.platform ?? "",
                      followerCount: input.followerCount ?? 0,
                      engagementRate: input.engagementRate ?? 0,
                      nicheTags: input.nicheTags ?? [],
                      gateStatus: (input.preApprove ? "APPROVED" : "PENDING") as "APPROVED" | "PENDING"
                    }
                  }
                }
              : {};

    const user = await prisma.user.create({
      data: { email: input.email, passwordHash, name: input.name, role: input.role, ...profileData }
    });

    return { id: user.id, email: user.email, name: user.name, role: user.role };
  },

  // Every account on the platform, with just enough profile context to
  // identify who's who in a flat admin table — not the full profile (that's
  // what each domain's own admin-edit endpoint is for).
  async adminListUsers() {
    return prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        creatorProfile: { select: { id: true, handle: true, gateStatus: true } },
        brandProfile: { select: { id: true, companyName: true } },
        developerProfile: { select: { id: true } }
      },
      orderBy: { createdAt: "desc" }
    });
  },

  // What deleting this account would actually touch, across whichever
  // profiles it holds (an admin account can hold all three at once — see
  // adminProfileBundle). Anything with real money attached (an order or
  // Upfront purchase past AGREED) blocks the whole delete and is itemized
  // here; everything else is reported as what cascade would remove.
  async deletePreview(id: string) {
    const user = await prisma.user.findUnique({
      where: { id },
      include: { creatorProfile: true, developerProfile: true, brandProfile: true }
    });
    if (!user) throw new NotFoundError("User");

    const blocked: BlockedItem[] = [];
    const cascade: string[] = [];

    function splitListings(listings: { title: string; purchases: { id: string; status: string; totalKobo: number }[] }[]): number {
      let safe = 0;
      for (const listing of listings) {
        const financial = listing.purchases.filter((p) => purchaseIsFinancial(p.status));
        if (financial.length > 0) financial.forEach((p) => blocked.push(describeBlockedPurchase(p, listing.title)));
        else safe += 1;
      }
      return safe;
    }

    if (user.creatorProfile) {
      const cp = user.creatorProfile;
      const [offers, listings, rateCardItemCount] = await Promise.all([
        prisma.offer.findMany({ where: { creatorId: cp.id }, include: { order: true } }),
        prisma.upfrontListing.findMany({ where: { creatorId: cp.id }, include: { purchases: true } }),
        prisma.rateCardItem.count({ where: { creatorId: cp.id } })
      ]);
      const financialOffers = offers.filter((o) => o.order && orderIsFinancial(o.order.status));
      financialOffers.forEach((o) => blocked.push(describeBlockedOrder(o.order!)));
      const safeOffers = offers.length - financialOffers.length;
      if (safeOffers > 0) cascade.push(`${safeOffers} creator offer(s) with no money moved yet`);
      if (rateCardItemCount > 0) cascade.push(`${rateCardItemCount} rate card item(s)`);
      const safeListings = splitListings(listings);
      if (safeListings > 0) cascade.push(`${safeListings} Upfront listing(s) as creator`);
    }

    if (user.developerProfile) {
      const dp = user.developerProfile;
      const [offers, productCount, requestCount] = await Promise.all([
        prisma.offer.findMany({ where: { developerId: dp.id }, include: { order: true } }),
        prisma.product.count({ where: { developerId: dp.id } }),
        prisma.advertRequest.count({ where: { developerId: dp.id } })
      ]);
      const financialOffers = offers.filter((o) => o.order && orderIsFinancial(o.order.status));
      financialOffers.forEach((o) => blocked.push(describeBlockedOrder(o.order!)));
      const safeOffers = offers.length - financialOffers.length;
      if (safeOffers > 0) cascade.push(`${safeOffers} developer offer(s) with no money moved yet`);
      if (productCount > 0) cascade.push(`${productCount} product(s)`);
      if (requestCount > 0) cascade.push(`${requestCount} request(s)`);
    }

    if (user.brandProfile) {
      const listings = await prisma.upfrontListing.findMany({
        where: { brandId: user.brandProfile.id },
        include: { purchases: true }
      });
      const safeListings = splitListings(listings);
      if (safeListings > 0) cascade.push(`${safeListings} Upfront listing(s) as brand`);
    }

    const myPurchases = await prisma.upfrontPurchase.findMany({ where: { buyerId: id } });
    const financialPurchases = myPurchases.filter((p) => purchaseIsFinancial(p.status));
    financialPurchases.forEach((p) => blocked.push(describeBlockedPurchase(p, "a listing")));
    const safePurchases = myPurchases.length - financialPurchases.length;
    if (safePurchases > 0) cascade.push(`${safePurchases} Upfront purchase(s) as buyer, with no money moved yet`);

    return { cascade, blocked, label: `account ${user.email}` };
  },

  async adminDeleteUser(id: string, requestingAdminId: string) {
    if (id === requestingAdminId) {
      throw new ConflictError("You cannot delete your own admin account");
    }

    const user = await prisma.user.findUnique({
      where: { id },
      include: { creatorProfile: true, developerProfile: true, brandProfile: true }
    });
    if (!user) throw new NotFoundError("User");

    const { blocked } = await authService.deletePreview(id);
    if (blocked.length > 0) throw new ConflictError(blockedDeleteMessage(blocked));

    await prisma.$transaction(async (tx) => {
      // Purely-personal, low-stakes rows get cleaned up rather than
      // blocking the delete on them — a bookmark, a notification, or a
      // question this account asked isn't the kind of activity the
      // financial check above is protecting.
      await tx.savedCreator.deleteMany({ where: { userId: id } });
      await tx.notification.deleteMany({ where: { userId: id } });
      await tx.question.deleteMany({ where: { askerId: id } });
      // Every purchase left at this point is AGREED (deletePreview already
      // blocked on anything past it), so this is a no-money abandoned cart.
      await tx.upfrontPurchase.deleteMany({ where: { buyerId: id } });

      if (user.creatorProfile) {
        const cp = user.creatorProfile;
        const [offers, listings] = await Promise.all([
          tx.offer.findMany({ where: { creatorId: cp.id }, select: { id: true } }),
          tx.upfrontListing.findMany({ where: { creatorId: cp.id }, select: { id: true } })
        ]);
        const offerIds = offers.map((o) => o.id);
        const listingIds = listings.map((l) => l.id);
        await tx.order.deleteMany({ where: { offerId: { in: offerIds } } });
        await tx.offer.deleteMany({ where: { creatorId: cp.id } });
        await tx.rateCardItem.deleteMany({ where: { creatorId: cp.id } });
        await tx.upfrontPurchase.deleteMany({ where: { listingId: { in: listingIds } } });
        await tx.question.deleteMany({ where: { listingId: { in: listingIds } } });
        await tx.upfrontListing.deleteMany({ where: { creatorId: cp.id } });
        await tx.savedCreator.deleteMany({ where: { creatorId: cp.id } });
        await tx.creatorProfile.delete({ where: { id: cp.id } });
      }

      if (user.developerProfile) {
        const dp = user.developerProfile;
        const offers = await tx.offer.findMany({ where: { developerId: dp.id }, select: { id: true } });
        const offerIds = offers.map((o) => o.id);
        await tx.order.deleteMany({ where: { offerId: { in: offerIds } } });
        await tx.offer.deleteMany({ where: { developerId: dp.id } });
        await tx.advertRequest.deleteMany({ where: { developerId: dp.id } });
        await tx.product.deleteMany({ where: { developerId: dp.id } });
        await tx.developerProfile.delete({ where: { id: dp.id } });
      }

      if (user.brandProfile) {
        const bp = user.brandProfile;
        const listings = await tx.upfrontListing.findMany({ where: { brandId: bp.id }, select: { id: true } });
        const listingIds = listings.map((l) => l.id);
        await tx.upfrontPurchase.deleteMany({ where: { listingId: { in: listingIds } } });
        await tx.question.deleteMany({ where: { listingId: { in: listingIds } } });
        await tx.upfrontListing.deleteMany({ where: { brandId: bp.id } });
        await tx.brandProfile.delete({ where: { id: bp.id } });
      }

      await tx.user.delete({ where: { id } });
    });
  }
};
