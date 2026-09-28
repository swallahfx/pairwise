import { Request, Response } from "express";
import { reviewsService } from "./reviews.service";

export const reviewsController = {
  async create(req: Request, res: Response) {
    const review = await reviewsService.create(req.auth!.userId, req.params.orderId, req.body);
    res.status(201).json(review);
  },

  async listForCreator(req: Request, res: Response) {
    const [reviews, stats] = await Promise.all([
      reviewsService.listForCreator(req.params.creatorId),
      reviewsService.statsForCreator(req.params.creatorId)
    ]);
    res.json({ reviews, ...stats });
  }
};
