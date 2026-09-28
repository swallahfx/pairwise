import { Request, Response } from "express";
import { prisma } from "../../config/db";
import { paymentsService } from "./payments.service";
import { ordersService } from "../orders/orders.service";
import { upfrontService } from "../upfront/upfront.service";
import { ForbiddenError, NotFoundError } from "../../common/errors";

// Order and Upfront purchase references are prefixed at creation time
// (order_... / upfront_...) specifically so this one webhook/verify
// endpoint can serve both domains without either needing to know about
// the other's existence.
function confirmFundingByReference(reference: string) {
  if (reference.startsWith("upfront_")) return upfrontService.confirmFunding(reference);
  return ordersService.confirmFunding(reference);
}

export const paymentsController = {
  async listBanks(_req: Request, res: Response) {
    const banks = await paymentsService.listBanks();
    res.json(banks);
  },

  async resolveAccount(req: Request, res: Response) {
    const { accountNumber, bankCode } = req.body;
    const resolved = await paymentsService.resolveAccountNumber(accountNumber, bankCode);
    res.json({ accountName: resolved.account_name });
  },

  // Handles both listers that can receive an Upfront payout: a creator
  // (gated the same way rate-card listing is — must be APPROVED) or a
  // brand (no gate to clear, same as listing itself).
  async savePayoutAccount(req: Request, res: Response) {
    const { accountNumber, bankCode } = req.body;
    // Re-resolve server-side rather than trusting whatever name the client
    // displayed — the recipient is created with the name Paystack itself
    // reports for this account, not anything the browser sent.
    const resolved = await paymentsService.resolveAccountNumber(accountNumber, bankCode);
    const recipient = await paymentsService.createTransferRecipient(resolved.account_name, accountNumber, bankCode);
    const payoutFields = {
      bankAccountNumber: accountNumber,
      bankCode,
      bankAccountName: resolved.account_name,
      paystackRecipientCode: recipient.recipient_code
    };

    if (req.auth!.role === "BRAND") {
      const brand = await prisma.brandProfile.findUnique({ where: { userId: req.auth!.userId } });
      if (!brand) throw new NotFoundError("Brand profile");
      const updated = await prisma.brandProfile.update({ where: { id: brand.id }, data: payoutFields });
      return res.json(updated);
    }

    const creator = await prisma.creatorProfile.findUnique({ where: { userId: req.auth!.userId } });
    if (!creator) throw new NotFoundError("Creator profile");
    if (creator.gateStatus !== "APPROVED") {
      throw new ForbiddenError("Your profile needs to be approved before payout setup");
    }
    const updated = await prisma.creatorProfile.update({ where: { id: creator.id }, data: payoutFields });
    res.json(updated);
  },

  // Marks an order FUNDED the moment Paystack confirms the charge actually
  // succeeded — the durable source of truth in production. Always acks
  // 200 so Paystack doesn't retry, even for events we don't care about.
  async webhook(req: Request, res: Response) {
    const signature = req.headers["x-paystack-signature"] as string;
    const rawBody = req.body as Buffer;
    if (!signature || !paymentsService.verifyWebhookSignature(rawBody, signature)) {
      return res.status(401).json({ error: "InvalidSignature" });
    }

    const event = JSON.parse(rawBody.toString("utf8"));
    if (event.event === "charge.success") {
      const reference = event.data.reference as string;
      await confirmFundingByReference(reference).catch((err) => {
        console.error(`Webhook confirmFunding failed for ${reference}:`, err);
      });
    }

    res.json({ received: true });
  },

  // Called by the browser when Paystack redirects back from the hosted
  // payment page — the actual funding confirmation in local/dev runs
  // where Paystack's webhook has no public URL to reach.
  async verifyPayment(req: Request, res: Response) {
    const result = await confirmFundingByReference(req.params.reference);
    res.json(result);
  }
};
