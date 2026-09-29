import { Router } from "express";
import { asyncHandler } from "../../common/asyncHandler";
import { requireAnyRole, requireAuth, requireRole } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { upfrontController } from "./upfront.controller";
import { adminUpdateListingSchema, createListingSchema, createUpfrontReviewSchema } from "./upfront.schema";

export const upfrontRouter = Router();

upfrontRouter.get("/", asyncHandler(upfrontController.listApproved));
upfrontRouter.get(
  "/mine",
  requireAuth,
  requireAnyRole("CREATOR", "BRAND"),
  asyncHandler(upfrontController.listMine)
);
upfrontRouter.post(
  "/",
  requireAuth,
  requireAnyRole("CREATOR", "BRAND"),
  validate(createListingSchema),
  asyncHandler(upfrontController.createListing)
);
upfrontRouter.get(
  "/mine/sales",
  requireAuth,
  requireAnyRole("CREATOR", "BRAND"),
  asyncHandler(upfrontController.listMySales)
);

upfrontRouter.get("/purchases/mine", requireAuth, asyncHandler(upfrontController.listMyPurchases));
upfrontRouter.get("/purchases/:id", requireAuth, asyncHandler(upfrontController.getPurchase));
upfrontRouter.post("/purchases/:id/fund", requireAuth, asyncHandler(upfrontController.fundPurchase));
upfrontRouter.post("/purchases/:id/approve", requireAuth, asyncHandler(upfrontController.approvePurchase));
upfrontRouter.post(
  "/purchases/:id/review",
  requireAuth,
  validate(createUpfrontReviewSchema),
  asyncHandler(upfrontController.leaveReview)
);

upfrontRouter.get(
  "/admin/pending",
  requireAuth,
  requireRole("ADMIN"),
  asyncHandler(upfrontController.listPendingForReview)
);
upfrontRouter.post(
  "/admin/:id/approve",
  requireAuth,
  requireRole("ADMIN"),
  asyncHandler(upfrontController.approveListing)
);
upfrontRouter.post(
  "/admin/:id/reject",
  requireAuth,
  requireRole("ADMIN"),
  asyncHandler(upfrontController.rejectListing)
);
upfrontRouter.get(
  "/admin/listings",
  requireAuth,
  requireRole("ADMIN"),
  asyncHandler(upfrontController.adminListAllListings)
);
upfrontRouter.patch(
  "/admin/listings/:id",
  requireAuth,
  requireRole("ADMIN"),
  validate(adminUpdateListingSchema),
  asyncHandler(upfrontController.adminUpdateListing)
);
upfrontRouter.delete(
  "/admin/listings/:id",
  requireAuth,
  requireRole("ADMIN"),
  asyncHandler(upfrontController.adminDeleteListing)
);
upfrontRouter.get(
  "/admin/purchases",
  requireAuth,
  requireRole("ADMIN"),
  asyncHandler(upfrontController.adminListAllPurchases)
);
upfrontRouter.post(
  "/admin/purchases/:id/dispute",
  requireAuth,
  requireRole("ADMIN"),
  asyncHandler(upfrontController.adminDisputePurchase)
);
upfrontRouter.post(
  "/admin/purchases/:id/refund",
  requireAuth,
  requireRole("ADMIN"),
  asyncHandler(upfrontController.adminRefundPurchase)
);

upfrontRouter.post("/:id/buy", requireAuth, asyncHandler(upfrontController.buySlot));

// Must stay last — a bare GET "/:id" would otherwise capture "/mine",
// "/admin/pending", etc. registered above it.
upfrontRouter.get("/:id", asyncHandler(upfrontController.getPublicListing));
