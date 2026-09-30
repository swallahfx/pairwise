"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Money } from "@/components/ui/Money";
import { Offer } from "@/types";

export default function OffersPage() {
  const { user, isLoading } = useAuth();
  const [viewAs, setViewAs] = useState<"CREATOR" | "DEVELOPER">("CREATOR");

  if (isLoading) return <div className="p-14 text-ink-muted">Loading…</div>;
  if (!user) {
    return (
      <div className="p-14 text-ink-muted">
        <Link href="/login" className="text-accent font-semibold">
          Log in
        </Link>{" "}
        to see your offers.
      </div>
    );
  }

  // An admin holds both a creator and a developer profile, so unlike
  // everyone else it isn't a fixed choice — let them switch between the
  // two inboxes rather than guessing which one they want.
  if (user.role === "ADMIN") {
    return (
      <div>
        <div className="px-4 sm:px-8 lg:px-14 pt-8 flex gap-2">
          {(["CREATOR", "DEVELOPER"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setViewAs(v)}
              className={`px-3.5 py-2 rounded-full text-sm font-semibold border ${
                viewAs === v ? "bg-gradient-to-r from-accent to-accent-teal text-white border-accent" : "bg-surface border-border text-ink-muted"
              }`}
            >
              As {v === "CREATOR" ? "creator" : "developer"}
            </button>
          ))}
        </div>
        {viewAs === "CREATOR" ? <CreatorOffersInbox /> : <DeveloperRequestsInbox />}
      </div>
    );
  }

  return user.role === "CREATOR" ? <CreatorOffersInbox /> : <DeveloperRequestsInbox />;
}

