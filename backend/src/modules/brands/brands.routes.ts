import { Router } from "express";
import { asyncHandler } from "../../common/asyncHandler";
import { requireAuth, requireRole } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { brandsController } from "./brands.controller";
import { adminUpdateBrandSchema, updateBrandProfileSchema } from "./brands.schema";

export const brandsRouter = Router();

brandsRouter.get("/me", requireAuth, requireRole("BRAND"), asyncHandler(brandsController.getMyProfile));
brandsRouter.put(
  "/me",
  requireAuth,
  requireRole("BRAND"),
  validate(updateBrandProfileSchema),
  asyncHandler(brandsController.updateMyProfile)
);

brandsRouter.get("/admin/all", requireAuth, requireRole("ADMIN"), asyncHandler(brandsController.adminListAll));
brandsRouter.patch(
  "/admin/:id",
  requireAuth,
  requireRole("ADMIN"),
  validate(adminUpdateBrandSchema),
  asyncHandler(brandsController.adminUpdate)
);
brandsRouter.get(
  "/admin/:id/delete-preview",
  requireAuth,
  requireRole("ADMIN"),
  asyncHandler(brandsController.adminDeletePreview)
);
brandsRouter.delete("/admin/:id", requireAuth, requireRole("ADMIN"), asyncHandler(brandsController.adminDelete));
