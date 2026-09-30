import { Router } from "express";
import { asyncHandler } from "../../common/asyncHandler";
import { requireAuth, requireRole } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { ordersController } from "./orders.controller";
import { raiseDisputeSchema, respondToDisputeSchema } from "./orders.schema";

export const ordersRouter = Router();

ordersRouter.get("/mine", requireAuth, asyncHandler(ordersController.listMine));
ordersRouter.get("/admin/all", requireAuth, requireRole("ADMIN"), asyncHandler(ordersController.adminListAll));
ordersRouter.post(
  "/admin/:id/dispute",
  requireAuth,
  requireRole("ADMIN"),
  asyncHandler(ordersController.adminDispute)
);
ordersRouter.post(
  "/admin/:id/refund",
  requireAuth,
  requireRole("ADMIN"),
  asyncHandler(ordersController.adminRefund)
);
ordersRouter.post(
  "/admin/:id/release-disputed",
  requireAuth,
  requireRole("ADMIN"),
  asyncHandler(ordersController.adminReleaseDisputed)
);
ordersRouter.get("/:id", requireAuth, asyncHandler(ordersController.getById));
ordersRouter.post("/:id/fund", requireAuth, asyncHandler(ordersController.fund));
ordersRouter.post("/:id/start", requireAuth, asyncHandler(ordersController.start));
ordersRouter.post("/:id/submit", requireAuth, asyncHandler(ordersController.submit));
ordersRouter.post("/:id/request-revision", requireAuth, asyncHandler(ordersController.requestRevision));
ordersRouter.post("/:id/approve", requireAuth, asyncHandler(ordersController.approve));
ordersRouter.post(
  "/:id/dispute",
  requireAuth,
  validate(raiseDisputeSchema),
  asyncHandler(ordersController.raiseDispute)
);
ordersRouter.post(
  "/:id/dispute-response",
  requireAuth,
  validate(respondToDisputeSchema),
  asyncHandler(ordersController.respondToDispute)
);
