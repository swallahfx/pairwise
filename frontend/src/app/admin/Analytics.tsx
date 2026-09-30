"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Money } from "@/components/ui/Money";

export function Analytics() {
  const { data, isLoading } = useQuery({ queryKey: ["admin-analytics"], queryFn: api.analytics.summary });

  if (isLoading || !data) return <p className="text-ink-muted">Loading…</p>;

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total GMV (paid)">
          <Money kobo={data.gmvKobo} size="text-2xl" />
        </StatCard>
        <StatCard label="Platform fee revenue">
          <Money kobo={data.platformFeeKobo} size="text-2xl" />
        </StatCard>
        <StatCard label="Reviews · Q&A">
          <div className="font-display text-2xl font-bold">
            {data.totalReviews} <span className="text-base text-ink-muted font-semibold">reviews</span>
          </div>
          <div className="text-[13px] text-ink-muted mt-0.5">
            {data.answeredQuestions}/{data.totalQuestions} questions answered
          </div>
        </StatCard>
        <StatCard label="Products · Open requests">
          <div className="font-display text-2xl font-bold">
            {data.totalProducts} <span className="text-base text-ink-muted font-semibold">products</span>
          </div>
          <div className="text-[13px] text-ink-muted mt-0.5">{data.openRequests} open requests</div>
        </StatCard>
      </div>

      <div className="bg-surface border border-border rounded-card p-5 mb-8">
        <div className="text-[13px] font-semibold text-ink-muted mb-4">GMV, last 30 days</div>
        <RevenueChart rows={data.revenueByDay} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
        <BreakdownCard title="Orders by status" rows={data.ordersByStatus} />
        <BreakdownCard title="Upfront purchases by status" rows={data.purchasesByStatus} />
        <BreakdownCard title="Offers by status" rows={data.offersByStatus} />
        <BreakdownCard title="Offers by source" rows={data.offersBySource} />
        <BreakdownCard title="Users by role" rows={data.usersByRole.map((r) => ({ status: r.role, count: r.count }))} />
        <BreakdownCard title="Creators by review status" rows={data.creatorsByGateStatus} />
        <BreakdownCard title="Listings by review status" rows={data.listingsByGateStatus} />
        <TopCreatorsCard rows={data.topCreatorsByEarnings} />
      </div>
    </div>
  );
}

function StatCard({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="bg-surface border border-border rounded-card p-5">
      <div className="text-[13px] font-semibold text-ink-muted mb-1.5">{label}</div>
      {children}
    </div>
  );
}

function BreakdownCard({ title, rows }: { title: string; rows: { status: string; count: number }[] }) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <div className="bg-surface border border-border rounded-card p-5">
      <div className="text-[13px] font-semibold text-ink-muted mb-3">{title}</div>
      <div className="space-y-2">
        {rows.map((r) => (
          <div key={r.status} className="flex items-center gap-3">
            <div className="w-32 text-xs text-ink-muted flex-shrink-0">{r.status.replace("_", " ")}</div>
            <div className="flex-grow h-2 bg-ground rounded-full overflow-hidden">
              <div className="h-full bg-accent rounded-full" style={{ width: `${(r.count / max) * 100}%` }} />
            </div>
            <div className="w-6 text-xs font-semibold text-right flex-shrink-0">{r.count}</div>
          </div>
        ))}
        {rows.length === 0 && <div className="text-xs text-ink-muted">No data yet.</div>}
      </div>
    </div>
  );
}

function TopCreatorsCard({ rows }: { rows: { name: string; handle: string; earningsKobo: number }[] }) {
  const max = Math.max(1, ...rows.map((r) => r.earningsKobo));
  return (
    <div className="bg-surface border border-border rounded-card p-5">
      <div className="text-[13px] font-semibold text-ink-muted mb-3">Top creators by bespoke-order earnings</div>
      <div className="space-y-2">
        {rows.map((r) => (
          <div key={r.handle} className="flex items-center gap-3">
            <div className="w-32 text-xs text-ink-muted flex-shrink-0 truncate">{r.name}</div>
            <div className="flex-grow h-2 bg-ground rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-accent to-accent-teal rounded-full"
                style={{ width: `${(r.earningsKobo / max) * 100}%` }}
              />
            </div>
            <div className="w-20 text-xs font-semibold text-right flex-shrink-0">
              <Money kobo={r.earningsKobo} size="text-xs" />
            </div>
          </div>
        ))}
        {rows.length === 0 && <div className="text-xs text-ink-muted">No paid orders yet.</div>}
      </div>
    </div>
  );
}

function RevenueChart({ rows }: { rows: { date: string; gmvKobo: number }[] }) {
  const max = Math.max(1, ...rows.map((r) => r.gmvKobo));
  const total = rows.reduce((sum, r) => sum + r.gmvKobo, 0);

  if (total === 0) {
    return <div className="text-xs text-ink-muted">No paid revenue in the last 30 days.</div>;
  }

  return (
    <div className="flex items-end gap-[3px] h-32">
      {rows.map((r) => (
        <div key={r.date} className="flex-1 group relative">
          <div
            className="w-full bg-gradient-to-t from-accent to-accent-teal rounded-sm min-h-[2px]"
            style={{ height: `${Math.max(2, (r.gmvKobo / max) * 128)}px` }}
          />
          <div className="hidden group-hover:block absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 bg-ink text-white text-[11px] px-2 py-1 rounded whitespace-nowrap z-10">
            {new Date(r.date).toLocaleDateString("en-NG", { month: "short", day: "numeric" })} · ₦
            {(r.gmvKobo / 100).toLocaleString("en-NG")}
          </div>
        </div>
      ))}
    </div>
  );
}
