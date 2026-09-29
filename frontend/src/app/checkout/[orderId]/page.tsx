"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import { Money } from "@/components/ui/Money";
import Link from "next/link";

export default function CheckoutPage() {
  const params = useParams<{ orderId: string }>();

  const { data: order, isLoading } = useQuery({
    queryKey: ["order", params.orderId],
    queryFn: () => api.orders.get(params.orderId)
  });

  // Paystack hosts the actual payment page — this just opens a transaction
  // there and sends the browser over. Paystack redirects back to
  // /checkout/[orderId]/callback, which verifies the transaction and marks
  // the order funded before continuing to the order status page.
  const fundMutation = useMutation({
    mutationFn: () => api.orders.fund(params.orderId),
    onSuccess: (data) => {
      window.location.href = data.authorizationUrl;
    }
  });

  if (isLoading) return <div className="p-14 text-ink-muted">Loading…</div>;
  if (!order) return <div className="p-14 text-ink-muted">Order not found.</div>;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 flex flex-col lg:flex-row gap-8 lg:gap-14">
      <div className="flex-1">
        <Link href={`/creators`} className="text-sm text-ink-muted">
          ← Back to directory
        </Link>
        <h1 className="font-display text-[28px] font-semibold mt-5 mb-2">Fund this order</h1>
        <p className="text-ink-muted mb-8 leading-relaxed">
          {order.offer.creator.user.name} gets paid the moment you approve the work — not before.
        </p>

        <div className="flex items-start gap-3 p-4 bg-surface border border-border rounded-lg mb-6">
          <span className="text-lg leading-none">🔒</span>
          <p className="text-[13px] text-ink-muted leading-relaxed">
            Held until approved. Funds move to {order.offer.creator.user.name}&apos;s account only after
            you approve the delivered work — or automatically after 7 days if you don&apos;t respond.
          </p>
        </div>

        {order.status !== "AGREED" ? (
          <div className="w-full bg-ground border border-border text-ink-muted py-3.5 rounded-lg font-semibold text-[15px] text-center">
            Already {order.status.toLowerCase().replace("_", " ")}
          </div>
        ) : (
          <button
            onClick={() => fundMutation.mutate()}
            disabled={fundMutation.isPending}
            className="w-full bg-accent text-white py-3.5 rounded-lg font-semibold text-[15px] disabled:opacity-60"
          >
            {fundMutation.isPending ? "Redirecting to Paystack…" : "Pay with Paystack"}
          </button>
        )}
        {fundMutation.isError && (
          <p className="text-sm text-red-600 mt-3">{(fundMutation.error as Error).message}</p>
        )}
      </div>

      <div className="w-full lg:w-[320px] flex-shrink-0">
        <div className="bg-surface border border-border rounded-card p-6">
          <div className="pb-5 mb-5 border-b border-border">
            <div className="font-semibold text-sm">{order.offer.creator.user.name}</div>
            <div className="text-xs text-ink-muted">{order.offer.creator.handle}</div>
          </div>
          <div className="text-sm font-semibold mb-4">{order.offer.deliverable}</div>
          <div className="flex justify-between text-sm mb-2.5">
            <span className="text-ink-muted">Creator rate</span>
            <span>₦{(order.priceKobo / 100).toLocaleString("en-NG")}</span>
          </div>
          <div className="flex justify-between text-sm mb-3.5">
            <span className="text-ink-muted">Platform fee</span>
            <span>₦{(order.platformFeeKobo / 100).toLocaleString("en-NG")}</span>
          </div>
          <div className="flex justify-between items-baseline pt-3.5 border-t border-border">
            <span className="text-sm font-semibold">Total</span>
            <Money kobo={order.totalKobo} size="text-2xl" />
          </div>
        </div>
      </div>
    </div>
  );
}
