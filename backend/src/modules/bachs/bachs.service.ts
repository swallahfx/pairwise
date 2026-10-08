import crypto from "crypto";
import { env } from "../../config/env";

// Sandbox and production live at different hosts entirely (unlike
// Paystack, which uses one base URL for both test and live keys) — the
// key prefix picks which one every request goes to.
function baseUrl(): string {
  return env.bachsSecretKey.startsWith("sk_live_") ? "https://api.bachs.io" : "https://sandbox-api.bachs.io";
}

async function bachsRequest<T>(method: "GET" | "POST", path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${baseUrl()}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${env.bachsSecretKey}`,
      "Content-Type": "application/json"
    },
    body: body ? JSON.stringify(body) : undefined
  });

  const json = (await res.json()) as { detail?: string; message?: string };
  if (!res.ok) {
    throw new Error(json.detail || json.message || `Bachs request failed: ${res.status}`);
  }
  return json as T;
}

// Bachs amounts are decimal strings at the currency's precision ("29.00"),
// never minor units — the rest of this app stores everything in kobo
// integers, so every call through this service converts at the boundary.
function koboToAmount(kobo: number): string {
  return (kobo / 100).toFixed(2);
}

function amountToKobo(amount: string): number {
  return Math.round(parseFloat(amount) * 100);
}

interface BachsAccount {
  id: string;
  requirements: { currently_due: string[] };
}

interface BachsPerson {
  id: string;
}

// The fallback processor while Paystack's business compliance is pending —
// see paymentsService.isLiveMode for how the two get picked between.
// Mirrors payments.service.ts's shape so orders.service/upfront.service can
// call either one behind the same call sites.
export const bachsService = {
  // Funding step: opens a checkout session on Bachs' hosted page. Mirrors
  // paymentsService.initializeTransaction's return shape (authorization_url)
  // so callers don't need to branch on field names, only on which service
  // to call. Bachs rejects localhost success/cancel URLs even in sandbox —
  // callbackUrl has to be publicly reachable.
  async initializeTransaction(
    totalKobo: number,
    email: string,
    reference: string,
    callbackUrl: string,
    metadata: Record<string, string>
  ) {
    const session = await bachsRequest<{ checkout_id: string; checkout_url: string }>(
      "POST",
      "/v1/checkout-sessions",
      {
        pricing: { currency: "NGN", amount: koboToAmount(totalKobo) },
        customer: { email },
        success_url: callbackUrl,
        cancel_url: callbackUrl,
        reference,
        metadata
      }
    );
    // The stored "reference" has to be something we can look this session
    // back up by later — Bachs' own checkout_id, not the reference string
    // we sent (there's no reliable lookup-by-reference endpoint), so that's
    // what gets persisted as paystackReference regardless of provider.
    return { authorization_url: session.checkout_url, reference: session.checkout_id };
  },

  async verifyTransaction(checkoutId: string) {
    const session = await bachsRequest<{
      status: string;
      payment_status: string;
      amount: string;
      currency: string;
      reference: string;
      metadata: Record<string, string>;
    }>("GET", `/v1/checkout-sessions/${encodeURIComponent(checkoutId)}`);
    return {
      // Confirmed against a real sandbox payment: the field reports
      // "succeeded", not the "paid" this app's own webhook-handling guide
      // text implied — verified live rather than trusted from docs.
      status: session.payment_status === "succeeded" ? "success" : session.payment_status,
      amount: amountToKobo(session.amount),
      reference: session.reference,
      metadata: session.metadata
    };
  },

  async resolveAccountNumber(accountNumber: string, bankCode: string) {
    const resolved = await bachsRequest<{ resolved: boolean; account_name: string | null; message: string }>(
      "POST",
      "/v1/misc/bank-accounts/resolve",
      { account_number: accountNumber, bank_code: bankCode }
    );
    if (!resolved.resolved || !resolved.account_name) {
      throw new Error(resolved.message || "Could not resolve this account number");
    }
    return { account_number: accountNumber, account_name: resolved.account_name };
  },

  // Sets up a creator/brand to receive payouts: a recipient-persona Connect
  // account, their name, and their bank account as the payout destination —
  // the Bachs equivalent of paymentsService.createTransferRecipient, just
  // split into three calls instead of one. Called once, alongside the
  // Paystack recipient, whenever payout details are saved (see
  // payments.controller.savePayoutAccount) — not a separate step the
  // creator ever sees.
  async ensureRecipientAccount(
    email: string,
    displayName: string,
    accountName: string,
    accountNumber: string,
    bankCode: string
  ) {
    const account = await bachsRequest<BachsAccount>("POST", "/v1/accounts", {
      contact_email: email,
      display_name: displayName,
      country: "NG",
      entity_type: "individual",
      configuration: {
        recipient: { capabilities: { transfers: { requested: true }, payouts: { requested: true } } }
      }
    });

    const [firstName, ...rest] = accountName.trim().split(/\s+/);
    const person = await bachsRequest<BachsPerson>("POST", `/v1/accounts/${account.id}/persons`, {});
    await bachsRequest("POST", `/v1/accounts/${account.id}/persons/${person.id}`, {
      first_name: firstName,
      last_name: rest.join(" ") || firstName
    });

    await bachsRequest("POST", `/v1/accounts/${account.id}`, {
      fields: {
        payout_destination: {
          type: "bank_account",
          account_number: accountNumber,
          account_name: accountName,
          bank_code: bankCode,
          currency: "NGN"
        }
      }
    });

    return account.id;
  },

  // Release step: moves the creator's share from the platform's Bachs
  // balance to their connected account. transferGroup ties it back to the
  // order/purchase for reconciliation — Bachs doesn't record that link
  // itself.
  async transferToCreator(amountKobo: number, accountId: string, reason: string, transferGroup: string) {
    const transfer = await bachsRequest<{ id: string; status: string }>("POST", "/v1/transfers", {
      destination: accountId,
      amount: koboToAmount(amountKobo),
      currency: "NGN",
      description: reason,
      transfer_group: transferGroup
    });
    return { transfer_code: transfer.id, status: transfer.status, reference: transfer.id };
  },

  computeFee(priceKobo: number) {
    const platformFeeKobo = Math.round((priceKobo * env.platformFeeBps) / 10000);
    return { platformFeeKobo, totalKobo: priceKobo + platformFeeKobo };
  },

  // Bachs signs with HMAC-SHA256 over "{timestamp}.{raw_body}", using a
  // per-endpoint secret from the dashboard (not derived from the API key,
  // unlike Paystack) — the header carries "t={timestamp},v1={signature}",
  // and a signature outside a 300s window is rejected as a replay.
  verifyWebhookSignature(rawBody: Buffer, signatureHeader: string): boolean {
    const parts = Object.fromEntries(
      signatureHeader.split(",").map((part) => {
        const [key, value] = part.split("=");
        return [key, value];
      })
    );
    const timestamp = parts.t;
    const signature = parts.v1;
    if (!timestamp || !signature) return false;

    const toleranceSeconds = 300;
    const age = Math.abs(Date.now() / 1000 - Number(timestamp));
    if (!Number.isFinite(age) || age > toleranceSeconds) return false;

    const expected = crypto
      .createHmac("sha256", env.bachsWebhookSecret)
      .update(`${timestamp}.${rawBody.toString("utf8")}`)
      .digest("hex");
    return expected === signature;
  }
};
