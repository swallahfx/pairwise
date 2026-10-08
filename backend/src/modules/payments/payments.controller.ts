import { Request, Response } from "express";
import { prisma } from "../../config/db";
import { env } from "../../config/env";
import { paymentsService } from "./payments.service";
import { bachsService } from "../bachs/bachs.service";
import { ordersService } from "../orders/orders.service";
import { upfrontService } from "../upfront/upfront.service";
import { ForbiddenError, NotFoundError } from "../../common/errors";

// Paystack references keep the order_.../upfront_... prefix we generate,
// but a Bachs-funded record is looked up by Bachs' own checkout_id instead
// (chk_...) — see bachsService.initializeTransaction — which carries no
// such prefix. Rather than parse two different reference shapes, this just
// tries orders first and falls back to upfront on a clean "not found",
// which is correct for both providers and doesn't need to know which one
// produced the reference.
async function confirmFundingByReference(reference: string) {
  try {
    return await ordersService.confirmFunding(reference);
  } catch (err) {
    if (err instanceof NotFoundError) return upfrontService.confirmFunding(reference);
    throw err;
  }
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
    const payoutFields: Record<string, unknown> = {
      bankAccountNumber: accountNumber,
      bankCode,
      bankAccountName: resolved.account_name,
      paystackRecipientCode: recipient.recipient_code
    };

    // Set up the Bachs recipient too, alongside Paystack's — this isn't a
    // separate step for the creator/brand, just a second provider's
    // recipient record created behind the same Save click, so whichever
    // provider is active when they actually get paid already has them set
    // up. Best-effort: an environment with no Bachs account configured yet
    // shouldn't block saving Paystack details, which may be the only
    // provider actually in use.
    if (env.bachsSecretKey) {
      const user = await prisma.user.findUnique({ where: { id: req.auth!.userId }, select: { email: true } });
      const bachsAccountId = await bachsService.ensureRecipientAccount(
        user!.email,
        resolved.account_name,
        resolved.account_name,
        accountNumber,
        bankCode
      );
      payoutFields.bachsAccountId = bachsAccountId;
    }

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
  },

  // Bachs' counterpart to webhook() above — separate route, separate
  // signature scheme (a per-endpoint secret from the dashboard, verified
  // via X-Bachs-Signature-V2, not derived from the API key like Paystack's).
  async bachsWebhook(req: Request, res: Response) {
    const signature = req.headers["x-bachs-signature-v2"] as string;
    const rawBody = req.body as Buffer;
    if (!signature || !bachsService.verifyWebhookSignature(rawBody, signature)) {
      return res.status(401).json({ error: "InvalidSignature" });
    }

    const event = JSON.parse(rawBody.toString("utf8"));
    if (event.type === "collection.succeeded" || event.type === "checkout.completed") {
      // Confirmed against a real webhook delivery: data.reference carries
      // the reference string *we* sent at checkout-session creation, not
      // what's actually stored as paystackReference — that's
      // data.checkout_id (see bachsService.initializeTransaction).
      const reference = event.data.checkout_id as string;
      await confirmFundingByReference(reference).catch((err) => {
        console.error(`Bachs webhook confirmFunding failed for ${reference}:`, err);
      });
    }

    res.json({ received: true });
  }
};
