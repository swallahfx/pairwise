"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";

export default function ProductDetailPage() {
  const params = useParams<{ id: string }>();
  const { data: product, isLoading } = useQuery({
    queryKey: ["product", params.id],
    queryFn: () => api.products.get(params.id)
  });

  if (isLoading) return <div className="p-14 text-ink-muted">Loading…</div>;
  if (!product) return <div className="p-14 text-ink-muted">Product not found.</div>;

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <Link href="/products" className="text-sm text-ink-muted">
        ← All products
      </Link>
      <div className="flex items-start justify-between gap-6 mt-4 pb-6 border-b border-border">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="font-display text-3xl font-bold">{product.name}</h1>
            <span className="text-xs px-2.5 py-1 rounded-full bg-ground border border-border text-ink-muted">
              {product.niche}
            </span>
          </div>
          <p className="text-ink-muted mt-2 max-w-lg">{product.pitch}</p>
        </div>
        <a href={product.link} target="_blank" rel="noreferrer">
          <button className="border border-border bg-surface px-4 py-2.5 rounded-lg text-sm font-semibold">
            Visit product →
          </button>
        </a>
      </div>
      <div className="flex gap-12 mt-7">
        <div>
          <div className="font-display text-2xl font-bold">
            {product.mrrKobo ? `₦${(product.mrrKobo / 100).toLocaleString("en-NG")}` : "—"}
          </div>
          <div className="text-[13px] text-ink-muted">MRR</div>
        </div>
        <div>
          <div className="font-display text-2xl font-bold">{product.activeUsers ?? "—"}</div>
          <div className="text-[13px] text-ink-muted">Active users</div>
        </div>
      </div>
    </div>
  );
}
