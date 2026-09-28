import { Router } from "express";
import { asyncHandler } from "../../common/asyncHandler";
import { requireAnyRole, requireAuth } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { paymentsController } from "./payments.controller";
import { resolveAccountSchema, savePayoutAccountSchema } from "./payments.schema";

export const paymentsRouter = Router();

// The webhook route lives directly on the app in app.ts, mounted before
// express.json() — it needs the raw body, unlike everything here, which
// is why it can't share this router (see app.ts for why).

// Bank list + account resolution proxy the Paystack API so the secret key
// never reaches the frontend.
paymentsRouter.get("/banks", requireAuth, asyncHandler(paymentsController.listBanks));
paymentsRouter.post(
  "/resolve-account",
  requireAuth,
  requireAnyRole("CREATOR", "BRAND"),
  validate(resolveAccountSchema),
  asyncHandler(paymentsController.resolveAccount)
);
paymentsRouter.post(
  "/payout-account",
  requireAuth,
  requireAnyRole("CREATOR", "BRAND"),
  validate(savePayoutAccountSchema),
  asyncHandler(paymentsController.savePayoutAccount)
);

// Called by the browser when Paystack redirects back from the hosted
// payment page — see checkout/[orderId]/callback on the frontend.
paymentsRouter.get("/verify/:reference", requireAuth, asyncHandler(paymentsController.verifyPayment));
