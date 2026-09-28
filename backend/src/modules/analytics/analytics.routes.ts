import { Router } from "express";
import { asyncHandler } from "../../common/asyncHandler";
import { requireAuth, requireRole } from "../../middleware/auth";
import { analyticsController } from "./analytics.controller";

export const analyticsRouter = Router();

analyticsRouter.get(
  "/summary",
  requireAuth,
  requireRole("ADMIN"),
  asyncHandler(analyticsController.summary)
);
