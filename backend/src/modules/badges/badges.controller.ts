import { Request, Response } from "express";
import { badgesService } from "./badges.service";

export const badgesController = {
  async counts(req: Request, res: Response) {
    const counts = await badgesService.counts(req.auth!.userId, req.auth!.role);
    res.json(counts);
  },

  async markViewed(req: Request, res: Response) {
    await badgesService.markViewed(req.auth!.userId, req.body.section);
    res.status(204).send();
  }
};
