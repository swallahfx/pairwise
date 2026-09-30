import { Router } from "express";
import { asyncHandler } from "../../common/asyncHandler";
import { requireAuth, requireRole } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { offersController } from "./offers.controller";
import { applyToRequestSchema, sendCustomOfferSchema } from "./offers.schema";
import { z } from "zod";

export const offersRouter = Router();

offersRouter.post(
  "/book-rate-card",
  requireAuth,
  requireRole("DEVELOPER"),
  validate(z.object({ rateCardItemId: z.string().uuid(), requirements: z.string().min(1) })),
  asyncHandler(offersController.bookRateCard)
);

offersRouter.post(
  "/custom",
  requireAuth,
  requireRole("DEVELOPER"),
  validate(sendCustomOfferSchema),
  asyncHandler(offersController.sendCustomOffer)
);

offersRouter.post(
  "/requests/:requestId/apply",
  requireAuth,
  requireRole("CREATOR"),
  validate(applyToRequestSchema),
  asyncHandler(offersController.applyToRequest)
);

offersRouter.get("/requests/:requestId/applicants", requireAuth, asyncHandler(offersController.listApplicants));
offersRouter.get("/mine", requireAuth, asyncHandler(offersController.listMine));

offersRouter.post("/:id/accept", requireAuth, asyncHandler(offersController.accept));
offersRouter.post("/:id/decline", requireAuth, asyncHandler(offersController.decline));
