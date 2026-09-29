"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { api } from "@/lib/api";

const NICHES = ["AI Tools", "Dev Tools", "SaaS", "Indie Apps", "Productivity", "Fintech"];
const MONETIZATION_LABELS: Record<string, string> = {
  PRE_REVENUE: "Pre-revenue",
  EARLY_REVENUE: "Early revenue",
  ESTABLISHED: "Established"
};

export default function ProductsPage() {
  const { data: products, isLoading } = useQuery({ queryKey: ["products"], queryFn: api.products.list });
  const [niche, setNiche] = useState("all");
  const [monetizationStatus, setMonetizationStatus] = useState("all");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!products) return [];
    const query = search.trim().toLowerCase();
    return products.filter((p) => {
      if (niche !== "all" && p.niche !== niche) return false;
      if (monetizationStatus !== "all" && p.monetizationStatus !== monetizationStatus) return false;
      if (query && !p.name.toLowerCase().includes(query) && !p.pitch.toLowerCase().includes(query)) {
        return false;
      }
      return true;
    });
  }, [products, niche, monetizationStatus, search]);

  return (
    <div className="px-4 sm:px-8 lg:px-14 py-12">
      <h1 className="font-display text-4xl font-semibold mb-3">See what&apos;s being built.</h1>
      <p className="text-ink-muted mb-7 max-w-xl">
        Real traction, not just a pitch — creators can check what a product actually does before they
        respond to a request.
      </p>

      <div className="pb-7 mb-3 border-b border-border flex items-center gap-3 flex-wrap">
        <input
          type="search"
          className="input max-w-xs"
          placeholder="Search products…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="border border-border rounded-lg px-3 py-2 text-sm bg-surface"
          value={niche}
          onChange={(e) => setNiche(e.target.value)}
        >
          <option value="all">All niches</option>
          {NICHES.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
        <select
          className="border border-border rounded-lg px-3 py-2 text-sm bg-surface"
          value={monetizationStatus}
          onChange={(e) => setMonetizationStatus(e.target.value)}
        >
          <option value="all">Any stage</option>
          {Object.entries(MONETIZATION_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {isLoading && <p className="text-ink-muted">Loading…</p>}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map((p) => (
          <Link key={p.id} href={`/products/${p.id}`} className="block">
            <div className="bg-surface border border-border rounded-card p-6 flex flex-col gap-4 h-full">
              <div>
                <div className="font-semibold text-[16px]">{p.name}</div>
                <div className="text-[13px] text-ink-muted mt-1">{p.pitch}</div>
              </div>
              <span className="text-xs px-2.5 py-1 rounded-full bg-ground border border-border text-ink-muted w-fit">
                {p.niche}
              </span>
              <div className="mt-auto pt-4 border-t border-border">
                <div className="font-display text-2xl font-bold">
                  {p.mrrKobo ? `₦${(p.mrrKobo / 100).toLocaleString("en-NG")}` : "Pre-revenue"}
                </div>
                <div className="text-xs text-ink-muted mt-1">{p.mrrKobo ? "MRR" : "Just launched"}</div>
              </div>
            </div>
          </Link>
        ))}
        {!isLoading && filtered.length === 0 && (
          <div className="col-span-3 py-16 text-center text-ink-muted">No products match those filters.</div>
        )}
      </div>
    </div>
  );
}
