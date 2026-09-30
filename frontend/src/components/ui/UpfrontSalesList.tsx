"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Money } from "@/components/ui/Money";
import { UpfrontPurchaseStatus } from "@/types";

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

// Fills the gap where a lister's own "Upfront" tab only ever showed an
// aggregate slotsSold count on each listing — this is the individual buyers
// behind that count, their funding/approval status, and what they paid.
// Read-only: fund/approve is buyer-driven (or the 7-day auto-sweep), so
// there's nothing for the lister to act on here, only to see.
export function UpfrontSalesList() {
  const { data: sales, isLoading } = useQuery({
    queryKey: ["upfront", "mySales"],
    queryFn: () => api.upfront.mySales()
  });

  return (
    <div className="border border-border rounded-card bg-surface overflow-hidden">
      {isLoading && <div className="p-6 text-sm text-ink-muted">Loading…</div>}
      {sales?.length === 0 && (
        <div className="p-6 text-sm text-ink-muted">No slots sold yet on any of your listings.</div>
      )}
      {sales?.map((s, i) => (
        <div
          key={s.id}
          className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-6 py-4 ${
            i < sales.length - 1 ? "border-b border-border" : ""
          }`}
        >
          <div>
            <div className="text-[15px] font-semibold">{s.buyer.name}</div>
            <div className="text-[13px] text-ink-muted">
              {s.listing.title} · bought {new Date(s.createdAt).toLocaleDateString()}
            </div>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <Money kobo={s.totalKobo} size="text-lg" />
            {statusPill(s.status)}
          </div>
        </div>
      ))}
    </div>
  );
}
