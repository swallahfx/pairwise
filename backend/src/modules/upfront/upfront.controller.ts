import { Request, Response } from "express";
import { upfrontService } from "./upfront.service";

function listerTypeOf(role: string): "CREATOR" | "BRAND" {
  return role === "BRAND" ? "BRAND" : "CREATOR";
}

export const upfrontController = {
  async listApproved(req: Request, res: Response) {
    const listings = await upfrontService.listApproved(req.query.niche as string | undefined);
    res.json(listings);
  },

  async getPublicListing(req: Request, res: Response) {
    const listing = await upfrontService.getPublicListing(req.params.id);
    res.json(listing);
  },

  async listMine(req: Request, res: Response) {
    const listings = await upfrontService.listMine(req.auth!.userId, listerTypeOf(req.auth!.role));
    res.json(listings);
  },

  async createListing(req: Request, res: Response) {
    const listing = await upfrontService.createListing(req.auth!.userId, listerTypeOf(req.auth!.role), req.body);
    res.status(201).json(listing);
  },

  async listPendingForReview(_req: Request, res: Response) {
    const listings = await upfrontService.listPendingForReview();
    res.json(listings);
  },

  async approveListing(req: Request, res: Response) {
    const listing = await upfrontService.reviewListing(req.params.id, "APPROVED");
    res.json(listing);
  },

  async rejectListing(req: Request, res: Response) {
    const listing = await upfrontService.reviewListing(req.params.id, "REJECTED");
    res.json(listing);
  },

  async buySlot(req: Request, res: Response) {
    const purchase = await upfrontService.buySlot(req.params.id, req.auth!.userId);
    res.status(201).json(purchase);
  },

  async getPurchase(req: Request, res: Response) {
    const purchase = await upfrontService.getPurchase(req.params.id);
    res.json(purchase);
  },

  async listMyPurchases(req: Request, res: Response) {
    const purchases = await upfrontService.listMyPurchases(req.auth!.userId);
    res.json(purchases);
  },

  async fundPurchase(req: Request, res: Response) {
    const result = await upfrontService.fundPurchase(req.params.id, req.auth!.userId);
    res.json(result);
  },

  async approvePurchase(req: Request, res: Response) {
    const purchase = await upfrontService.approvePurchase(req.params.id, req.auth!.userId);
    res.json(purchase);
  },

  async leaveReview(req: Request, res: Response) {
    const review = await upfrontService.leaveReview(req.params.id, req.auth!.userId, req.body);
    res.status(201).json(review);
  },

  async adminListAllListings(_req: Request, res: Response) {
    const listings = await upfrontService.adminListAllListings();
    res.json(listings);
  },

  async adminListAllPurchases(_req: Request, res: Response) {
    const purchases = await upfrontService.adminListAllPurchases();
    res.json(purchases);
  },

  async adminUpdateListing(req: Request, res: Response) {
    const listing = await upfrontService.adminUpdateListing(req.params.id, req.body);
    res.json(listing);
  },

  async adminDeleteListing(req: Request, res: Response) {
    await upfrontService.adminDeleteListing(req.params.id);
    res.status(204).send();
  },

  async adminDisputePurchase(req: Request, res: Response) {
    const purchase = await upfrontService.adminDispute(req.params.id);
    res.json(purchase);
  },

  async adminRefundPurchase(req: Request, res: Response) {
    const purchase = await upfrontService.adminRefund(req.params.id);
    res.json(purchase);
  }
};
