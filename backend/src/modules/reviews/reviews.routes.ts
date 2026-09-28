import { Router } from "express";
import { asyncHandler } from "../../common/asyncHandler";
import { requireAuth, requireRole } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { reviewsController } from "./reviews.controller";
import { createReviewSchema } from "./reviews.schema";

export const reviewsRouter = Router();

reviewsRouter.post(
  "/orders/:orderId",
  requireAuth,
  requireRole("DEVELOPER"),
  validate(createReviewSchema),
  asyncHandler(reviewsController.create)
);
reviewsRouter.get("/creators/:creatorId", asyncHandler(reviewsController.listForCreator));
