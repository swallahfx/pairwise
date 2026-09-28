"use client";

import { useQuery, useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { hasRole, useAuth } from "@/lib/auth";
import { Money } from "@/components/ui/Money";
import Link from "next/link";
import { useState } from "react";

export default function RequestsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { data: requests, isLoading } = useQuery({ queryKey: ["requests"], queryFn: api.requests.list });
  const [appliedIds, setAppliedIds] = useState<string[]>([]);

  const applyMutation = useMutation({
    mutationFn: ({ requestId, brief }: { requestId: string; brief: string }) =>
      api.offers.applyToRequest(requestId, brief),
    onSuccess: (_data, variables) => setAppliedIds((prev) => [...prev, variables.requestId])
  });

  return (
    <div className="px-14 py-12">
      <div className="flex items-start justify-between max-w-3xl">
        <div>
          <h1 className="font-display text-4xl font-semibold mb-3">Open requests, budget included.</h1>
          <p className="text-ink-muted mb-10">
            These are developers whose budget didn&apos;t match a listed rate. Apply directly.
          </p>
        </div>
        <Link href="/requests/new">
          <button className="bg-accent text-white text-sm font-semibold px-5 py-2.5 rounded-lg">
            Post a request
          </button>
        </Link>
      </div>

      {isLoading && <p className="text-ink-muted">Loading…</p>}

      <div className="grid grid-cols-3 gap-6">
        {requests?.map((r) => (
          <div key={r.id} className="bg-surface border border-border rounded-card p-6 flex flex-col gap-3.5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-semibold text-[15px]">{r.product.name}</div>
                <span className="text-xs px-2.5 py-1 rounded-full bg-ground border border-border text-ink-muted inline-block mt-1.5">
                  {r.nicheTags[0]}
                </span>
              </div>
              <Money kobo={r.budgetKobo} size="text-2xl" />
            </div>
            <p className="text-[13px] text-ink-muted leading-relaxed">{r.brief}</p>
            <div className="mt-auto pt-3.5 border-t border-border flex items-center justify-between">
              <span className="text-xs text-ink-muted">Due {new Date(r.deadline).toLocaleDateString()}</span>
              <button
                onClick={() =>
                  hasRole(user, "CREATOR")
                    ? applyMutation.mutate({ requestId: r.id, brief: r.brief })
                    : router.push("/login")
                }
                disabled={appliedIds.includes(r.id) || applyMutation.isPending}
                className="bg-accent text-white text-xs font-semibold px-4 py-2 rounded-lg disabled:opacity-50"
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
    </div>
  );
}
