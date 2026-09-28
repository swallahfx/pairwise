import { Request, Response } from "express";
import { analyticsService } from "./analytics.service";

export const analyticsController = {
  async summary(_req: Request, res: Response) {
    const summary = await analyticsService.summary();
    res.json(summary);
  }
};
