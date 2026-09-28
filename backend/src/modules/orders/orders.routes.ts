import { Router } from "express";
import { asyncHandler } from "../../common/asyncHandler";
import { requireAuth, requireRole } from "../../middleware/auth";
import { ordersController } from "./orders.controller";

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
ordersRouter.get("/:id", requireAuth, asyncHandler(ordersController.getById));
ordersRouter.post("/:id/fund", requireAuth, asyncHandler(ordersController.fund));
ordersRouter.post("/:id/start", requireAuth, asyncHandler(ordersController.start));
ordersRouter.post("/:id/submit", requireAuth, asyncHandler(ordersController.submit));
ordersRouter.post("/:id/request-revision", requireAuth, asyncHandler(ordersController.requestRevision));
ordersRouter.post("/:id/approve", requireAuth, asyncHandler(ordersController.approve));
