import { Router } from "express";
import { asyncHandler } from "../../common/asyncHandler";
import { optionalAuth, requireAuth, requireRole } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { creatorsController } from "./creators.controller";
import { adminUpdateCreatorSchema, updateCreatorProfileSchema } from "./creators.schema";

export const creatorsRouter = Router();

creatorsRouter.get("/", optionalAuth, asyncHandler(creatorsController.listDirectory));
creatorsRouter.get("/me", requireAuth, requireRole("CREATOR"), asyncHandler(creatorsController.getMyProfile));
creatorsRouter.put(
  "/me",
  requireAuth,
  requireRole("CREATOR"),
  validate(updateCreatorProfileSchema),
  asyncHandler(creatorsController.updateMyProfile)
);
creatorsRouter.get("/saved/mine", requireAuth, asyncHandler(creatorsController.listSaved));
creatorsRouter.post("/:id/save", requireAuth, asyncHandler(creatorsController.save));
creatorsRouter.delete("/:id/save", requireAuth, asyncHandler(creatorsController.unsave));
creatorsRouter.get("/:id", optionalAuth, asyncHandler(creatorsController.getProfile));

creatorsRouter.get(
  "/admin/pending",
  requireAuth,
  requireRole("ADMIN"),
  asyncHandler(creatorsController.listPendingForReview)
);
creatorsRouter.get("/admin/all", requireAuth, requireRole("ADMIN"), asyncHandler(creatorsController.adminListAll));
creatorsRouter.post(
  "/admin/:id/approve",
  requireAuth,
  requireRole("ADMIN"),
  asyncHandler(creatorsController.approve)
);
creatorsRouter.post(
  "/admin/:id/reject",
  requireAuth,
  requireRole("ADMIN"),
  asyncHandler(creatorsController.reject)
);
creatorsRouter.patch(
  "/admin/:id",
  requireAuth,
  requireRole("ADMIN"),
  validate(adminUpdateCreatorSchema),
  asyncHandler(creatorsController.adminUpdate)
);
creatorsRouter.delete(
  "/admin/:id",
  requireAuth,
  requireRole("ADMIN"),
  asyncHandler(creatorsController.adminDelete)
);
