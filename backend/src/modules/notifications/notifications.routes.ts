import { Router } from "express";
import { asyncHandler } from "../../common/asyncHandler";
import { requireAuth } from "../../middleware/auth";
import { notificationsController } from "./notifications.controller";

export const notificationsRouter = Router();

notificationsRouter.get("/mine", requireAuth, asyncHandler(notificationsController.listMine));
notificationsRouter.post("/:id/read", requireAuth, asyncHandler(notificationsController.markRead));
notificationsRouter.post("/read-all", requireAuth, asyncHandler(notificationsController.markAllRead));
