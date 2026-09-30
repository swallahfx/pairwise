"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Money } from "@/components/ui/Money";
import { Rating } from "@/components/ui/Rating";
import { QuestionBox } from "@/components/ui/QuestionBox";

export default function UpfrontListingPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();

  const { data: listing, isLoading } = useQuery({
    queryKey: ["upfront", params.id],
    queryFn: () => api.upfront.get(params.id)
  });

  const buyMutation = useMutation({
    mutationFn: () => api.upfront.buy(params.id),
    onSuccess: (purchase) => router.push(`/upfront/checkout/${purchase.id}`)
  });

  if (isLoading) return <div className="p-14 text-ink-muted">Loading…</div>;
  if (!listing) return <div className="p-14 text-ink-muted">Program not found.</div>;

  const listerName = listing.listerType === "CREATOR" ? listing.creator?.user.name : listing.brand?.companyName;
  const remaining = listing.totalSlots - listing.slotsSold;
  const soldOut = remaining <= 0;
  const listerUserId = listing.listerType === "CREATOR" ? listing.creator?.userId : listing.brand?.userId;
  const isOwner = !!listerUserId && user?.userId === listerUserId;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
      <Link href="/upfront" className="text-sm text-ink-muted">
        ← All programs
      </Link>

      <div className="mt-5 flex flex-col sm:flex-row sm:items-start justify-between gap-4 sm:gap-6">
        <div>
          <h1 className="font-display text-[28px] font-bold">{listing.title}</h1>
          <div className="text-[15px] text-ink-muted mt-1">
            {listerName} · {listing.listerType === "CREATOR" ? "Creator" : "Brand"} · {listing.niche}
          </div>
          <div className="mt-1.5">
            <Rating avgRating={listing.avgRating} reviewCount={listing.reviewCount} />
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <Money kobo={listing.pricePerSlotKobo} size="text-3xl" />
          <div className="text-xs text-ink-muted mt-1">per slot</div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8">
        <div className="bg-surface border border-border rounded-card p-5">
          <div className="text-[13px] font-semibold text-ink-muted mb-1.5">The program</div>
          <p className="text-sm leading-relaxed">{listing.description}</p>
        </div>
        <div className="bg-surface border border-border rounded-card p-5">
          <div className="text-[13px] font-semibold text-ink-muted mb-1.5">Audience / reach</div>
          <p className="text-sm leading-relaxed">{listing.audienceSummary}</p>
        </div>
      </div>

      <div className="mt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface border border-border rounded-card p-5">
        <div>
          <div className="text-sm font-semibold">
            {soldOut ? "Sold out" : `${remaining} of ${listing.totalSlots} slots remaining`}
          </div>
          <div className="text-xs text-ink-muted mt-0.5">
            Runs {new Date(listing.programDate).toLocaleDateString()} — funds release to {listerName} once it
            does.
          </div>
        </div>
        {user ? (
          <button
            onClick={() => buyMutation.mutate()}
            disabled={soldOut || buyMutation.isPending}
            className="bg-gradient-to-r from-accent to-accent-teal text-white text-sm font-semibold px-5 py-2.5 rounded-lg disabled:opacity-40 flex-shrink-0"
          >
            {buyMutation.isPending ? "Reserving…" : "Buy a slot"}
          </button>
        ) : (
          <button
            onClick={() => router.push("/login")}
            className="bg-gradient-to-r from-accent to-accent-teal text-white text-sm font-semibold px-5 py-2.5 rounded-lg flex-shrink-0"
          >
            Log in to buy
          </button>
        )}
      </div>
      {buyMutation.isError && (
        <p className="text-sm text-red-600 mt-3">{(buyMutation.error as Error).message}</p>
      )}

      <div className="mt-10">
        <h2 className="font-display text-xl font-semibold mb-4">Reviews</h2>
        {(!listing.reviews || listing.reviews.length === 0) && (
          <p className="text-sm text-ink-muted">No reviews yet — no one has completed this program yet.</p>
        )}
        <div className="space-y-3">
          {listing.reviews?.map((r) => (
            <div key={r.id} className="bg-surface border border-border rounded-card p-5">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">{r.buyer.name}</span>
                <span className="text-amber-500 text-sm">{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</span>
              </div>
              <p className="text-sm text-ink-muted mt-2">{r.text}</p>
            </div>
          ))}
        </div>
      </div>

      <QuestionBox targetType="UPFRONT_LISTING" targetId={listing.id} isOwner={isOwner} />
    </div>
  );
}
