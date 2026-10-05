"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { roleLabel } from "@/lib/roleLabel";
import { Money } from "@/components/ui/Money";
import { ManageData } from "./ManageData";
import { Analytics } from "./Analytics";

export default function AdminPage() {
  const { user, isLoading } = useAuth();
  const [tab, setTab] = useState<"creators" | "upfront" | "create" | "manage" | "analytics">("creators");

  if (isLoading) return <div className="p-14 text-ink-muted">Loading…</div>;
  if (!user) {
    return (
      <div className="p-14 text-ink-muted">
        <Link href="/login" className="text-accent font-semibold">
          Log in
        </Link>{" "}
        as an admin to see this page.
      </div>
    );
  }
  if (user.role !== "ADMIN") {
    return <div className="p-14 text-ink-muted">This page is only for admin accounts.</div>;
  }

  return (
    <div className={`px-4 sm:px-8 lg:px-14 py-12 ${tab === "manage" || tab === "analytics" ? "max-w-5xl" : "max-w-3xl"}`}>
      <h1 className="font-display text-3xl font-semibold mb-6">Admin</h1>

      <div className="flex gap-2 mb-8 border-b border-border">
        {(["creators", "upfront", "create", "manage", "analytics"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px ${
              tab === t ? "border-accent text-ink" : "border-transparent text-ink-muted"
            }`}
          >
            {t === "creators"
              ? "Creator approvals"
              : t === "upfront"
                ? "Upfront listings"
                : t === "create"
                  ? "Create user"
                  : t === "manage"
                    ? "Manage data"
                    : "Analytics"}
          </button>
        ))}
      </div>

      {tab === "creators" ? (
        <PendingCreatorsQueue />
      ) : tab === "upfront" ? (
        <PendingListingsQueue />
      ) : tab === "create" ? (
        <CreateUserForm />
      ) : tab === "manage" ? (
        <ManageData />
      ) : (
        <Analytics />
      )}
    </div>
  );
}

function PendingCreatorsQueue() {
  const queryClient = useQueryClient();
  const { data: pending, isLoading } = useQuery({
    queryKey: ["admin-pending-creators"],
    queryFn: api.creators.listPendingReview
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["admin-pending-creators"] });
  const approveMutation = useMutation({ mutationFn: (id: string) => api.creators.approve(id), onSuccess: invalidate });
  const rejectMutation = useMutation({ mutationFn: (id: string) => api.creators.reject(id), onSuccess: invalidate });

  return (
    <div>
      <p className="text-ink-muted mb-6">
        These creators clear the minimum follower/engagement bar and are waiting on a decision — approving
        lets them list a rate card and appear in the directory.
      </p>

      {isLoading && <p className="text-ink-muted">Loading…</p>}
      {pending?.length === 0 && (
        <div className="text-sm text-ink-muted border border-border rounded-card p-6 bg-surface">
          Nothing waiting on review.
        </div>
      )}

      <div className="space-y-3">
        {pending?.map((c) => (
          <div key={c.id} className="bg-surface border border-border rounded-card p-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="font-semibold text-[15px]">{c.user.name}</div>
              <div className="text-[13px] text-ink-muted mt-0.5">
                {c.user.email} · {c.handle} · {c.platform}
              </div>
              <div className="text-[13px] text-ink-muted mt-0.5">
                {(c.followerCount / 1000).toFixed(0)}K followers · {(c.engagementRate * 100).toFixed(1)}% engagement ·{" "}
                {c.nicheTags.join(", ")}
              </div>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              <button
                onClick={() => rejectMutation.mutate(c.id)}
                disabled={rejectMutation.isPending || approveMutation.isPending}
                className="text-sm font-semibold text-red-600 px-3 py-2"
              >
                Reject
              </button>
              <button
                onClick={() => approveMutation.mutate(c.id)}
                disabled={approveMutation.isPending || rejectMutation.isPending}
                className="bg-gradient-to-r from-accent to-accent-teal text-white text-sm font-semibold px-4 py-2 rounded-lg disabled:opacity-60"
              >
                Approve
              </button>
            </div>
          </div>
        ))}
      </div>
      {(approveMutation.isError || rejectMutation.isError) && (
        <p className="text-sm text-red-600 mt-3">
          {((approveMutation.error ?? rejectMutation.error) as Error).message}
        </p>
      )}
    </div>
  );
}

function PendingListingsQueue() {
  const queryClient = useQueryClient();
  const { data: pending, isLoading } = useQuery({
    queryKey: ["admin-pending-listings"],
    queryFn: api.upfront.listPendingReview
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["admin-pending-listings"] });
  const approveMutation = useMutation({ mutationFn: (id: string) => api.upfront.approve(id), onSuccess: invalidate });
  const rejectMutation = useMutation({ mutationFn: (id: string) => api.upfront.reject(id), onSuccess: invalidate });

  return (
    <div>
      <p className="text-ink-muted mb-6">
        New Upfront programs from creators and brands, judged on the submitted details — audience claims,
        pricing, and program description. Approving makes it visible in the public directory.
      </p>

      {isLoading && <p className="text-ink-muted">Loading…</p>}
      {pending?.length === 0 && (
        <div className="text-sm text-ink-muted border border-border rounded-card p-6 bg-surface">
          Nothing waiting on review.
        </div>
      )}

      <div className="space-y-3">
        {pending?.map((l) => {
          const listerName = l.listerType === "CREATOR" ? l.creator?.user.name : l.brand?.companyName;
          return (
            <div key={l.id} className="bg-surface border border-border rounded-card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                <div>
                  <div className="font-semibold text-[15px]">{l.title}</div>
                  <div className="text-[13px] text-ink-muted mt-0.5">
                    {listerName} · {l.listerType === "CREATOR" ? "Creator" : "Brand"} · {l.niche}
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <Money kobo={l.pricePerSlotKobo} size="text-lg" />
                  <button
                    onClick={() => rejectMutation.mutate(l.id)}
                    disabled={rejectMutation.isPending || approveMutation.isPending}
                    className="text-sm font-semibold text-red-600 px-3 py-2"
                  >
                    Reject
                  </button>
                  <button
                    onClick={() => approveMutation.mutate(l.id)}
                    disabled={approveMutation.isPending || rejectMutation.isPending}
                    className="bg-gradient-to-r from-accent to-accent-teal text-white text-sm font-semibold px-4 py-2 rounded-lg disabled:opacity-60"
                  >
                    Approve
                  </button>
                </div>
              </div>
              <p className="text-[13px] text-ink-muted mb-1.5">{l.description}</p>
              <p className="text-[13px] text-ink-muted">
                {l.audienceSummary} · {l.totalSlots} slots · runs{" "}
                {new Date(l.programDate).toLocaleDateString()}
              </p>
            </div>
          );
        })}
      </div>
      {(approveMutation.isError || rejectMutation.isError) && (
        <p className="text-sm text-red-600 mt-3">
          {((approveMutation.error ?? rejectMutation.error) as Error).message}
        </p>
      )}
    </div>
  );
}

const NICHES = ["AI Tools", "Dev Tools", "SaaS", "Indie Apps", "Productivity", "Fintech"];
const ROLES = ["DEVELOPER", "CREATOR", "BRAND", "ADMIN"] as const;
type CreatableRole = (typeof ROLES)[number];

// The one place any account type can be stood up directly rather than
// through self-serve signup — onboarding a partner brand, pre-approving a
// known creator, or seeding another admin without them registering first.
function CreateUserForm() {
  const [form, setForm] = useState({
    role: "CREATOR" as CreatableRole,
    name: "",
    email: "",
    password: "",
    handle: "",
    platform: "",
    followerCount: 0,
    engagementPercent: 0,
    nicheTags: [] as string[],
    preApprove: true,
    companyName: "",
    website: "",
    industry: ""
  });

  const createMutation = useMutation({
    mutationFn: () =>
      api.auth.adminCreateUser({
        role: form.role,
        name: form.name,
        email: form.email,
        password: form.password,
        ...(form.role === "CREATOR"
          ? {
              handle: form.handle,
              platform: form.platform,
              followerCount: form.followerCount,
              engagementRate: form.engagementPercent / 100,
              nicheTags: form.nicheTags,
              preApprove: form.preApprove
            }
          : {}),
        ...(form.role === "BRAND"
          ? { companyName: form.companyName, website: form.website, industry: form.industry }
          : {})
      })
  });

  function toggleNiche(name: string) {
    setForm((prev) => ({
      ...prev,
      nicheTags: prev.nicheTags.includes(name)
        ? prev.nicheTags.filter((n) => n !== name)
        : [...prev.nicheTags, name]
    }));
  }

  if (createMutation.isSuccess) {
    return (
      <div className="bg-surface border border-border rounded-card p-6">
        <p className="text-sm font-semibold text-money mb-4">
          Created {createMutation.data.email} as {roleLabel(createMutation.data.role).toLowerCase()}.
        </p>
        <button onClick={() => createMutation.reset()} className="text-sm font-semibold text-accent">
          Create another →
        </button>
      </div>
    );
  }

  return (
    <form
      className="bg-surface border border-border rounded-card p-6 space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        createMutation.mutate();
      }}
    >
      <p className="text-ink-muted -mt-1 mb-1">
        Stand up an account of any type directly — no self-serve signup needed. Useful for onboarding a
        partner brand, pre-approving a known creator, or adding another admin.
      </p>

      <div>
        <label className="block text-[13px] font-semibold mb-2">Account type</label>
        <div className="flex gap-2.5">
          {ROLES.map((role) => (
            <button
              type="button"
              key={role}
              onClick={() => setForm({ ...form, role })}
              className={`flex-1 py-2.5 rounded-lg text-sm font-semibold border ${
                form.role === role ? "bg-gradient-to-r from-accent to-accent-teal text-white border-accent" : "bg-surface border-border"
              }`}
            >
              {roleLabel(role)}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <label className="block text-[13px] font-semibold mb-2">Name</label>
          <input
            className="input"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
        </div>
        <div>
          <label className="block text-[13px] font-semibold mb-2">Email</label>
          <input
            className="input"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
          />
        </div>
        <div>
          <label className="block text-[13px] font-semibold mb-2">Password</label>
          <input
            className="input"
            type="password"
            minLength={8}
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
          />
        </div>
      </div>

      {form.role === "CREATOR" && (
        <div className="border-t border-border pt-5 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-[13px] font-semibold mb-2">Handle</label>
              <input
                className="input"
                value={form.handle}
                onChange={(e) => setForm({ ...form, handle: e.target.value })}
                placeholder="@handle"
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
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.preApprove}
              onChange={(e) => setForm({ ...form, preApprove: e.target.checked })}
            />
            Pre-approve — skip the review queue and let them list a rate card immediately.
          </label>
        </div>
      )}

      {form.role === "BRAND" && (
        <div className="border-t border-border pt-5 grid grid-cols-1 sm:grid-cols-2 gap-5">
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
      )}

      <button
        type="submit"
        disabled={createMutation.isPending}
        className="bg-gradient-to-r from-accent to-accent-teal text-white text-sm font-semibold px-5 py-2.5 rounded-lg disabled:opacity-60"
      >
        {createMutation.isPending ? "Creating…" : "Create account"}
      </button>
      {createMutation.isError && (
        <p className="text-sm text-red-600">{(createMutation.error as Error).message}</p>
      )}
    </form>
  );
}
