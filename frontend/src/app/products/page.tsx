"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { api } from "@/lib/api";
import { Pagination } from "@/components/ui/Pagination";

const NICHES = ["AI Tools", "Dev Tools", "SaaS", "Indie Apps", "Productivity", "Fintech"];
const MONETIZATION_LABELS: Record<string, string> = {
  PRE_REVENUE: "Pre-revenue",
  EARLY_REVENUE: "Early revenue",
  ESTABLISHED: "Established"
};
const TOP_COUNT = 5;
const PAGE_SIZE = 5;

export default function ProductsPage() {
  const { data: products, isLoading } = useQuery({ queryKey: ["products"], queryFn: api.products.list });
  const [niche, setNiche] = useState("all");
  const [monetizationStatus, setMonetizationStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [page, setPage] = useState(1);

  const isFiltering = niche !== "all" || monetizationStatus !== "all" || search.trim() !== "";

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

  const showAll = expanded || isFiltering;

  useEffect(() => {
    setPage(1);
  }, [niche, monetizationStatus, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const visible = showAll ? paged : filtered.slice(0, TOP_COUNT);

  return (
    <div>
      <div className="bg-gradient-to-br from-accent/5 to-accent-teal/5 px-4 sm:px-8 lg:px-14 pt-12 pb-7">
        <h1 className="font-display text-4xl font-semibold mb-3">See what&apos;s being built.</h1>
        <p className="text-ink-muted max-w-xl">
          Real traction, not just a pitch — creators can check what a product actually does before they
          respond to a request.
        </p>
      </div>

      <div className="px-4 sm:px-8 lg:px-14 pt-5 pb-7 mb-3 border-b border-border flex items-center gap-3 flex-wrap">
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

      <div className="px-4 sm:px-8 lg:px-14 pb-12">
        {!showAll && (
          <h2 className="text-sm font-semibold text-ink-muted uppercase tracking-wide mb-4">Recent products</h2>
        )}

        {isLoading && <p className="text-ink-muted">Loading…</p>}

        {!isLoading && filtered.length === 0 && (
          <div className="py-16 text-center text-ink-muted">No products match those filters.</div>
        )}

        {visible.length > 0 && (
          <div className="border border-border rounded-card bg-surface overflow-hidden">
            {visible.map((p, i) => (
              <Link key={p.id} href={`/products/${p.id}`} className="block hover:bg-ground/50">
                <div
                  className={`flex flex-col sm:flex-row sm:items-center gap-4 px-5 sm:px-6 py-5 ${
                    i < visible.length - 1 ? "border-b border-border" : ""
                  }`}
                >
                  <div className="flex-grow min-w-0">
                    <div className="font-semibold text-[16px]">{p.name}</div>
                    <div className="text-[13px] text-ink-muted mt-1">{p.pitch}</div>
                    <span className="inline-block mt-2 text-xs px-2.5 py-1 rounded-full bg-ground border border-border text-ink-muted">
                      {p.niche}
                    </span>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="font-display text-xl font-bold">
                      {p.mrrKobo ? `₦${(p.mrrKobo / 100).toLocaleString("en-NG")}` : "Pre-revenue"}
                    </div>
                    <div className="text-xs text-ink-muted mt-0.5">{p.mrrKobo ? "MRR" : "Just launched"}</div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {!showAll && filtered.length > TOP_COUNT && (
          <div className="flex justify-center mt-6">
            <button
              onClick={() => setExpanded(true)}
              className="border border-accent text-accent rounded-lg px-6 py-2.5 text-sm font-semibold hover:bg-accent/5"
            >
              See all {filtered.length} products →
            </button>
          </div>
        )}

        {showAll && totalPages > 1 && (
          <div className="mt-6">
            <Pagination page={page} totalPages={totalPages} onChange={setPage} />
          </div>
        )}
      </div>
    </div>
  );
}
