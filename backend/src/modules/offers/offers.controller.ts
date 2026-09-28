import { Request, Response } from "express";
import { ForbiddenError } from "../../common/errors";
import { offersService } from "./offers.service";

export const offersController = {
  async bookRateCard(req: Request, res: Response) {
    const result = await offersService.bookRateCard(req.auth!.userId, req.body.rateCardItemId);
    res.status(201).json(result);
  },
  async sendCustomOffer(req: Request, res: Response) {
    const offer = await offersService.sendCustomOffer(req.auth!.userId, req.body);
    res.status(201).json(offer);
  },
  async applyToRequest(req: Request, res: Response) {
    const offer = await offersService.applyToRequest(req.auth!.userId, req.params.requestId, req.body);
    res.status(201).json(offer);
  },
  async listApplicants(req: Request, res: Response) {
    const applicants = await offersService.listApplicants(req.params.requestId);
    res.json(applicants);
  },
  async listMine(req: Request, res: Response) {
    const role = req.auth!.role;
    if (role !== "DEVELOPER" && role !== "CREATOR" && role !== "ADMIN") {
      throw new ForbiddenError("Only developer and creator accounts have offers");
    }
    const offers =
      role === "ADMIN"
        ? await offersService.listMineEitherSide(req.auth!.userId)
        : await offersService.listMine(req.auth!.userId, role);
    res.json(offers);
  },
  async accept(req: Request, res: Response) {
    const result = await offersService.accept(req.params.id, req.auth!.userId);
    res.json(result);
  },
  async decline(req: Request, res: Response) {
    const offer = await offersService.decline(req.params.id, req.auth!.userId);
    res.json(offer);
  }
};
