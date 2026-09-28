import { Router } from "express";
import { asyncHandler } from "../../common/asyncHandler";
import { requireAuth, requireRole } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { rateCardsController } from "./rateCards.controller";
import { createRateCardItemSchema } from "./rateCards.schema";

export const rateCardsRouter = Router();

rateCardsRouter.post(
  "/",
  requireAuth,
  requireRole("CREATOR"),
  validate(createRateCardItemSchema),
  asyncHandler(rateCardsController.addItem)
);
rateCardsRouter.delete(
  "/:itemId",
  requireAuth,
  requireRole("CREATOR"),
  asyncHandler(rateCardsController.removeItem)
);
