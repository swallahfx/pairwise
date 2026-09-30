import { Request, Response } from "express";
import { creatorsService } from "./creators.service";

export const creatorsController = {
  async listDirectory(req: Request, res: Response) {
    const { niche, sort } = req.query as { niche?: string; sort?: "price_asc" | "price_desc" };
    const creators = await creatorsService.listDirectory(niche, sort, req.auth);
    res.json(creators);
  },

  async getProfile(req: Request, res: Response) {
    const creator = await creatorsService.getPublicProfile(req.params.id, req.auth);
    res.json(creator);
  },

  async getMyProfile(req: Request, res: Response) {
    const creator = await creatorsService.getMyProfile(req.auth!.userId);
    res.json(creator);
  },

  async updateMyProfile(req: Request, res: Response) {
    const updated = await creatorsService.updateProfile(req.auth!.userId, req.body);
    res.json(updated);
  },

  async listPendingForReview(_req: Request, res: Response) {
    const creators = await creatorsService.listPendingForReview();
    res.json(creators);
  },

  async approve(req: Request, res: Response) {
    const creator = await creatorsService.reviewCreator(req.params.id, "APPROVED");
    res.json(creator);
  },

  async reject(req: Request, res: Response) {
    const creator = await creatorsService.reviewCreator(req.params.id, "REJECTED");
    res.json(creator);
  },

  async adminUpdate(req: Request, res: Response) {
    const creator = await creatorsService.adminUpdate(req.params.id, req.body);
    res.json(creator);
  },

  async adminDelete(req: Request, res: Response) {
    await creatorsService.adminDelete(req.params.id);
    res.status(204).send();
  },

  async adminListAll(_req: Request, res: Response) {
    const creators = await creatorsService.adminListAll();
    res.json(creators);
  },

  async save(req: Request, res: Response) {
    await creatorsService.saveCreator(req.auth!.userId, req.params.id);
    res.status(204).send();
  },

  async unsave(req: Request, res: Response) {
    await creatorsService.unsaveCreator(req.auth!.userId, req.params.id);
    res.status(204).send();
  },

  async listSaved(req: Request, res: Response) {
    const saved = await creatorsService.listSaved(req.auth!.userId);
    res.json(saved);
  }
};
