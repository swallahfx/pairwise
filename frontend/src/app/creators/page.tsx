"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { api } from "@/lib/api";
import { Pill } from "@/components/ui/Pill";
import { Money } from "@/components/ui/Money";
import { Rating } from "@/components/ui/Rating";
import { SaveButton } from "@/components/ui/SaveButton";
import { Pagination } from "@/components/ui/Pagination";
import { useAuth } from "@/lib/auth";

const NICHES = ["AI Tools", "Dev Tools", "SaaS", "Indie Apps", "Productivity", "Fintech"];
const TOP_COUNT = 5;
const PAGE_SIZE = 5;

export default function CreatorsDirectoryPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const canSeeRates = user?.role === "DEVELOPER" || user?.role === "ADMIN";

  useEffect(() => {
    if (!user) return;
    api.badges.markViewed("creators").then(() => queryClient.invalidateQueries({ queryKey: ["badge-counts"] }));
    // Fires once per page visit, not on every filter/sort change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.userId]);

  const [selected, setSelected] = useState<string[]>([]);
  const [sort, setSort] = useState<"top" | "price_asc" | "price_desc">("top");
  const [platform, setPlatform] = useState("all");
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [page, setPage] = useState(1);

  const { data: creators, isLoading } = useQuery({
    queryKey: ["creators", sort],
    queryFn: () => api.creators.list(sort === "top" ? {} : { sort })
  });

  const platforms = useMemo(
    () => Array.from(new Set(creators?.map((c) => c.platform) ?? [])).sort(),
    [creators]
  );

  const isFiltering = selected.length > 0 || platform !== "all" || search.trim() !== "";

  const filtered = useMemo(() => {
    if (!creators) return [];
    const query = search.trim().toLowerCase();
    const matches = creators.filter((c) => {
      if (selected.length > 0 && !c.nicheTags.some((t) => selected.includes(t))) return false;
      if (platform !== "all" && c.platform !== platform) return false;
      if (query && !c.user.name.toLowerCase().includes(query) && !c.handle.toLowerCase().includes(query)) {
        return false;
      }
      return true;
    });
    if (sort !== "top") return matches;
    // "Top rated" ranks reviewed creators (best rating, then most reviews)
    // ahead of unreviewed ones, who fall back to follower count so the
    // directory isn't front-loaded with untested profiles.
    return [...matches].sort((a, b) => {
      const aReviewed = (a.reviewCount ?? 0) > 0;
      const bReviewed = (b.reviewCount ?? 0) > 0;
      if (aReviewed !== bReviewed) return aReviewed ? -1 : 1;
      if (aReviewed && bReviewed) {
        const ratingDiff = (b.avgRating ?? 0) - (a.avgRating ?? 0);
        if (ratingDiff !== 0) return ratingDiff;
        if (a.reviewCount !== b.reviewCount) return (b.reviewCount ?? 0) - (a.reviewCount ?? 0);
      }
      return b.followerCount - a.followerCount;
    });
  }, [creators, selected, platform, search, sort]);

  // Any active search/filter jumps straight to the full paginated list —
  // the top-5 teaser only makes sense for the unfiltered "browse" state,
  // since searching for something that isn't in the top 5 would otherwise
  // just look like an empty result.
  const showAll = expanded || isFiltering;

  useEffect(() => {
    setPage(1);
  }, [selected, platform, search, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const topFive = filtered.slice(0, TOP_COUNT);
  const visible = showAll ? paged : topFive;

  function toggleNiche(name: string) {
    setSelected((prev) => (prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]));
  }

  return (
    <div>
      <div className="bg-gradient-to-br from-accent/5 to-accent-teal/5">
        <div className="px-4 sm:px-8 lg:px-14 pt-12 pb-7 max-w-3xl">
          <h1 className="font-display text-4xl font-semibold leading-tight tracking-tight mb-3">
            Find creators who already cover your niche.
          </h1>
          <p className="text-ink-muted text-base leading-relaxed">
            Every rate is listed up front. Filter by niche, compare prices, book directly — or send a
            custom offer if your budget&apos;s different.
          </p>
        </div>
      </div>

      <div className="px-4 sm:px-8 lg:px-14 pb-5 flex items-center gap-3 flex-wrap">
        <input
          type="search"
          className="input max-w-xs"
          placeholder="Search by name or handle…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="border border-border rounded-lg px-3 py-2 text-sm bg-surface"
          value={platform}
          onChange={(e) => setPlatform(e.target.value)}
        >
          <option value="all">All platforms</option>
          {platforms.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <div className="ml-auto flex items-center gap-2.5">
          <label className="text-sm text-ink-muted">Sort</label>
          <select
            className="border border-border rounded-lg px-3 py-2 text-sm bg-surface"
            value={sort}
            onChange={(e) => setSort(e.target.value as "top" | "price_asc" | "price_desc")}
          >
            <option value="top">Top rated</option>
            {canSeeRates && (
              <>
                <option value="price_asc">Price: low to high</option>
                <option value="price_desc">Price: high to low</option>
              </>
            )}
          </select>
        </div>
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
          <h2 className="text-sm font-semibold text-ink-muted uppercase tracking-wide mb-4">
            Top rated creators
          </h2>
        )}

        {isLoading && <p className="text-ink-muted">Loading creators…</p>}

        {!isLoading && filtered.length === 0 && (
          <div className="py-16 text-center text-ink-muted">No creators match those niches yet.</div>
        )}

        {visible.length > 0 && (
          <div className="border border-border rounded-card bg-surface overflow-hidden">
            {visible.map((c, i) => {
              const cheapest = c.rateCardItems[0];
              return (
                <Link key={c.id} href={`/creators/${c.id}`} className="block hover:bg-ground/50">
                  <div
                    className={`flex flex-col sm:flex-row sm:items-center gap-4 px-5 sm:px-6 py-5 ${
                      i < visible.length - 1 ? "border-b border-border" : ""
                    }`}
                  >
                    <div className="w-11 h-11 flex-shrink-0 rounded-full bg-ground border border-border flex items-center justify-center font-display font-semibold text-sm">
                      {c.user.name.split(" ").map((p) => p[0]).join("")}
                    </div>
                    <div className="flex-grow min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-[15px]">{c.user.name}</span>
                        <span className="text-[13px] text-ink-muted">{c.handle}</span>
                      </div>
                      <div className="mt-1 flex items-center gap-2 flex-wrap">
                        <Rating avgRating={c.avgRating} reviewCount={c.reviewCount} size="text-[13px]" />
                        <span className="text-xs px-2.5 py-1 rounded-full bg-ground border border-border text-ink-muted">
                          {c.nicheTags[0]}
                        </span>
                        <span className="text-xs px-2.5 py-1 rounded-full bg-ground border border-border text-ink-muted">
                          {(c.followerCount / 1000).toFixed(0)}K · {c.platform}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 flex-shrink-0 sm:justify-end">
                      {c.ratesHidden ? (
                        <div className="text-xs text-ink-muted text-right max-w-[110px]">
                          Rates visible to businesses
                        </div>
                      ) : (
                        cheapest && (
                          <div className="text-right">
                            <Money kobo={cheapest.priceKobo} size="text-xl" />
                            <div className="text-xs text-ink-muted mt-0.5">{cheapest.deliverable}</div>
                          </div>
                        )
                      )}
                      <SaveButton creatorId={c.id} size="text-xl" />
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
              See all {filtered.length} creators →
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
