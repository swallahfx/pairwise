import { Request, Response } from "express";
import { notificationsService } from "./notifications.service";

export const notificationsController = {
  async listMine(req: Request, res: Response) {
    const [notifications, unreadCount] = await Promise.all([
      notificationsService.listMine(req.auth!.userId),
      notificationsService.unreadCount(req.auth!.userId)
    ]);
    res.json({ notifications, unreadCount });
  },

  async markRead(req: Request, res: Response) {
    await notificationsService.markRead(req.params.id, req.auth!.userId);
    res.status(204).send();
  },

  async markAllRead(req: Request, res: Response) {
    await notificationsService.markAllRead(req.auth!.userId);
    res.status(204).send();
  }
};
