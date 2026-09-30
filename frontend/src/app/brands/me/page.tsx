"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { api } from "@/lib/api";
import { hasRole, useAuth } from "@/lib/auth";
import { Money } from "@/components/ui/Money";
import { PayoutAccountForm } from "@/components/ui/PayoutAccountForm";
import { UpfrontSalesList } from "@/components/ui/UpfrontSalesList";

const NICHES = ["AI Tools", "Dev Tools", "SaaS", "Indie Apps", "Productivity", "Fintech"];
const TABS = ["profile", "payouts", "upfront"] as const;
type Tab = (typeof TABS)[number];
const TAB_LABELS: Record<Tab, string> = {
  profile: "Profile",
  payouts: "Payouts",
  upfront: "Upfront listings"
};

export default function BrandMePage() {
  const { user, isLoading: authLoading } = useAuth();

  if (authLoading) return <div className="p-14 text-ink-muted">Loading…</div>;
  if (!user) {
    return (
      <div className="p-14 text-ink-muted">
        <Link href="/login" className="text-accent font-semibold">
          Log in
        </Link>{" "}
        as a brand to see this page.
      </div>
    );
  }
  if (!hasRole(user, "BRAND")) {
    return <div className="p-14 text-ink-muted">This page is only for brand accounts.</div>;
  }

  return <BrandMeContent />;
}

function BrandMeContent() {
  const [tab, setTab] = useState<Tab>("profile");
  const queryClient = useQueryClient();
  const { data: brand, isLoading } = useQuery({ queryKey: ["brand-me"], queryFn: api.brands.getMe });

  const [form, setForm] = useState({ companyName: "", website: "", industry: "" });
  useEffect(() => {
    if (brand) {
      setForm({ companyName: brand.companyName, website: brand.website ?? "", industry: brand.industry ?? "" });
    }
  }, [brand]);

  const profileMutation = useMutation({
    mutationFn: () => api.brands.updateMe(form),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["brand-me"] })
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
    pricePerSlotKobo: 50_000_000,
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
        pricePerSlotKobo: 50_000_000,
        totalSlots: 4,
        programDate: ""
      });
    }
  });

  if (isLoading || !brand) return <div className="p-14 text-ink-muted">Loading…</div>;

  return (
    <div className="px-4 sm:px-8 lg:px-14 py-12 max-w-3xl">
      <h1 className="font-display text-3xl font-semibold mb-1">Your brand</h1>
      <p className="text-ink-muted mb-6">{brand.companyName || "Set up your profile below."}</p>

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
      <form
        className="bg-surface border border-border rounded-card p-6 space-y-5"
        onSubmit={(e) => {
          e.preventDefault();
          profileMutation.mutate();
        }}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label className="block text-[13px] font-semibold mb-2">Company name</label>
            <input
              className="input"
              value={form.companyName}
              onChange={(e) => setForm({ ...form, companyName: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="block text-[13px] font-semibold mb-2">Website</label>
            <input
              className="input"
              type="url"
              value={form.website}
              onChange={(e) => setForm({ ...form, website: e.target.value })}
              placeholder="https://example.com"
            />
          </div>
          <div>
            <label className="block text-[13px] font-semibold mb-2">Industry</label>
            <input
              className="input"
              value={form.industry}
              onChange={(e) => setForm({ ...form, industry: e.target.value })}
              placeholder="Media"
            />
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
      )}

      {tab === "payouts" && (
      <PayoutAccountForm
        paystackRecipientCode={brand.paystackRecipientCode}
        bankAccountName={brand.bankAccountName}
        bankAccountNumber={brand.bankAccountNumber}
        isEligible={true}
        ineligibleMessage=""
        queryKey={["brand-me"]}
      />
      )}

      {tab === "upfront" && (
      <div>
        <p className="text-sm text-ink-muted mb-4">
          A future program in your media property that people can pay to reserve a slot in before it exists.
          Every new listing goes to admin review before it appears publicly.
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
                placeholder="Q1 Product Roundup Newsletter"
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
              placeholder="A dedicated feature slot in our weekly newsletter."
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
              placeholder="42,000 subscribers, ~38% open rate."
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
            disabled={createListingMutation.isPending}
            className="bg-gradient-to-r from-accent to-accent-teal text-white text-sm font-semibold px-4 py-3 rounded-lg disabled:opacity-40"
          >
            {createListingMutation.isPending ? "Submitting…" : "Submit for review"}
          </button>
          {createListingMutation.isError && (
            <p className="text-sm text-red-600">{(createListingMutation.error as Error).message}</p>
          )}
        </form>
      </div>
      )}
    </div>
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
