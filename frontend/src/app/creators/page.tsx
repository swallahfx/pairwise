"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { api } from "@/lib/api";
import { Pill } from "@/components/ui/Pill";
import { Money } from "@/components/ui/Money";
import { Rating } from "@/components/ui/Rating";
import { SaveButton } from "@/components/ui/SaveButton";

const NICHES = ["AI Tools", "Dev Tools", "SaaS", "Indie Apps", "Productivity", "Fintech"];

export default function CreatorsDirectoryPage() {
  const [selected, setSelected] = useState<string[]>([]);
  const [sort, setSort] = useState<"price_asc" | "price_desc">("price_asc");
  const [platform, setPlatform] = useState("all");
  const [search, setSearch] = useState("");

  const { data: creators, isLoading } = useQuery({
    queryKey: ["creators", sort],
    queryFn: () => api.creators.list({ sort })
  });

  const platforms = useMemo(
    () => Array.from(new Set(creators?.map((c) => c.platform) ?? [])).sort(),
    [creators]
  );

  const filtered = useMemo(() => {
    if (!creators) return [];
    const query = search.trim().toLowerCase();
    return creators.filter((c) => {
      if (selected.length > 0 && !c.nicheTags.some((t) => selected.includes(t))) return false;
      if (platform !== "all" && c.platform !== platform) return false;
      if (query && !c.user.name.toLowerCase().includes(query) && !c.handle.toLowerCase().includes(query)) {
        return false;
      }
      return true;
    });
  }, [creators, selected, platform, search]);

  function toggleNiche(name: string) {
    setSelected((prev) => (prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]));
  }

  return (
    <div>
      <div className="px-4 sm:px-8 lg:px-14 pt-12 pb-7 max-w-3xl">
        <h1 className="font-display text-4xl font-semibold leading-tight tracking-tight mb-3">
          Find creators who already cover your niche.
        </h1>
        <p className="text-ink-muted text-base leading-relaxed">
          Every rate is listed up front. Filter by niche, compare prices, book directly — or send a
          custom offer if your budget&apos;s different.
        </p>
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
            onChange={(e) => setSort(e.target.value as "price_asc" | "price_desc")}
          >
            <option value="price_asc">Price: low to high</option>
            <option value="price_desc">Price: high to low</option>
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

      <div className="px-4 sm:px-8 lg:px-14 py-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading && <p className="text-ink-muted">Loading creators…</p>}
        {filtered.map((c) => {
          const cheapest = c.rateCardItems[0];
          return (
            <Link key={c.id} href={`/creators/${c.id}`} className="block">
              <div className="bg-surface border border-border rounded-card p-6 flex flex-col gap-4 h-full">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-ground border border-border flex items-center justify-center font-display font-semibold text-sm">
                    {c.user.name.split(" ").map((p) => p[0]).join("")}
                  </div>
                  <div className="flex-grow">
                    <div className="font-semibold text-[15px]">{c.user.name}</div>
                    <div className="text-[13px] text-ink-muted">{c.handle}</div>
                  </div>
                  <SaveButton creatorId={c.id} size="text-xl" />
                </div>
                <Rating avgRating={c.avgRating} reviewCount={c.reviewCount} size="text-[13px]" />
                <div className="flex gap-2 flex-wrap">
                  {c.nicheTags.map((t) => (
                    <span key={t} className="text-xs px-2.5 py-1 rounded-full bg-ground border border-border text-ink-muted">
                      {t}
                    </span>
                  ))}
                  <span className="text-xs px-2.5 py-1 rounded-full bg-ground border border-border text-ink-muted">
                    {(c.followerCount / 1000).toFixed(0)}K · {c.platform}
                  </span>
                </div>
                {cheapest && (
                  <div className="mt-auto pt-4 border-t border-border flex items-baseline justify-between">
                    <div>
                      <Money kobo={cheapest.priceKobo} size="text-3xl" />
                      <div className="text-xs text-ink-muted mt-1">{cheapest.deliverable}</div>
                    </div>
                    <span className="text-sm font-semibold text-accent">View rate card →</span>
                  </div>
                )}
              </div>
            </Link>
          );
        })}
        {!isLoading && filtered.length === 0 && (
          <div className="col-span-3 py-16 text-center text-ink-muted">No creators match those niches yet.</div>
        )}
      </div>
    </div>
  );
}
