import { Router } from "express";
import { asyncHandler } from "../../common/asyncHandler";
import { requireAuth, requireRole } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { productsController } from "./products.controller";
import { adminUpdateProductSchema, createProductSchema } from "./products.schema";

export const productsRouter = Router();

productsRouter.get("/", asyncHandler(productsController.list));
productsRouter.post(
  "/",
  requireAuth,
  requireRole("DEVELOPER"),
  validate(createProductSchema),
  asyncHandler(productsController.create)
);
productsRouter.patch(
  "/admin/:id",
  requireAuth,
  requireRole("ADMIN"),
  validate(adminUpdateProductSchema),
  asyncHandler(productsController.adminUpdate)
);
productsRouter.delete(
  "/admin/:id",
  requireAuth,
  requireRole("ADMIN"),
  asyncHandler(productsController.adminDelete)
);
productsRouter.get("/:id", asyncHandler(productsController.getById));
