import { Request, Response } from "express";
import { rateCardsService } from "./rateCards.service";

export const rateCardsController = {
  async addItem(req: Request, res: Response) {
    const item = await rateCardsService.addItem(req.auth!.userId, req.body);
    res.status(201).json(item);
  },
  async removeItem(req: Request, res: Response) {
    await rateCardsService.removeItem(req.auth!.userId, req.params.itemId);
    res.status(204).send();
  }
};
