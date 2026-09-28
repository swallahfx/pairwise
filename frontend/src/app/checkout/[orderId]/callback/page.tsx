"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";

// Paystack redirects the browser here after the hosted payment page, with
// ?reference=... appended (also mirrored as ?trxref=...). The webhook is
// the durable source of truth for marking an order funded, but it can't
// reach a local dev server — this verify-on-return path is what actually
// confirms funding when there's no public webhook URL, and is a harmless,
// idempotent double-check in production too.
export default function PaystackCallbackPage() {
  const params = useParams<{ orderId: string }>();
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
      .then(() => router.replace(`/orders/${params.orderId}`))
      .catch((err: Error) => setError(err.message));
  }, [reference, params.orderId, router]);

  return (
    <div className="max-w-md mx-auto px-6 py-24 text-center">
      {error ? (
        <>
          <p className="text-sm text-red-600 mb-4">{error}</p>
          <button
            onClick={() => router.push(`/orders/${params.orderId}`)}
            className="text-sm font-semibold text-accent"
          >
            Go to order status →
          </button>
        </>
      ) : (
        <p className="text-ink-muted">Confirming your payment…</p>
      )}
    </div>
  );
}
