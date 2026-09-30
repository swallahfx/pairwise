"use client";

import { useState, useEffect, Suspense } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { hasRole, useAuth } from "@/lib/auth";
import { Money } from "@/components/ui/Money";
import { PayoutAccountForm } from "@/components/ui/PayoutAccountForm";
import { UpfrontSalesList } from "@/components/ui/UpfrontSalesList";

const NICHES = ["AI Tools", "Dev Tools", "SaaS", "Indie Apps", "Productivity", "Fintech"];
const TABS = ["profile", "payouts", "rates", "upfront"] as const;
type Tab = (typeof TABS)[number];
const TAB_LABELS: Record<Tab, string> = {
  profile: "Profile",
  payouts: "Payouts",
  rates: "Rate card",
  upfront: "Upfront programs"
};

export default function CreatorMePage() {
  const { user, isLoading: authLoading } = useAuth();

  if (authLoading) return <div className="p-14 text-ink-muted">Loading…</div>;
  if (!user) {
    return (
      <div className="p-14 text-ink-muted">
        <Link href="/login" className="text-accent font-semibold">
          Log in
        </Link>{" "}
        as a creator to see this page.
      </div>
    );
  }
  if (!hasRole(user, "CREATOR")) {
    return <div className="p-14 text-ink-muted">This page is only for creator accounts.</div>;
  }

  return (
    <Suspense>
      <CreatorMeContent />
    </Suspense>
  );
}

