"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { hasRole, useAuth } from "@/lib/auth";

export default function NewProductPage() {
  const { user, isLoading } = useAuth();

  if (isLoading) return <div className="p-14 text-ink-muted">Loading…</div>;
  if (!user) {
    return (
      <div className="p-14 text-ink-muted">
        <Link href="/login" className="text-accent font-semibold">
          Log in
        </Link>{" "}
        as a developer to list a product.
      </div>
    );
  }
  if (!hasRole(user, "DEVELOPER")) {
    return <div className="p-14 text-ink-muted">Only developer accounts can list products.</div>;
  }

  return <NewProductForm />;
}

function NewProductForm() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    link: "",
    niche: "AI Tools",
    pitch: "",
    monetizationStatus: "PRE_REVENUE"
  });

  const mutation = useMutation({
    mutationFn: () => api.products.create(form),
    onSuccess: () => router.push("/creators")
  });

  return (
    <div className="max-w-xl mx-auto px-6 py-14">
      <h1 className="font-display text-3xl font-semibold mb-2">List your product</h1>
      <p className="text-ink-muted mb-9">
        Takes two minutes. Once it&apos;s up, browse creators in your niche and book or make an offer.
      </p>

      <form
        className="space-y-5"
        onSubmit={(e) => {
          e.preventDefault();
          mutation.mutate();
        }}
      >
        <Field label="Product name">
          <input
            className="input"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="e.g. Fieldnote — AI meeting notes"
          />
        </Field>
        <Field label="Product link">
          <input
            className="input"
            type="url"
            value={form.link}
            onChange={(e) => setForm({ ...form, link: e.target.value })}
            placeholder="https://yourproduct.com"
          />
        </Field>
        <Field label="Niche">
          <select className="input" value={form.niche} onChange={(e) => setForm({ ...form, niche: e.target.value })}>
            {["AI Tools", "Dev Tools", "SaaS", "Indie Apps", "Productivity", "Fintech"].map((n) => (
              <option key={n}>{n}</option>
            ))}
          </select>
        </Field>
        <Field label="One-line pitch">
          <textarea
            className="input"
            rows={3}
            value={form.pitch}
            onChange={(e) => setForm({ ...form, pitch: e.target.value })}
          />
        </Field>
        <Field label="Monetization status">
          <select
            className="input"
            value={form.monetizationStatus}
            onChange={(e) => setForm({ ...form, monetizationStatus: e.target.value })}
          >
            <option value="PRE_REVENUE">Pre-revenue</option>
            <option value="EARLY_REVENUE">Early revenue</option>
            <option value="ESTABLISHED">Established</option>
          </select>
        </Field>

        <button
          type="submit"
          disabled={mutation.isPending}
          className="w-full bg-gradient-to-r from-accent to-accent-teal text-white py-3.5 rounded-lg font-semibold text-[15px] disabled:opacity-60"
        >
          {mutation.isPending ? "Adding…" : "Add product & browse creators"}
        </button>
        {mutation.isError && <p className="text-sm text-red-600">{(mutation.error as Error).message}</p>}
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[13px] font-semibold mb-2">{label}</label>
      {children}
    </div>
  );
}
