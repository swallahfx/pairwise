import { Router } from "express";
import { asyncHandler } from "../../common/asyncHandler";
import { requireAuth, requireRole } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { authController } from "./auth.controller";
import { adminCreateUserSchema, googleAuthSchema, loginSchema, registerSchema } from "./auth.schema";

export const authRouter = Router();

authRouter.post("/register", validate(registerSchema), asyncHandler(authController.register));
authRouter.post("/login", validate(loginSchema), asyncHandler(authController.login));
authRouter.post("/google", validate(googleAuthSchema), asyncHandler(authController.google));
authRouter.post(
  "/admin/create-user",
  requireAuth,
  requireRole("ADMIN"),
  validate(adminCreateUserSchema),
  asyncHandler(authController.adminCreateUser)
);
authRouter.get("/admin/users", requireAuth, requireRole("ADMIN"), asyncHandler(authController.adminListUsers));
authRouter.delete(
  "/admin/users/:id",
  requireAuth,
  requireRole("ADMIN"),
  asyncHandler(authController.adminDeleteUser)
);
