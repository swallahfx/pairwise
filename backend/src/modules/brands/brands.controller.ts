import { Request, Response } from "express";
import { brandsService } from "./brands.service";

export const brandsController = {
  async getMyProfile(req: Request, res: Response) {
    const brand = await brandsService.getMyProfile(req.auth!.userId);
    res.json(brand);
  },

  async updateMyProfile(req: Request, res: Response) {
    const updated = await brandsService.updateProfile(req.auth!.userId, req.body);
    res.json(updated);
  },

  async adminListAll(_req: Request, res: Response) {
    const brands = await brandsService.adminListAll();
    res.json(brands);
  },

  async adminUpdate(req: Request, res: Response) {
    const brand = await brandsService.adminUpdate(req.params.id, req.body);
    res.json(brand);
  },

  async adminDeletePreview(req: Request, res: Response) {
    const preview = await brandsService.deletePreview(req.params.id);
    res.json(preview);
  },

  async adminDelete(req: Request, res: Response) {
    await brandsService.adminDelete(req.params.id);
    res.status(204).send();
  }
};
