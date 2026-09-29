"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Money } from "@/components/ui/Money";
import { Rating } from "@/components/ui/Rating";
import { SaveButton } from "@/components/ui/SaveButton";

export default function SavedCreatorsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { data: saved, isLoading } = useQuery({
    queryKey: ["saved-creators"],
    queryFn: api.creators.listSaved,
    enabled: !!user
  });

  if (authLoading) return <div className="p-14 text-ink-muted">Loading…</div>;
  if (!user) {
    return (
      <div className="p-14 text-ink-muted">
        <Link href="/login" className="text-accent font-semibold">
          Log in
        </Link>{" "}
        to see your saved creators.
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-8 lg:px-14 py-12">
      <h1 className="font-display text-3xl font-semibold mb-1">Saved creators</h1>
      <p className="text-ink-muted mb-8">Creators you've bookmarked for later.</p>

      {isLoading && <p className="text-ink-muted">Loading…</p>}
      {!isLoading && saved?.length === 0 && (
        <div className="border border-border rounded-card bg-surface p-8 text-sm text-ink-muted">
          Nothing saved yet — tap the heart on any creator's card to bookmark them here.
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {saved?.map(({ creator: c }) => {
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
                {cheapest && (
                  <div className="mt-auto pt-4 border-t border-border flex items-baseline justify-between">
                    <Money kobo={cheapest.priceKobo} size="text-2xl" />
                    <span className="text-sm font-semibold text-accent">View rate card →</span>
                  </div>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
