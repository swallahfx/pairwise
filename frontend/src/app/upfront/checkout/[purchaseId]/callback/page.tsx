"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";

// Mirrors /checkout/[orderId]/callback exactly, just for Upfront purchases
// — the shared /payments/verify/:reference endpoint dispatches to whichever
// domain the reference prefix belongs to, so this page doesn't need to know
// which one it is.
export default function UpfrontPaystackCallbackPage() {
  const params = useParams<{ purchaseId: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const reference = searchParams.get("reference") ?? searchParams.get("trxref");

  useEffect(() => {
    if (!reference) {
      setError("Missing payment reference from Paystack.");
      return;
    }
    api.payments
      .verify(reference)
      .then(() => router.replace(`/upfront/purchases`))
      .catch((err: Error) => setError(err.message));
  }, [reference, router]);

  return (
    <div className="max-w-md mx-auto px-6 py-24 text-center">
      {error ? (
        <>
          <p className="text-sm text-red-600 mb-4">{error}</p>
          <button
            onClick={() => router.push(`/upfront/purchases`)}
            className="text-sm font-semibold text-accent"
          >
            Go to your purchases →
          </button>
        </>
      ) : (
        <p className="text-ink-muted">Confirming your payment…</p>
      )}
    </div>
  );
}
