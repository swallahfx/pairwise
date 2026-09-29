"use client";

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { hasRole, useAuth } from "@/lib/auth";
import { Money } from "@/components/ui/Money";
import { Rating } from "@/components/ui/Rating";
import { SaveButton } from "@/components/ui/SaveButton";
import { QuestionBox } from "@/components/ui/QuestionBox";
import Link from "next/link";

export default function CreatorProfilePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const { data: creator, isLoading } = useQuery({
    queryKey: ["creator", params.id],
    queryFn: () => api.creators.get(params.id)
  });
  const { data: reviewData } = useQuery({
    queryKey: ["creator-reviews", params.id],
    queryFn: () => api.reviews.listForCreator(params.id)
  });

  const [showCustomOffer, setShowCustomOffer] = useState(false);
  const [customOffer, setCustomOffer] = useState({ deliverable: "", priceKobo: 5000000 });

  const bookMutation = useMutation({
    mutationFn: (rateCardItemId: string) => api.offers.bookRateCard(rateCardItemId),
    onSuccess: ({ order }) => router.push(`/checkout/${order.id}`)
  });

  const customOfferMutation = useMutation({
    mutationFn: () =>
      api.offers.sendCustom({
        creatorId: params.id,
        priceKobo: customOffer.priceKobo,
        deliverable: customOffer.deliverable
      }),
    onSuccess: () => router.push("/offers")
  });

  if (isLoading) return <div className="p-14 text-ink-muted">Loading…</div>;
  if (!creator) return <div className="p-14 text-ink-muted">Creator not found.</div>;

  return (
    <div>
      <div className="px-4 sm:px-8 lg:px-14 pt-8">
        <Link href="/creators" className="text-sm text-ink-muted">
          ← All creators
        </Link>
      </div>

      <div className="px-4 sm:px-8 lg:px-14 py-6 flex flex-col sm:flex-row sm:items-center justify-between gap-6 border-b border-border">
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 sm:w-[88px] sm:h-[88px] flex-shrink-0 rounded-full bg-surface border border-border flex items-center justify-center font-display font-semibold text-3xl">
            {creator.user.name.split(" ").map((p) => p[0]).join("")}
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="font-display text-[28px] font-bold">{creator.user.name}</h1>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-money text-white">Verified</span>
              <SaveButton creatorId={creator.id} size="text-2xl" />
            </div>
            <div className="text-[15px] text-ink-muted mt-1">
              {creator.handle} · {creator.nicheTags.join(", ")}
            </div>
            <div className="mt-1.5 flex items-center gap-3">
              <Rating avgRating={creator.avgRating} reviewCount={creator.reviewCount} />
              {creator.replyRate != null && (
                <span className="text-[13px] text-ink-muted">
                  {Math.round(creator.replyRate * 100)}% reply rate
                  {creator.avgReplyHours != null &&
                    ` · replies in ~${
                      creator.avgReplyHours < 24
                        ? `${Math.round(creator.avgReplyHours)}h`
                        : `${Math.round(creator.avgReplyHours / 24)}d`
                    }`}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-10 flex-shrink-0">
          <div>
            <div className="font-display text-2xl font-bold">{(creator.followerCount / 1000).toFixed(0)}K</div>
            <div className="text-[13px] text-ink-muted">{creator.platform} followers</div>
          </div>
          <div>
            <div className="font-display text-2xl font-bold">{(creator.engagementRate * 100).toFixed(1)}%</div>
            <div className="text-[13px] text-ink-muted">Engagement</div>
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-8 lg:px-14 pt-8 pb-14 max-w-3xl">
        <h2 className="font-display text-xl font-semibold mb-1">Rate card</h2>
        <p className="text-sm text-ink-muted mb-5">
          Budget different? Send a custom offer instead of booking one of these.
        </p>

        <div className="border border-border rounded-card bg-surface overflow-hidden">
          {creator.rateCardItems.map((item, i) => (
            <div
              key={item.id}
              className={`flex items-center px-6 py-5 ${i < creator.rateCardItems.length - 1 ? "border-b border-border" : ""}`}
            >
              <div className="flex-grow">
                <div className="text-[15px] font-semibold">{item.deliverable}</div>
                <div className="text-[13px] text-ink-muted mt-0.5">{item.turnaroundDays}-day turnaround</div>
              </div>
              <div className="w-32 text-right">
                <Money kobo={item.priceKobo} size="text-2xl" />
              </div>
              <button
                onClick={() =>
                  hasRole(user, "DEVELOPER") ? bookMutation.mutate(item.id) : router.push("/login")
                }
                disabled={bookMutation.isPending}
                className="ml-6 bg-accent text-white text-sm font-semibold px-4 py-2.5 rounded-lg disabled:opacity-60"
              >
                {bookMutation.isPending ? "Booking…" : hasRole(user, "DEVELOPER") ? "Book" : "Log in to book"}
              </button>
            </div>
          ))}
        </div>
        {bookMutation.isError && (
          <p className="text-sm text-red-600 mt-2">{(bookMutation.error as Error).message}</p>
        )}

        <div className="mt-4 border border-border rounded-card bg-surface p-5">
          {!showCustomOffer ? (
            <div className="flex items-center justify-between">
              <span className="text-sm text-ink-muted">Need something outside this list?</span>
              {hasRole(user, "DEVELOPER") ? (
                <button
                  onClick={() => setShowCustomOffer(true)}
                  className="border border-border text-sm font-semibold px-4 py-2 rounded-lg"
                >
                  Send a custom offer
                </button>
              ) : (
                <Link href="/login" className="text-sm font-semibold text-accent">
                  Log in as a developer to send one
                </Link>
              )}
            </div>
          ) : (
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                customOfferMutation.mutate();
              }}
            >
              <div>
                <label className="block text-[13px] font-semibold mb-2">What do you need?</label>
                <input
                  className="input"
                  value={customOffer.deliverable}
                  onChange={(e) => setCustomOffer({ ...customOffer, deliverable: e.target.value })}
                  placeholder="e.g. 1 YouTube Short + pinned comment"
                  required
                />
              </div>
              <div>
                <label className="block text-[13px] font-semibold mb-2">Your offer (₦)</label>
                <input
                  className="input"
                  type="number"
                  value={customOffer.priceKobo / 100}
                  onChange={(e) => setCustomOffer({ ...customOffer, priceKobo: Number(e.target.value) * 100 })}
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowCustomOffer(false)}
                  className="text-sm font-semibold text-ink-muted px-4 py-2.5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={customOfferMutation.isPending}
                  className="bg-accent text-white text-sm font-semibold px-4 py-2.5 rounded-lg disabled:opacity-60"
                >
                  {customOfferMutation.isPending ? "Sending…" : "Send offer"}
                </button>
              </div>
              {customOfferMutation.isError && (
                <p className="text-sm text-red-600">{(customOfferMutation.error as Error).message}</p>
              )}
            </form>
          )}
        </div>

        <div className="mt-10">
          <h2 className="font-display text-xl font-semibold mb-4">Reviews</h2>
          {(!reviewData || reviewData.reviews.length === 0) && (
            <p className="text-sm text-ink-muted">No reviews yet — this creator hasn&apos;t completed a booking.</p>
          )}
          <div className="space-y-3">
            {reviewData?.reviews.map((r) => (
              <div key={r.id} className="bg-surface border border-border rounded-card p-5">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold">{r.developer.user.name}</span>
                  <span className="text-amber-500 text-sm">{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</span>
                </div>
                <p className="text-sm text-ink-muted mt-2">{r.text}</p>
              </div>
            ))}
          </div>
        </div>

        <QuestionBox targetType="CREATOR" targetId={creator.id} isOwner={!!creator.userId && user?.userId === creator.userId} />
      </div>
    </div>
  );
}
