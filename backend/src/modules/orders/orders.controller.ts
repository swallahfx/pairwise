import { Request, Response } from "express";
import { ForbiddenError } from "../../common/errors";
import { ordersService } from "./orders.service";

export const ordersController = {
  async getById(req: Request, res: Response) {
    const order = await ordersService.getById(req.params.id);
    res.json(order);
  },
  async listMine(req: Request, res: Response) {
    const role = req.auth!.role;
    if (role !== "DEVELOPER" && role !== "CREATOR") {
      throw new ForbiddenError("Only developer and creator accounts have orders");
    }
    const orders = await ordersService.listMine(req.auth!.userId, role);
    res.json(orders);
  },
  async fund(req: Request, res: Response) {
    const result = await ordersService.fund(req.params.id, req.auth!.userId);
    res.json(result);
  },
  async start(req: Request, res: Response) {
    const order = await ordersService.markInProgress(req.params.id, req.auth!.userId);
    res.json(order);
  },
  async submit(req: Request, res: Response) {
    const order = await ordersService.submit(req.params.id, req.auth!.userId);
    res.json(order);
  },
  async requestRevision(req: Request, res: Response) {
    const order = await ordersService.requestRevision(req.params.id, req.auth!.userId);
    res.json(order);
  },
  async approve(req: Request, res: Response) {
    const order = await ordersService.approve(req.params.id, req.auth!.userId);
    res.json(order);
  },
  async adminListAll(_req: Request, res: Response) {
    const orders = await ordersService.adminListAll();
    res.json(orders);
  },
  async adminDispute(req: Request, res: Response) {
    const order = await ordersService.adminDispute(req.params.id);
    res.json(order);
  },
  async adminRefund(req: Request, res: Response) {
    const order = await ordersService.adminRefund(req.params.id);
    res.json(order);
  }
};
