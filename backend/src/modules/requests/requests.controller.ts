import { Request, Response } from "express";
import { prisma } from "../../config/db";
import { requestsService } from "./requests.service";

export const requestsController = {
  async create(req: Request, res: Response) {
    const developer = await prisma.developerProfile.findUnique({ where: { userId: req.auth!.userId } });
    const created = await requestsService.create(developer!.id, req.body);
    res.status(201).json(created);
  },
  async listOpen(req: Request, res: Response) {
    const requests = await requestsService.listOpen(req.query.niche as string | undefined);
    res.json(requests);
  },
  async listMine(req: Request, res: Response) {
    const requests = await requestsService.listMine(req.auth!.userId);
    res.json(requests);
  },
  async adminUpdate(req: Request, res: Response) {
    const request = await requestsService.adminUpdate(req.params.id, req.body);
    res.json(request);
  },
  async adminDeletePreview(req: Request, res: Response) {
    const preview = await requestsService.deletePreview(req.params.id);
    res.json(preview);
  },
  async adminDelete(req: Request, res: Response) {
    await requestsService.adminDelete(req.params.id);
    res.status(204).send();
  },
  async adminListAll(_req: Request, res: Response) {
    const requests = await requestsService.adminListAll();
    res.json(requests);
  }
};
