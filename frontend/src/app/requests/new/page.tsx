"use client";

import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { hasRole, useAuth } from "@/lib/auth";

export default function NewRequestPage() {
  const { user, isLoading } = useAuth();

  if (isLoading) return <div className="p-14 text-ink-muted">Loading…</div>;
  if (!user) {
    return (
      <div className="p-14 text-ink-muted">
        <Link href="/login" className="text-accent font-semibold">
          Log in
        </Link>{" "}
        as a developer to post a request.
      </div>
    );
  }
  if (!hasRole(user, "DEVELOPER")) {
    return <div className="p-14 text-ink-muted">Only developer accounts can post a budget request.</div>;
  }

  return <NewRequestForm />;
}

function NewRequestForm() {
  const router = useRouter();
  const { data: products } = useQuery({ queryKey: ["products"], queryFn: api.products.list });
  const [form, setForm] = useState({
    productId: "",
    budgetKobo: 15000000,
    brief: "",
    nicheTags: ["AI Tools"],
    deadline: ""
  });

  const mutation = useMutation({
    mutationFn: () => api.requests.create(form),
    onSuccess: () => router.push("/requests")
  });

  return (
    <div className="max-w-xl mx-auto px-6 py-14">
      <h1 className="font-display text-3xl font-semibold mb-2">Post a budget request</h1>
      <p className="text-ink-muted mb-9">
        No specific creator in mind, or their listed rate doesn&apos;t fit? Say what you can spend.
      </p>

      <form
        className="space-y-5"
        onSubmit={(e) => {
          e.preventDefault();
          mutation.mutate();
        }}
      >
        <div>
          <label className="block text-[13px] font-semibold mb-2">Product</label>
          <select
            className="input"
            value={form.productId}
            onChange={(e) => setForm({ ...form, productId: e.target.value })}
          >
            <option value="">Select a product</option>
            {products?.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-[13px] font-semibold mb-2">Your budget (₦)</label>
          <input
            className="input"
            type="number"
            value={form.budgetKobo / 100}
            onChange={(e) => setForm({ ...form, budgetKobo: Number(e.target.value) * 100 })}
          />
        </div>
        <div>
          <label className="block text-[13px] font-semibold mb-2">What do you need?</label>
          <textarea
            className="input"
            rows={4}
            value={form.brief}
            onChange={(e) => setForm({ ...form, brief: e.target.value })}
            placeholder="e.g. 1 TikTok video showing our onboarding flow"
          />
        </div>
        <div>
          <label className="block text-[13px] font-semibold mb-2">Needed by</label>
          <input
            className="input"
            type="date"
            value={form.deadline}
            onChange={(e) => setForm({ ...form, deadline: e.target.value })}
          />
        </div>

        <button
          type="submit"
          disabled={mutation.isPending}
          className="w-full bg-accent text-white py-3.5 rounded-lg font-semibold text-[15px] disabled:opacity-60"
        >
          {mutation.isPending ? "Posting…" : "Post to creators"}
        </button>
        {mutation.isError && <p className="text-sm text-red-600">{(mutation.error as Error).message}</p>}
      </form>
    </div>
  );
}