function CreatorMeContent() {
  const searchParams = useSearchParams();
  const initialTab = TABS.includes(searchParams.get("tab") as Tab) ? (searchParams.get("tab") as Tab) : "profile";
  const [tab, setTab] = useState<Tab>(initialTab);
  const queryClient = useQueryClient();
  const { data: creator, isLoading } = useQuery({ queryKey: ["creator-me"], queryFn: api.creators.getMe });

  const [form, setForm] = useState({
    handle: "",
    platform: "",
    followerCount: 0,
    engagementPercent: 0,
    nicheTags: [] as string[]
  });

  useEffect(() => {
    if (creator) {
      setForm({
        handle: creator.handle,
        platform: creator.platform,
        followerCount: creator.followerCount,
        engagementPercent: Number((creator.engagementRate * 100).toFixed(2)),
        nicheTags: creator.nicheTags
      });
    }
  }, [creator]);

  const profileMutation = useMutation({
    mutationFn: () =>
      api.creators.updateMe({
        handle: form.handle,
        platform: form.platform,
        followerCount: form.followerCount,
        engagementRate: form.engagementPercent / 100,
        nicheTags: form.nicheTags
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["creator-me"] })
  });

  const [newItem, setNewItem] = useState({ deliverable: "", priceKobo: 5000000, turnaroundDays: 3 });
  const addItemMutation = useMutation({
    mutationFn: () => api.rateCards.create(newItem),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["creator-me"] });
      setNewItem({ deliverable: "", priceKobo: 5000000, turnaroundDays: 3 });
    }
  });

  const removeItemMutation = useMutation({
    mutationFn: (itemId: string) => api.rateCards.remove(itemId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["creator-me"] })
  });

  const { data: listings, isLoading: listingsLoading } = useQuery({
    queryKey: ["upfront-mine"],
    queryFn: api.upfront.mine,
    enabled: tab === "upfront"
  });
  const [newListing, setNewListing] = useState({
    title: "",
    niche: "AI Tools",
    description: "",
    audienceSummary: "",
    pricePerSlotKobo: 20_000_000,
    totalSlots: 4,
    programDate: ""
  });
  const createListingMutation = useMutation({
    mutationFn: () => api.upfront.create(newListing),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["upfront-mine"] });
      setNewListing({
        title: "",
        niche: "AI Tools",
        description: "",
        audienceSummary: "",
        pricePerSlotKobo: 20_000_000,
        totalSlots: 4,
        programDate: ""
      });
    }
  });

  function toggleNiche(name: string) {
    setForm((prev) => ({
      ...prev,
      nicheTags: prev.nicheTags.includes(name)
        ? prev.nicheTags.filter((n) => n !== name)
        : [...prev.nicheTags, name]
    }));
  }

  if (isLoading || !creator) return <div className="p-14 text-ink-muted">Loading…</div>;

  const isApproved = creator.gateStatus === "APPROVED";

  return (
    <div className="px-4 sm:px-8 lg:px-14 py-12 max-w-3xl">
      <div className="flex items-center gap-3 mb-1">
        <h1 className="font-display text-3xl font-semibold">Your profile</h1>
        <GateBadge status={creator.gateStatus} />
      </div>
      <p className="text-ink-muted mb-6">{creator.handle || "Set up your profile below."}</p>

      <div className="flex gap-2 mb-8 border-b border-border">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px ${
              tab === t ? "border-accent text-ink" : "border-transparent text-ink-muted"
            }`}
          >
            {TAB_LABELS[t]}
          </button>
        ))}
      </div>

      {tab === "profile" && (
        <div>
          <p className="text-ink-muted mb-5">
            Listing requires at least 1,000 followers and a 2% engagement rate. Update your numbers below —
            your gate status recalculates immediately, though clearing the bar only moves you to review, not
            an automatic approval.
          </p>
          <form
            className="bg-surface border border-border rounded-card p-6 space-y-5"
            onSubmit={(e) => {
              e.preventDefault();
              profileMutation.mutate();
            }}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-[13px] font-semibold mb-2">Handle</label>
                <input
                  className="input"
                  value={form.handle}
                  onChange={(e) => setForm({ ...form, handle: e.target.value })}
                  placeholder="@yourhandle"
                />
              </div>
              <div>
                <label className="block text-[13px] font-semibold mb-2">Platform</label>
                <input
                  className="input"
                  value={form.platform}
                  onChange={(e) => setForm({ ...form, platform: e.target.value })}
                  placeholder="TikTok"
                />
              </div>
              <div>
                <label className="block text-[13px] font-semibold mb-2">Followers</label>
                <input
                  className="input"
                  type="number"
                  value={form.followerCount}
                  onChange={(e) => setForm({ ...form, followerCount: Number(e.target.value) })}
                />
              </div>
              <div>
                <label className="block text-[13px] font-semibold mb-2">Engagement rate (%)</label>
                <input
                  className="input"
                  type="number"
                  step="0.1"
                  value={form.engagementPercent}
                  onChange={(e) => setForm({ ...form, engagementPercent: Number(e.target.value) })}
                />
              </div>
            </div>
            <div>
              <label className="block text-[13px] font-semibold mb-2">Niches</label>
              <div className="flex gap-2 flex-wrap">
                {NICHES.map((n) => (
                  <button
                    type="button"
                    key={n}
                    onClick={() => toggleNiche(n)}
                    className={`px-3.5 py-2 rounded-full text-sm border font-medium ${
                      form.nicheTags.includes(n) ? "bg-gradient-to-r from-accent to-accent-teal text-white border-accent" : "bg-ground border-border"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
            <button
              type="submit"
              disabled={profileMutation.isPending}
              className="bg-gradient-to-r from-accent to-accent-teal text-white text-sm font-semibold px-5 py-2.5 rounded-lg disabled:opacity-60"
            >
              {profileMutation.isPending ? "Saving…" : "Save profile"}
            </button>
            {profileMutation.isError && (
              <p className="text-sm text-red-600">{(profileMutation.error as Error).message}</p>
            )}
          </form>
        </div>
      )}

      {tab === "payouts" && (
        <PayoutAccountForm
          paystackRecipientCode={creator.paystackRecipientCode}
          bankAccountName={creator.bankAccountName}
          bankAccountNumber={creator.bankAccountNumber}
          isEligible={isApproved}
          ineligibleMessage="Approved profiles only."
          queryKey={["creator-me"]}
        />
      )}

      {tab === "rates" && (
        <div>
          <p className="text-ink-muted mb-5">
            Fixed prices for one-off bespoke deliverables — a developer books one directly, no negotiation.
          </p>
          <div className="border border-border rounded-card bg-surface overflow-hidden mb-4">
            {creator.rateCardItems.length === 0 && (
              <div className="p-6 text-sm text-ink-muted">No rate card items yet.</div>
            )}
            {creator.rateCardItems.map((item, i) => (
              <div
                key={item.id}
                className={`flex items-center px-6 py-4 ${
                  i < creator.rateCardItems.length - 1 ? "border-b border-border" : ""
                }`}
              >
                <div className="flex-grow">
                  <div className="text-[15px] font-semibold">{item.deliverable}</div>
                  <div className="text-[13px] text-ink-muted">{item.turnaroundDays}-day turnaround</div>
                </div>
                <Money kobo={item.priceKobo} size="text-xl" />
                <button
                  onClick={() => removeItemMutation.mutate(item.id)}
                  disabled={removeItemMutation.isPending}
                  className="ml-6 text-sm text-red-600 font-semibold"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>

          <form
            className="bg-surface border border-border rounded-card p-5 flex gap-3 items-end"
            onSubmit={(e) => {
              e.preventDefault();
              addItemMutation.mutate();
            }}
          >
            <div className="flex-grow">
              <label className="block text-[12px] font-semibold mb-1.5">Deliverable</label>
              <input
                className="input"
                value={newItem.deliverable}
                onChange={(e) => setNewItem({ ...newItem, deliverable: e.target.value })}
                placeholder="1 TikTok video"
                required
              />
            </div>
            <div className="w-32">
              <label className="block text-[12px] font-semibold mb-1.5">Price (₦)</label>
              <input
                className="input"
                type="number"
                value={newItem.priceKobo / 100}
                onChange={(e) => setNewItem({ ...newItem, priceKobo: Number(e.target.value) * 100 })}
              />
            </div>
            <div className="w-28">
              <label className="block text-[12px] font-semibold mb-1.5">Days</label>
              <input
                className="input"
                type="number"
                value={newItem.turnaroundDays}
                onChange={(e) => setNewItem({ ...newItem, turnaroundDays: Number(e.target.value) })}
              />
            </div>
            <button
              type="submit"
              disabled={!isApproved || addItemMutation.isPending}
              className="bg-gradient-to-r from-accent to-accent-teal text-white text-sm font-semibold px-4 py-3 rounded-lg disabled:opacity-40"
            >
              Add
            </button>
          </form>
          {!isApproved && (
            <p className="text-xs text-ink-muted mt-2">Your profile needs to clear the eligibility gate first.</p>
          )}
        </div>
      )}

      {tab === "upfront" && (
        <div>
          <p className="text-sm text-ink-muted mb-5">
            A future content series or property people can pay to reserve a slot in before it exists —
            separate from your rate card, which is for one-off bespoke work.
          </p>
          <div className="border border-border rounded-card bg-surface overflow-hidden mb-4">
            {listingsLoading && <div className="p-6 text-sm text-ink-muted">Loading…</div>}
            {listings?.length === 0 && (
              <div className="p-6 text-sm text-ink-muted">No Upfront programs listed yet.</div>
            )}
            {listings?.map((l, i) => (
              <div
                key={l.id}
                className={`flex items-center px-6 py-4 ${
                  i < listings.length - 1 ? "border-b border-border" : ""
                }`}
              >
                <div className="flex-grow">
                  <div className="text-[15px] font-semibold">{l.title}</div>
                  <div className="text-[13px] text-ink-muted">
                    {l.slotsSold}/{l.totalSlots} slots sold · runs {new Date(l.programDate).toLocaleDateString()}
                  </div>
                </div>
                <Money kobo={l.pricePerSlotKobo} size="text-lg" />
                <ListingStatusPill status={l.gateStatus} />
              </div>
            ))}
          </div>

          <h3 className="text-sm font-semibold mb-2 mt-8">Slots sold</h3>
          <p className="text-sm text-ink-muted mb-3">
            Everyone who's bought a slot across your listings, and where their payment stands.
          </p>
          <UpfrontSalesList />

          <form
            className="bg-surface border border-border rounded-card p-5 space-y-3 mt-8"
            onSubmit={(e) => {
              e.preventDefault();
              createListingMutation.mutate();
            }}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[12px] font-semibold mb-1.5">Title</label>
                <input
                  className="input"
                  value={newListing.title}
                  onChange={(e) => setNewListing({ ...newListing, title: e.target.value })}
                  placeholder="Spring TikTok Series"
                  required
                />
              </div>
              <div>
                <label className="block text-[12px] font-semibold mb-1.5">Niche</label>
                <select
                  className="input"
                  value={newListing.niche}
                  onChange={(e) => setNewListing({ ...newListing, niche: e.target.value })}
                >
                  {NICHES.map((n) => (
                    <option key={n}>{n}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-[12px] font-semibold mb-1.5">What's the program?</label>
              <textarea
                className="input"
                rows={2}
                value={newListing.description}
                onChange={(e) => setNewListing({ ...newListing, description: e.target.value })}
                placeholder="A planned 6-part series reviewing new AI tools."
                required
              />
            </div>
            <div>
              <label className="block text-[12px] font-semibold mb-1.5">Audience / reach</label>
              <textarea
                className="input"
                rows={2}
                value={newListing.audienceSummary}
                onChange={(e) => setNewListing({ ...newListing, audienceSummary: e.target.value })}
                placeholder="34K followers, 6.1% engagement, TikTok, AI Tools niche."
                required
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div>
                <label className="block text-[12px] font-semibold mb-1.5">Price per slot (₦)</label>
                <input
                  className="input"
                  type="number"
                  value={newListing.pricePerSlotKobo / 100}
                  onChange={(e) =>
                    setNewListing({ ...newListing, pricePerSlotKobo: Number(e.target.value) * 100 })
                  }
                />
              </div>
              <div>
                <label className="block text-[12px] font-semibold mb-1.5">Total slots</label>
                <input
                  className="input"
                  type="number"
                  value={newListing.totalSlots}
                  onChange={(e) => setNewListing({ ...newListing, totalSlots: Number(e.target.value) })}
                />
              </div>
              <div>
                <label className="block text-[12px] font-semibold mb-1.5">Program date</label>
                <input
                  className="input"
                  type="date"
                  value={newListing.programDate}
                  onChange={(e) => setNewListing({ ...newListing, programDate: e.target.value })}
                  required
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={!isApproved || createListingMutation.isPending}
              className="bg-gradient-to-r from-accent to-accent-teal text-white text-sm font-semibold px-4 py-3 rounded-lg disabled:opacity-40"
            >
              {createListingMutation.isPending ? "Submitting…" : "Submit for review"}
            </button>
            {!isApproved && (
              <p className="text-xs text-ink-muted">Your profile needs to clear the eligibility gate first.</p>
            )}
            {createListingMutation.isError && (
              <p className="text-sm text-red-600">{(createListingMutation.error as Error).message}</p>
            )}
          </form>
        </div>
      )}
    </div>
  );
}

function GateBadge({ status }: { status?: string }) {
  const styles: Record<string, string> = {
    APPROVED: "bg-money text-white",
    PENDING: "bg-accent/10 text-accent",
    REJECTED: "bg-red-600 text-white"
  };
  return (
    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${styles[status ?? "PENDING"]}`}>
      {status === "APPROVED" ? "Approved" : status === "REJECTED" ? "Not eligible yet" : "Pending"}
    </span>
  );
}

function ListingStatusPill({ status }: { status: string }) {
  const styles: Record<string, string> = {
    APPROVED: "bg-money text-white",
    PENDING: "bg-accent/10 text-accent",
    REJECTED: "bg-red-600 text-white"
  };
  return (
    <span className={`ml-4 text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0 ${styles[status]}`}>
      {status}
    </span>
  );
}
