"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Money } from "@/components/ui/Money";
import { UpfrontPurchase, UpfrontPurchaseStatus } from "@/types";

function statusPill(status: UpfrontPurchaseStatus) {
  const done = status === "PAID";
  const problem = status === "DISPUTED" || status === "REFUNDED";
  const styles = done
    ? "bg-money text-white"
    : problem
      ? "bg-red-600 text-white"
      : "bg-accent/10 text-accent";
  return <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${styles}`}>{status.replace("_", " ")}</span>;
}

// Kept separate from /orders — a slot reservation in a future program is a
// different kind of transaction from a commissioned deliverable, and
// mixing the two lists would blur that distinction the feature is built
// around.
export default function MyUpfrontPurchasesPage() {
  const { user, isLoading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const { data: purchases, isLoading } = useQuery({
    queryKey: ["upfront-purchases-mine"],
    queryFn: api.upfront.purchases.mine,
    enabled: !!user
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => api.upfront.purchases.approve(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["upfront-purchases-mine"] })
  });

  if (authLoading) return <div className="p-14 text-ink-muted">Loading…</div>;
  if (!user) {
    return (
      <div className="p-14 text-ink-muted">
        <Link href="/login" className="text-accent font-semibold">
          Log in
        </Link>{" "}
        to see your Upfront purchases.
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-8 lg:px-14 py-12 max-w-3xl">
      <h1 className="font-display text-3xl font-semibold mb-2">Your Upfront purchases</h1>
      <p className="text-ink-muted mb-10">
        Slots you've reserved in future programs. Confirm once a program has run to release payment — it
        releases automatically after 7 days past the program date either way.
      </p>

      {isLoading && <p className="text-ink-muted">Loading…</p>}
      {purchases?.length === 0 && (
        <div className="text-sm text-ink-muted border border-border rounded-card p-6 bg-surface">
          No purchases yet — browse{" "}
          <Link href="/upfront" className="text-accent font-semibold">
            Upfront programs
          </Link>
          .
        </div>
      )}

      <div className="border border-border rounded-card bg-surface overflow-hidden">
        {purchases?.map((purchase, i) => {
          const listerName =
            purchase.listing.listerType === "CREATOR"
              ? purchase.listing.creator?.user.name
              : purchase.listing.brand?.companyName;
          const href = purchase.status === "AGREED" ? `/upfront/checkout/${purchase.id}` : undefined;
          const row = (
            <div
              className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 sm:px-6 py-4 ${
                href ? "hover:bg-ground/50" : ""
              } ${i < purchases.length - 1 ? "border-b border-border" : ""}`}
            >
              <div>
                <div className="text-[15px] font-semibold">{purchase.listing.title}</div>
                <div className="text-[13px] text-ink-muted mt-0.5">{listerName}</div>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                {purchase.status === "FUNDED" && (
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      approveMutation.mutate(purchase.id);
                    }}
                    disabled={approveMutation.isPending}
                    className="bg-gradient-to-r from-accent to-accent-teal text-white text-xs font-semibold px-3 py-1.5 rounded-lg disabled:opacity-60"
                  >
                    Confirm delivered
                  </button>
                )}
                <Money kobo={purchase.totalKobo} size="text-lg" />
                {statusPill(purchase.status)}
              </div>
            </div>
          );
          return (
            <div key={purchase.id}>
              {href ? (
                <Link href={href} className="block">
                  {row}
                </Link>
              ) : (
                row
              )}
              {purchase.status === "PAID" && <ReviewRow purchase={purchase} />}
            </div>
          );
        })}
      </div>
      {approveMutation.isError && (
        <p className="text-sm text-red-600 mt-3">{(approveMutation.error as Error).message}</p>
      )}
    </div>
  );
}

function ReviewRow({ purchase }: { purchase: UpfrontPurchase }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [text, setText] = useState("");
  const mutation = useMutation({
    mutationFn: () => api.upfront.purchases.review(purchase.id, { rating, text }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["upfront-purchases-mine"] });
      setOpen(false);
    }
  });

  if (purchase.review) {
    return (
      <div className="px-6 py-3 border-b border-border last:border-0 bg-ground/30 text-[13px] text-ink-muted">
        You rated this {"★".repeat(purchase.review.rating)}{"☆".repeat(5 - purchase.review.rating)}
      </div>
    );
  }

  if (!open) {
    return (
      <div className="px-6 py-3 border-b border-border last:border-0 bg-ground/30">
        <button onClick={() => setOpen(true)} className="text-[13px] font-semibold text-accent">
          Leave a review
        </button>
      </div>
    );
  }

  return (
    <form
      className="px-6 py-4 border-b border-border last:border-0 bg-ground/30 space-y-2"
      onSubmit={(e) => {
        e.preventDefault();
        mutation.mutate();
      }}
    >
      <div className="flex gap-1.5">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            type="button"
            key={n}
            onClick={() => setRating(n)}
            className={`w-8 h-8 rounded-lg border text-sm font-bold ${
              n <= rating ? "bg-gradient-to-r from-accent to-accent-teal text-white border-accent" : "bg-surface border-border text-ink-muted"
            }`}
          >
            {n}
          </button>
        ))}
      </div>
      <textarea
        className="input"
        rows={2}
        placeholder="How was the program?"
        value={text}
        onChange={(e) => setText(e.target.value)}
        required
      />
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={mutation.isPending}
          className="bg-gradient-to-r from-accent to-accent-teal text-white text-xs font-semibold px-3 py-1.5 rounded-lg disabled:opacity-60"
        >
          {mutation.isPending ? "Submitting…" : "Submit review"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="text-xs font-semibold text-ink-muted px-2">
          Cancel
        </button>
      </div>
      {mutation.isError && <p className="text-xs text-red-600">{(mutation.error as Error).message}</p>}
    </form>
  );
}
