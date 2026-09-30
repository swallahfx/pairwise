"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { api } from "@/lib/api";
import { Pill } from "@/components/ui/Pill";
import { Money } from "@/components/ui/Money";
import { Rating } from "@/components/ui/Rating";

const NICHES = ["AI Tools", "Dev Tools", "SaaS", "Indie Apps", "Productivity", "Fintech"];

export default function UpfrontDirectoryPage() {
  const [selected, setSelected] = useState<string[]>([]);
  const [listerType, setListerType] = useState<"all" | "CREATOR" | "BRAND">("all");
  const [search, setSearch] = useState("");

  const { data: listings, isLoading } = useQuery({ queryKey: ["upfront"], queryFn: () => api.upfront.list() });

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

      <div className="px-4 sm:px-8 lg:px-14 py-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading && <p className="text-ink-muted">Loading programs…</p>}
        {filtered.map((l) => {
          const listerName = l.listerType === "CREATOR" ? l.creator?.user.name : l.brand?.companyName;
          const remaining = l.totalSlots - l.slotsSold;
          return (
            <Link key={l.id} href={`/upfront/${l.id}`} className="block">
              <div className="bg-surface border border-border rounded-card p-6 flex flex-col gap-4 h-full">
                <div>
                  <div className="font-semibold text-[15px]">{l.title}</div>
                  <div className="text-[13px] text-ink-muted mt-0.5">
                    {listerName} · {l.listerType === "CREATOR" ? "Creator" : "Brand"}
                  </div>
                </div>
                <Rating avgRating={l.avgRating} reviewCount={l.reviewCount} size="text-[13px]" />
                <div className="flex gap-2 flex-wrap">
                  <span className="text-xs px-2.5 py-1 rounded-full bg-ground border border-border text-ink-muted">
                    {l.niche}
                  </span>
                  <span className="text-xs px-2.5 py-1 rounded-full bg-ground border border-border text-ink-muted">
                    {remaining > 0 ? `${remaining} slot${remaining === 1 ? "" : "s"} left` : "Sold out"}
                  </span>
                </div>
                <div className="mt-auto pt-4 border-t border-border flex items-baseline justify-between">
                  <div>
                    <Money kobo={l.pricePerSlotKobo} size="text-2xl" />
                    <div className="text-xs text-ink-muted mt-1">per slot</div>
                  </div>
                  <span className="text-xs text-ink-muted">
                    Runs {new Date(l.programDate).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </Link>
          );
        })}
        {!isLoading && filtered.length === 0 && (
          <div className="col-span-3 py-16 text-center text-ink-muted">No programs match those niches yet.</div>
        )}
      </div>
    </div>
  );
}
