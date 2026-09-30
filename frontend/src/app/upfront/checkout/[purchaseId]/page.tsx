"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import { Money } from "@/components/ui/Money";
import Link from "next/link";

export default function UpfrontCheckoutPage() {
  const params = useParams<{ purchaseId: string }>();

  const { data: purchase, isLoading } = useQuery({
    queryKey: ["upfront-purchase", params.purchaseId],
    queryFn: () => api.upfront.purchases.get(params.purchaseId)
  });

  // Same Paystack hosted-checkout pattern as the Order flow: open a
  // transaction, send the browser to Paystack, and let the callback route
  // verify + confirm funding when Paystack redirects back.
  const fundMutation = useMutation({
    mutationFn: () => api.upfront.purchases.fund(params.purchaseId),
    onSuccess: (data) => {
      window.location.href = data.authorizationUrl;
    }
  });

  if (isLoading) return <div className="p-14 text-ink-muted">Loading…</div>;
  if (!purchase) return <div className="p-14 text-ink-muted">Purchase not found.</div>;

  const listerName =
    purchase.listing.listerType === "CREATOR" ? purchase.listing.creator?.user.name : purchase.listing.brand?.companyName;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 flex flex-col lg:flex-row gap-8 lg:gap-14">
      <div className="flex-1">
        <Link href="/upfront" className="text-sm text-ink-muted">
          ← Back to programs
        </Link>
        <h1 className="font-display text-[28px] font-semibold mt-5 mb-2">Reserve your slot</h1>
        <p className="text-ink-muted mb-8 leading-relaxed">
          {listerName} gets paid once the program actually runs — not before.
        </p>

        <div className="flex items-start gap-3 p-4 bg-surface border border-border rounded-lg mb-6">
          <span className="text-lg leading-none">🔒</span>
          <p className="text-[13px] text-ink-muted leading-relaxed">
            Held until the program runs. Funds move to {listerName}&apos;s account once you confirm it
            delivered — or automatically after 7 days past the program date if you don&apos;t respond.
          </p>
        </div>

        {purchase.status !== "AGREED" ? (
          <div className="w-full bg-ground border border-border text-ink-muted py-3.5 rounded-lg font-semibold text-[15px] text-center">
            Already {purchase.status.toLowerCase().replace("_", " ")}
          </div>
        ) : (
          <button
            onClick={() => fundMutation.mutate()}
            disabled={fundMutation.isPending}
            className="w-full bg-gradient-to-r from-accent to-accent-teal text-white py-3.5 rounded-lg font-semibold text-[15px] disabled:opacity-60"
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
            <div className="font-semibold text-sm">{listerName}</div>
            <div className="text-xs text-ink-muted">
              Runs {new Date(purchase.listing.programDate).toLocaleDateString()}
            </div>
          </div>
          <div className="text-sm font-semibold mb-4">{purchase.listing.title}</div>
          <div className="flex justify-between text-sm mb-2.5">
            <span className="text-ink-muted">Slot price</span>
            <span>₦{(purchase.priceKobo / 100).toLocaleString("en-NG")}</span>
          </div>
          <div className="flex justify-between text-sm mb-3.5">
            <span className="text-ink-muted">Platform fee</span>
            <span>₦{(purchase.platformFeeKobo / 100).toLocaleString("en-NG")}</span>
          </div>
          <div className="flex justify-between items-baseline pt-3.5 border-t border-border">
            <span className="text-sm font-semibold">Total</span>
            <Money kobo={purchase.totalKobo} size="text-2xl" />
          </div>
        </div>
      </div>
    </div>
  );
}
