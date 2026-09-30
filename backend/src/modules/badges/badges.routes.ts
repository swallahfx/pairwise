import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../../common/asyncHandler";
import { requireAuth } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { badgesController } from "./badges.controller";

export const badgesRouter = Router();

badgesRouter.get("/counts", requireAuth, asyncHandler(badgesController.counts));
badgesRouter.post(
  "/mark-viewed",
  requireAuth,
  validate(z.object({ section: z.enum(["requests", "upfront", "creators"]) })),
  asyncHandler(badgesController.markViewed)
);
