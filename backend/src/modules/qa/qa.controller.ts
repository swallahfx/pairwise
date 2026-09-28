import { Request, Response } from "express";
import { qaService } from "./qa.service";

export const qaController = {
  async ask(req: Request, res: Response) {
    const question = await qaService.ask(req.auth!.userId, req.body);
    res.status(201).json(question);
  },

  async listForTarget(req: Request, res: Response) {
    const { targetType, targetId } = req.query as { targetType: "CREATOR" | "UPFRONT_LISTING"; targetId: string };
    const questions = await qaService.listForTarget(targetType, targetId);
    res.json(questions);
  },

  async answer(req: Request, res: Response) {
    const question = await qaService.answer(req.params.id, req.auth!.userId, req.body);
    res.json(question);
  }
};
