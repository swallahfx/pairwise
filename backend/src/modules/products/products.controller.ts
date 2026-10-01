import { Request, Response } from "express";
import { productsService } from "./products.service";
import { prisma } from "../../config/db";

export const productsController = {
  async create(req: Request, res: Response) {
    const developer = await prisma.developerProfile.findUnique({ where: { userId: req.auth!.userId } });
    const product = await productsService.create(developer!.id, req.body);
    res.status(201).json(product);
  },
  async list(req: Request, res: Response) {
    const products = await productsService.list(req.query.niche as string | undefined);
    res.json(products);
  },
  async getById(req: Request, res: Response) {
    const product = await productsService.getById(req.params.id);
    res.json(product);
  },
  async adminUpdate(req: Request, res: Response) {
    const product = await productsService.adminUpdate(req.params.id, req.body);
    res.json(product);
  },
  async adminDeletePreview(req: Request, res: Response) {
    const preview = await productsService.deletePreview(req.params.id);
    res.json(preview);
  },
  async adminDelete(req: Request, res: Response) {
    await productsService.adminDelete(req.params.id);
    res.status(204).send();
  }
};
