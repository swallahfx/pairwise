import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import { prisma } from "../../config/db";
import { env } from "../../config/env";
import { ConflictError, NotFoundError, UnauthorizedError } from "../../common/errors";
import { AdminCreateUserInput, GoogleAuthInput, LoginInput, RegisterInput } from "./auth.schema";

const googleClient = new OAuth2Client(env.googleClientId);

// Both the password path and the Google path create the same shape of
// profile row — kept in one place so a new signup always gets exactly the
// eligibility-gated creator profile or empty developer profile it needs,
// regardless of which path created the account.
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
    const profileData =
      input.role === "DEVELOPER"
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

  // Every profile relation is ON DELETE RESTRICT, so Prisma won't even let
  // a user with an empty, freshly-created profile be deleted until that
  // profile row is gone too — and the profile itself is RESTRICT-guarded by
  // its own children (rate cards, offers, listings, products...). Rather
  // than blindly cascading through that whole graph (which could silently
  // wipe out real orders/offers), this only ever removes a user that has
  // zero downstream activity: it deletes the one profile row itself, then
  // the user, and refuses with a specific reason the moment anything real
  // is attached — the admin has to clean that up in its own domain first.
  async adminDeleteUser(id: string, requestingAdminId: string) {
    if (id === requestingAdminId) {
      throw new ConflictError("You cannot delete your own admin account");
    }

    const user = await prisma.user.findUnique({
      where: { id },
      include: { creatorProfile: true, developerProfile: true, brandProfile: true }
    });
    if (!user) throw new NotFoundError("User");

    const purchaseCount = await prisma.upfrontPurchase.count({ where: { buyerId: id } });
    if (purchaseCount > 0) {
      throw new ConflictError("This account has Upfront purchase history and can't be deleted");
    }

    if (user.creatorProfile) {
      const cp = user.creatorProfile;
      const [offers, listings, reviews, rateCardItems] = await Promise.all([
        prisma.offer.count({ where: { creatorId: cp.id } }),
        prisma.upfrontListing.count({ where: { creatorId: cp.id } }),
        prisma.review.count({ where: { creatorId: cp.id } }),
        prisma.rateCardItem.count({ where: { creatorId: cp.id } })
      ]);
      if (offers > 0 || listings > 0 || reviews > 0 || rateCardItems > 0) {
        throw new ConflictError(
          "This creator has rate cards, offers, Upfront listings, or reviews — remove those first"
        );
      }
    }
    if (user.developerProfile) {
      const dp = user.developerProfile;
      const [products, requests, offers, reviewsGiven] = await Promise.all([
        prisma.product.count({ where: { developerId: dp.id } }),
        prisma.advertRequest.count({ where: { developerId: dp.id } }),
        prisma.offer.count({ where: { developerId: dp.id } }),
        prisma.review.count({ where: { developerId: dp.id } })
      ]);
      if (products > 0 || requests > 0 || offers > 0 || reviewsGiven > 0) {
        throw new ConflictError("This developer has products, requests, offers, or reviews — remove those first");
      }
    }
    if (user.brandProfile) {
      const listings = await prisma.upfrontListing.count({ where: { brandId: user.brandProfile.id } });
      if (listings > 0) {
        throw new ConflictError("This brand has Upfront listings — remove those first");
      }
    }
    const upfrontReviewsLeft = await prisma.upfrontReview.count({ where: { buyerId: id } });
    if (upfrontReviewsLeft > 0) {
      throw new ConflictError("This account has left Upfront reviews and can't be deleted");
    }

    await prisma.$transaction(async (tx) => {
      // Purely-personal, low-stakes rows get cleaned up rather than
      // blocking the delete on them — a bookmark, a notification, or a
      // question this account asked isn't the kind of activity history
      // the checks above are protecting.
      await tx.savedCreator.deleteMany({ where: { userId: id } });
      await tx.notification.deleteMany({ where: { userId: id } });
      await tx.question.deleteMany({ where: { askerId: id } });
      if (user.creatorProfile) {
        await tx.savedCreator.deleteMany({ where: { creatorId: user.creatorProfile.id } });
        await tx.creatorProfile.delete({ where: { id: user.creatorProfile.id } });
      }
      if (user.developerProfile) await tx.developerProfile.delete({ where: { id: user.developerProfile.id } });
      if (user.brandProfile) await tx.brandProfile.delete({ where: { id: user.brandProfile.id } });
      await tx.user.delete({ where: { id } });
    });
  }
};
