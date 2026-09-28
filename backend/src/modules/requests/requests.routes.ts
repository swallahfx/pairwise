import { Router } from "express";
import { asyncHandler } from "../../common/asyncHandler";
import { requireAuth, requireRole } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { requestsController } from "./requests.controller";
import { adminUpdateRequestSchema, createRequestSchema } from "./requests.schema";

export const requestsRouter = Router();

requestsRouter.get("/", asyncHandler(requestsController.listOpen));
requestsRouter.get("/mine", requireAuth, requireRole("DEVELOPER"), asyncHandler(requestsController.listMine));
requestsRouter.post(
  "/",
  requireAuth,
  requireRole("DEVELOPER"),
  validate(createRequestSchema),
  asyncHandler(requestsController.create)
);
requestsRouter.patch(
  "/admin/:id",
  requireAuth,
  requireRole("ADMIN"),
  validate(adminUpdateRequestSchema),
  asyncHandler(requestsController.adminUpdate)
);
requestsRouter.delete(
  "/admin/:id",
  requireAuth,
  requireRole("ADMIN"),
  asyncHandler(requestsController.adminDelete)
);
requestsRouter.get(
  "/admin/all",
  requireAuth,
  requireRole("ADMIN"),
  asyncHandler(requestsController.adminListAll)
);