function statusPill(status: string) {
  const styles: Record<string, string> = {
    PENDING: "bg-accent/10 text-accent",
    ACCEPTED: "bg-money text-white",
    DECLINED: "bg-red-600 text-white",
    COUNTERED: "bg-accent/10 text-accent"
  };
  return (
    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${styles[status] ?? styles.PENDING}`}>
      {status}
    </span>
  );
}

function CreatorOffersInbox() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { data: offers, isLoading } = useQuery({ queryKey: ["offers-mine"], queryFn: api.offers.mine });

  const acceptMutation = useMutation({
    mutationFn: (offerId: string) => api.offers.accept(offerId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["offers-mine"] })
  });
  const declineMutation = useMutation({
    mutationFn: (offerId: string) => api.offers.decline(offerId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["offers-mine"] })
  });

  const pendingCustom = offers?.filter((o) => o.status === "PENDING" && o.source === "CUSTOM") ?? [];
  const history = offers?.filter((o) => !(o.status === "PENDING" && o.source === "CUSTOM")) ?? [];

  return (
    <div className="px-4 sm:px-8 lg:px-14 py-12 max-w-3xl">
      <h1 className="font-display text-3xl font-semibold mb-2">Offers</h1>
      <p className="text-ink-muted mb-10">
        Custom offers developers sent you directly. Accepting opens an order — the developer funds it next.
      </p>

      {isLoading && <p className="text-ink-muted">Loading…</p>}

      <h2 className="font-semibold text-sm text-ink-muted uppercase tracking-wide mb-3">Awaiting your response</h2>
      <div className="space-y-3 mb-10">
        {pendingCustom.length === 0 && (
          <div className="text-sm text-ink-muted border border-border rounded-card p-5 bg-surface">
            No pending custom offers.
          </div>
        )}
        {pendingCustom.map((offer) => (
          <div
            key={offer.id}
            className="bg-surface border border-border rounded-card p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
          >
            <div>
              <div className="font-semibold text-[15px]">{offer.deliverable}</div>
              <div className="text-[13px] text-ink-muted mt-0.5">From {offer.developer.user.name}</div>
            </div>
            <div className="flex items-center gap-4 flex-wrap">
              <Money kobo={offer.priceKobo} size="text-xl" />
              <button
                onClick={() => declineMutation.mutate(offer.id)}
                disabled={declineMutation.isPending || acceptMutation.isPending}
                className="text-sm font-semibold text-red-600 px-3 py-2"
              >
                Decline
              </button>
              <button
                onClick={() =>
                  acceptMutation.mutate(offer.id, {
                    onSuccess: () => router.push("/orders")
                  })
                }
                disabled={acceptMutation.isPending || declineMutation.isPending}
                className="bg-gradient-to-r from-accent to-accent-teal text-white text-sm font-semibold px-4 py-2 rounded-lg disabled:opacity-60"
              >
                Accept
              </button>
            </div>
          </div>
        ))}
      </div>

      <h2 className="font-semibold text-sm text-ink-muted uppercase tracking-wide mb-3">History</h2>
      <OfferHistoryTable offers={history} />
    </div>
  );
}

function DeveloperRequestsInbox() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { data: requests, isLoading } = useQuery({ queryKey: ["requests-mine"], queryFn: api.requests.mine });
  const { data: sentOffers } = useQuery({ queryKey: ["offers-mine"], queryFn: api.offers.mine });
  const [expanded, setExpanded] = useState<string | null>(null);

  const { data: applicants, isLoading: applicantsLoading } = useQuery({
    queryKey: ["applicants", expanded],
    queryFn: () => api.offers.listApplicants(expanded!),
    enabled: !!expanded
  });

  const acceptMutation = useMutation({
    mutationFn: (offerId: string) => api.offers.accept(offerId),
    onSuccess: ({ order }) => {
      queryClient.invalidateQueries({ queryKey: ["requests-mine"] });
      router.push(`/checkout/${order.id}`);
    }
  });
  const declineMutation = useMutation({
    mutationFn: (offerId: string) => api.offers.decline(offerId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["applicants", expanded] })
  });

  const customSent = sentOffers?.filter((o) => o.source === "CUSTOM") ?? [];

  return (
    <div className="px-4 sm:px-8 lg:px-14 py-12 max-w-3xl">
      <h1 className="font-display text-3xl font-semibold mb-2">Your requests & offers</h1>
      <p className="text-ink-muted mb-10">
        Pick an applicant on a request to open an order, or track custom offers you&apos;ve sent.
      </p>

      {isLoading && <p className="text-ink-muted">Loading…</p>}

      <h2 className="font-semibold text-sm text-ink-muted uppercase tracking-wide mb-3">Your posted requests</h2>
      <div className="space-y-3 mb-10">
        {requests?.length === 0 && (
          <div className="text-sm text-ink-muted border border-border rounded-card p-5 bg-surface">
            You haven&apos;t posted a request yet.
          </div>
        )}
        {requests?.map((r) => (
          <div key={r.id} className="bg-surface border border-border rounded-card p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="font-semibold text-[15px]">{r.product.name}</div>
                <div className="text-[13px] text-ink-muted mt-0.5">
                  {r._count?.offers ?? 0} applicant{r._count?.offers === 1 ? "" : "s"} ·{" "}
                  {r.status === "OPEN" ? "Open" : "Closed"}
                </div>
              </div>
              <div className="flex items-center gap-4">
                <Money kobo={r.budgetKobo} size="text-xl" />
                <button
                  onClick={() => setExpanded(expanded === r.id ? null : r.id)}
                  className="text-sm font-semibold text-accent px-3 py-2"
                >
                  {expanded === r.id ? "Hide applicants" : "View applicants"}
                </button>
              </div>
            </div>

            {expanded === r.id && (
              <div className="mt-4 pt-4 border-t border-border space-y-2.5">
                {applicantsLoading && <p className="text-sm text-ink-muted">Loading applicants…</p>}
                {applicants?.length === 0 && <p className="text-sm text-ink-muted">No applicants yet.</p>}
                {applicants?.map((a) => (
                  <div key={a.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-ground rounded-lg px-4 py-3">
                    <div>
                      <div className="text-sm font-semibold">{a.creator.user.name}</div>
                      <div className="text-xs text-ink-muted">
                        {a.creator.handle} · {a.deliverable}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-wrap">
                      <Money kobo={a.priceKobo} size="text-lg" />
                      {a.status === "PENDING" ? (
                        <>
                          <button
                            onClick={() => declineMutation.mutate(a.id)}
                            disabled={declineMutation.isPending || acceptMutation.isPending}
                            className="text-xs font-semibold text-red-600 px-2 py-1.5"
                          >
                            Decline
                          </button>
                          <button
                            onClick={() => acceptMutation.mutate(a.id)}
                            disabled={acceptMutation.isPending || declineMutation.isPending}
                            className="bg-gradient-to-r from-accent to-accent-teal text-white text-xs font-semibold px-3 py-1.5 rounded-lg disabled:opacity-60"
                          >
                            Accept & fund
                          </button>
                        </>
                      ) : (
                        statusPill(a.status)
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <h2 className="font-semibold text-sm text-ink-muted uppercase tracking-wide mb-3">Custom offers you&apos;ve sent</h2>
      <OfferHistoryTable offers={customSent} />
    </div>
  );
}

function OfferHistoryTable({ offers }: { offers: Offer[] }) {
  if (offers.length === 0) {
    return (
      <div className="text-sm text-ink-muted border border-border rounded-card p-5 bg-surface">
        Nothing here yet.
      </div>
    );
  }
  return (
    <div className="border border-border rounded-card bg-surface overflow-hidden">
      {offers.map((o, i) => (
        <div
          key={o.id}
          className={`flex items-center justify-between px-5 py-3.5 ${
            i < offers.length - 1 ? "border-b border-border" : ""
          }`}
        >
          <div>
            <div className="text-sm font-semibold">{o.deliverable}</div>
            <div className="text-xs text-ink-muted mt-0.5">
              {o.creator.user.name} · {o.source.replace("_", " ").toLowerCase()}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Money kobo={o.priceKobo} size="text-lg" />
            {statusPill(o.status)}
          </div>
        </div>
      ))}
    </div>
  );
}
