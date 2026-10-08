import crypto from "crypto";
import { env } from "../../config/env";

const PAYSTACK_BASE = "https://api.paystack.co";

interface PaystackResponse<T> {
  status: boolean;
  message: string;
  data: T;
}

// Everything that talks to Paystack lives behind this service. Orders
// never call Paystack directly — they call paymentsService, which means
// swapping providers again later touches one file, not every module that
// happens to move money. Paystack's API is plain REST/JSON, so this is a
// thin fetch wrapper rather than a vendor SDK.
async function paystackRequest<T>(method: "GET" | "POST", path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${PAYSTACK_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${env.paystackSecretKey}`,
      "Content-Type": "application/json"
    },
    body: body ? JSON.stringify(body) : undefined
  });

  const json = (await res.json()) as PaystackResponse<T>;
  if (!res.ok || !json.status) {
    throw new Error(json.message || `Paystack request failed: ${res.status}`);
  }
  return json.data;
}

export const paymentsService = {
  // Funding step: opens a transaction on Paystack's hosted payment page.
  // The full order amount (in kobo) is collected into the PLATFORM's
  // Paystack balance — not sent to the creator directly — so funds are
  // held under the platform's control until an explicit release. See
  // orders.service for the release step.
  async initializeTransaction(
    totalKobo: number,
    email: string,
    reference: string,
    callbackUrl: string,
    metadata: Record<string, string>
  ) {
    return paystackRequest<{ authorization_url: string; access_code: string; reference: string }>(
      "POST",
      "/transaction/initialize",
      { amount: totalKobo, email, reference, callback_url: callbackUrl, metadata }
    );
  },

  async verifyTransaction(reference: string) {
    return paystackRequest<{ status: string; amount: number; reference: string; metadata: Record<string, string> }>(
      "GET",
      `/transaction/verify/${encodeURIComponent(reference)}`
    );
  },

  // Bank list for the creator payout-setup dropdown — never hand the
  // secret key to the frontend, so this is proxied through our own API.
  async listBanks() {
    return paystackRequest<{ name: string; code: string; slug: string }[]>(
      "GET",
      "/bank?currency=NGN&country=nigeria"
    );
  },

  // Confirms a bank account actually belongs to a real, named holder
  // before we save it — the creator sees the resolved name and confirms
  // it matches them before anything is persisted.
  async resolveAccountNumber(accountNumber: string, bankCode: string) {
    return paystackRequest<{ account_number: string; account_name: string }>(
      "GET",
      `/bank/resolve?account_number=${encodeURIComponent(accountNumber)}&bank_code=${encodeURIComponent(bankCode)}`
    );
  },

  // Registers a creator's bank account as a Paystack transfer recipient —
  // this replaces Stripe Connect's hosted onboarding entirely. Payouts
  // only need this recipient_code, not a repeated KYC flow.
  async createTransferRecipient(name: string, accountNumber: string, bankCode: string) {
    return paystackRequest<{ recipient_code: string }>("POST", "/transferrecipient", {
      type: "nuban",
      name,
      account_number: accountNumber,
      bank_code: bankCode,
      currency: "NGN"
    });
  },

  // Release step: moves the creator's share out of the platform's Paystack
  // balance to their registered recipient. Called only from orders.service,
  // only on approval or auto-approval — never directly from a controller.
  async transferToCreator(amountKobo: number, recipientCode: string, reason: string) {
    return paystackRequest<{ transfer_code: string; status: string; reference: string }>("POST", "/transfer", {
      source: "balance",
      amount: amountKobo,
      recipient: recipientCode,
      reason
    });
  },

  // The fallback switch: Paystack doesn't expose any "is this account
  // activated" endpoint, so there's no reliable way to probe readiness
  // ahead of time. A live key only ever gets configured once the team has
  // confirmed collection AND payout both actually work end-to-end on
  // Paystack — so the key prefix itself doubles as that manual gate,
  // without a separate flag to keep in sync.
  isLiveMode(): boolean {
    return env.paystackSecretKey.startsWith("sk_live_");
  },

  computeFee(priceKobo: number) {
    const platformFeeKobo = Math.round((priceKobo * env.platformFeeBps) / 10000);
    return { platformFeeKobo, totalKobo: priceKobo + platformFeeKobo };
  },

  // Paystack signs webhooks with an HMAC-SHA512 of the raw body, keyed by
  // your own secret key — unlike Stripe there's no separate webhook secret
  // to configure.
  verifyWebhookSignature(rawBody: Buffer, signature: string): boolean {
    const hash = crypto.createHmac("sha512", env.paystackSecretKey).update(rawBody).digest("hex");
    return hash === signature;
  }
};
