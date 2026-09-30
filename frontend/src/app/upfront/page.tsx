"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { api } from "@/lib/api";
import { Pill } from "@/components/ui/Pill";
import { Money } from "@/components/ui/Money";
import { Rating } from "@/components/ui/Rating";
import { Pagination } from "@/components/ui/Pagination";

const NICHES = ["AI Tools", "Dev Tools", "SaaS", "Indie Apps", "Productivity", "Fintech"];
const TOP_COUNT = 5;
const PAGE_SIZE = 5;

export default function UpfrontDirectoryPage() {
  const [selected, setSelected] = useState<string[]>([]);
  const [listerType, setListerType] = useState<"all" | "CREATOR" | "BRAND">("all");
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [page, setPage] = useState(1);

  const { data: listings, isLoading } = useQuery({ queryKey: ["upfront"], queryFn: () => api.upfront.list() });

  const isFiltering = selected.length > 0 || listerType !== "all" || search.trim() !== "";

  const filtered = useMemo(() => {
    if (!listings) return [];
    const query = search.trim().toLowerCase();
    return listings.filter((l) => {
      if (selected.length > 0 && !selected.includes(l.niche)) return false;
      if (listerType !== "all" && l.listerType !== listerType) return false;
      if (query && !l.title.toLowerCase().includes(query) && !l.description.toLowerCase().includes(query)) {
        return false;
      }
      return true;
    });
  }, [listings, selected, listerType, search]);

  const showAll = expanded || isFiltering;

  useEffect(() => {
    setPage(1);
  }, [selected, listerType, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const visible = showAll ? paged : filtered.slice(0, TOP_COUNT);

  function toggleNiche(name: string) {
    setSelected((prev) => (prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]));
  }

  return (
    <div>
      <div className="bg-gradient-to-br from-accent/5 to-accent-teal/5">
        <div className="px-4 sm:px-8 lg:px-14 pt-12 pb-7 max-w-3xl">
          <h1 className="font-display text-4xl font-semibold leading-tight tracking-tight mb-3">
            Reserve a slot before it exists.
          </h1>
          <p className="text-ink-muted text-base leading-relaxed">
            Creators and brands list upcoming programs with a described audience — pay upfront to
            reserve a slot, funds release once the program actually runs.
          </p>
        </div>
      </div>

      <div className="px-4 sm:px-8 lg:px-14 pb-5 flex items-center gap-3 flex-wrap">
        <input
          type="search"
          className="input max-w-xs"
          placeholder="Search programs…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="border border-border rounded-lg px-3 py-2 text-sm bg-surface"
          value={listerType}
          onChange={(e) => setListerType(e.target.value as "all" | "CREATOR" | "BRAND")}
        >
          <option value="all">Creators & brands</option>
          <option value="CREATOR">Creators only</option>
          <option value="BRAND">Brands only</option>
        </select>
      </div>

      <div className="px-4 sm:px-8 lg:px-14 pb-7 border-b border-border flex items-center gap-3 flex-wrap">
        {NICHES.map((n) => (
          <Pill key={n} active={selected.includes(n)} onClick={() => toggleNiche(n)}>
            {n}
          </Pill>
        ))}
      </div>

      <div className="px-4 sm:px-8 lg:px-14 py-10">
        {!showAll && (
          <h2 className="text-sm font-semibold text-ink-muted uppercase tracking-wide mb-4">Top programs</h2>
        )}

        {isLoading && <p className="text-ink-muted">Loading programs…</p>}

        {!isLoading && filtered.length === 0 && (
          <div className="py-16 text-center text-ink-muted">No programs match those niches yet.</div>
        )}

        {visible.length > 0 && (
          <div className="border border-border rounded-card bg-surface overflow-hidden">
            {visible.map((l, i) => {
              const listerName = l.listerType === "CREATOR" ? l.creator?.user.name : l.brand?.companyName;
              const remaining = l.totalSlots - l.slotsSold;
              return (
                <Link key={l.id} href={`/upfront/${l.id}`} className="block hover:bg-ground/50">
                  <div
                    className={`flex flex-col sm:flex-row sm:items-center gap-4 px-5 sm:px-6 py-5 ${
                      i < visible.length - 1 ? "border-b border-border" : ""
                    }`}
                  >
                    <div className="flex-grow min-w-0">
                      <div className="font-semibold text-[15px]">{l.title}</div>
                      <div className="text-[13px] text-ink-muted mt-0.5">
                        {listerName} · {l.listerType === "CREATOR" ? "Creator" : "Brand"}
                      </div>
                      <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                        <Rating avgRating={l.avgRating} reviewCount={l.reviewCount} size="text-[13px]" />
                        <span className="text-xs px-2.5 py-1 rounded-full bg-ground border border-border text-ink-muted">
                          {l.niche}
                        </span>
                        <span className="text-xs px-2.5 py-1 rounded-full bg-ground border border-border text-ink-muted">
                          {remaining > 0 ? `${remaining} slot${remaining === 1 ? "" : "s"} left` : "Sold out"}
                        </span>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <Money kobo={l.pricePerSlotKobo} size="text-xl" />
                      <div className="text-xs text-ink-muted mt-0.5">
                        per slot · runs {new Date(l.programDate).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {!showAll && filtered.length > TOP_COUNT && (
          <div className="flex justify-center mt-6">
            <button
              onClick={() => setExpanded(true)}
              className="border border-accent text-accent rounded-lg px-6 py-2.5 text-sm font-semibold hover:bg-accent/5"
            >
              See all {filtered.length} programs →
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
