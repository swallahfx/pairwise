"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { hasRole, useAuth } from "@/lib/auth";
import { Money } from "@/components/ui/Money";
import { Pagination } from "@/components/ui/Pagination";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

const NICHES = ["AI Tools", "Dev Tools", "SaaS", "Indie Apps", "Productivity", "Fintech"];
const TOP_COUNT = 5;
const PAGE_SIZE = 5;

export default function RequestsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: requests, isLoading } = useQuery({ queryKey: ["requests"], queryFn: api.requests.list });
  const [appliedIds, setAppliedIds] = useState<string[]>([]);

  useEffect(() => {
    if (!user) return;
    api.badges.markViewed("requests").then(() => queryClient.invalidateQueries({ queryKey: ["badge-counts"] }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.userId]);
  const [niche, setNiche] = useState("all");
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [page, setPage] = useState(1);

  const applyMutation = useMutation({
    mutationFn: ({ requestId, brief }: { requestId: string; brief: string }) =>
      api.offers.applyToRequest(requestId, brief),
    onSuccess: (_data, variables) => setAppliedIds((prev) => [...prev, variables.requestId])
  });

  const isFiltering = niche !== "all" || search.trim() !== "";

  const filtered = useMemo(() => {
    if (!requests) return [];
    const query = search.trim().toLowerCase();
    return requests.filter((r) => {
      if (niche !== "all" && !r.nicheTags.includes(niche)) return false;
      if (query && !r.product.name.toLowerCase().includes(query) && !r.brief.toLowerCase().includes(query)) {
        return false;
      }
      return true;
    });
  }, [requests, niche, search]);

  const showAll = expanded || isFiltering;

  useEffect(() => {
    setPage(1);
  }, [niche, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const visible = showAll ? paged : filtered.slice(0, TOP_COUNT);

  return (
    <div>
      <div className="bg-gradient-to-br from-accent/5 to-accent-teal/5 px-4 sm:px-8 lg:px-14 pt-12 pb-7">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 max-w-3xl">
          <div>
            <h1 className="font-display text-4xl font-semibold mb-3">Open requests, budget included.</h1>
            <p className="text-ink-muted">
              These are businesses whose budget didn&apos;t match a listed rate. Apply directly.
            </p>
          </div>
          <Link href="/requests/new">
            <button className="bg-gradient-to-r from-accent to-accent-teal text-white text-sm font-semibold px-5 py-2.5 rounded-lg flex-shrink-0">
              Post a request
            </button>
          </Link>
        </div>
      </div>

      <div className="px-4 sm:px-8 lg:px-14 pt-5 pb-7 mb-3 border-b border-border flex items-center gap-3 flex-wrap">
        <input
          type="search"
          className="input max-w-xs"
          placeholder="Search requests…"
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
      </div>

      <div className="px-4 sm:px-8 lg:px-14 pb-12">
        {!showAll && (
          <h2 className="text-sm font-semibold text-ink-muted uppercase tracking-wide mb-4">Newest requests</h2>
        )}

        {isLoading && <p className="text-ink-muted">Loading…</p>}

        {!isLoading && filtered.length === 0 && (
          <div className="py-16 text-center text-ink-muted">No requests match those filters.</div>
        )}

        {visible.length > 0 && (
          <div className="border border-border rounded-card bg-surface overflow-hidden">
            {visible.map((r, i) => (
              <div
                key={r.id}
                className={`flex flex-col sm:flex-row sm:items-center gap-4 px-5 sm:px-6 py-5 ${
                  i < visible.length - 1 ? "border-b border-border" : ""
                }`}
              >
                <div className="flex-grow min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-[15px]">{r.product.name}</span>
                    <span className="text-xs px-2.5 py-1 rounded-full bg-ground border border-border text-ink-muted">
                      {r.nicheTags[0]}
                    </span>
                  </div>
                  <p className="text-[13px] text-ink-muted leading-relaxed mt-1">{r.brief}</p>
                  <span className="text-xs text-ink-muted">Due {new Date(r.deadline).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-4 flex-shrink-0 sm:justify-end">
                  <Money kobo={r.budgetKobo} size="text-xl" />
                  <button
                    onClick={() =>
                      hasRole(user, "CREATOR")
                        ? applyMutation.mutate({ requestId: r.id, brief: r.brief })
                        : router.push("/login")
                    }
                    disabled={appliedIds.includes(r.id) || applyMutation.isPending}
                    className="bg-gradient-to-r from-accent to-accent-teal text-white text-xs font-semibold px-4 py-2 rounded-lg disabled:opacity-50"
                  >
                    {appliedIds.includes(r.id)
                      ? "Applied ✓"
                      : hasRole(user, "CREATOR")
                        ? "Apply"
                        : "Log in to apply"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {!showAll && filtered.length > TOP_COUNT && (
          <div className="flex justify-center mt-6">
            <button
              onClick={() => setExpanded(true)}
              className="border border-accent text-accent rounded-lg px-6 py-2.5 text-sm font-semibold hover:bg-accent/5"
            >
              See all {filtered.length} requests →
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
