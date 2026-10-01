import { Request, Response } from "express";
import { authService } from "./auth.service";

export const authController = {
  async register(req: Request, res: Response) {
    const result = await authService.register(req.body);
    res.status(201).json(result);
  },

  async login(req: Request, res: Response) {
    const result = await authService.login(req.body);
    res.status(200).json(result);
  },

  async google(req: Request, res: Response) {
    const result = await authService.googleAuth(req.body);
    res.status(200).json(result);
  },

  async adminCreateUser(req: Request, res: Response) {
    const result = await authService.adminCreateUser(req.body);
    res.status(201).json(result);
  },

  async adminListUsers(_req: Request, res: Response) {
    const users = await authService.adminListUsers();
    res.json(users);
  },

  async adminDeleteUserPreview(req: Request, res: Response) {
    const preview = await authService.deletePreview(req.params.id);
    res.json(preview);
  },

  async adminDeleteUser(req: Request, res: Response) {
    await authService.adminDeleteUser(req.params.id, req.auth!.userId);
    res.status(204).send();
  }
};
