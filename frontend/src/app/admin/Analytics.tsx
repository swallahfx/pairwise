"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Money } from "@/components/ui/Money";

export function Analytics() {
  const { data, isLoading } = useQuery({ queryKey: ["admin-analytics"], queryFn: api.analytics.summary });

  if (isLoading || !data) return <p className="text-ink-muted">Loading…</p>;

  return (
    <div>
      <div className="grid grid-cols-3 gap-4 mb-8">
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
      </div>

      <div className="grid grid-cols-2 gap-6">
        <BreakdownCard title="Orders by status" rows={data.ordersByStatus} />
        <BreakdownCard title="Upfront purchases by status" rows={data.purchasesByStatus} />
        <BreakdownCard title="Users by role" rows={data.usersByRole.map((r) => ({ status: r.role, count: r.count }))} />
        <BreakdownCard title="Creators by review status" rows={data.creatorsByGateStatus} />
        <BreakdownCard title="Listings by review status" rows={data.listingsByGateStatus} />
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
