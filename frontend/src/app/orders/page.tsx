"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Money } from "@/components/ui/Money";
import { OrderStatus } from "@/types";

function statusPill(status: OrderStatus) {
  const done = status === "PAID";
  const problem = status === "DISPUTED" || status === "REFUNDED";
  const styles = done ? "bg-money text-white" : problem ? "bg-red-600 text-white" : "bg-ground border border-border text-ink-muted";
  return <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${styles}`}>{status.replace("_", " ")}</span>;
}

export default function MyOrdersPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { data: orders, isLoading } = useQuery({
    queryKey: ["orders-mine"],
    queryFn: api.orders.mine,
    enabled: !!user
  });

  if (authLoading) return <div className="p-14 text-ink-muted">Loading…</div>;
  if (!user) {
    return (
      <div className="p-14 text-ink-muted">
        <Link href="/login" className="text-accent font-semibold">
          Log in
        </Link>{" "}
        to see your orders.
      </div>
    );
  }

  return (
    <div className="px-14 py-12 max-w-3xl">
      <h1 className="font-display text-3xl font-semibold mb-2">Your orders</h1>
      <p className="text-ink-muted mb-10">
        {user.role === "ADMIN"
          ? "Every order you're a party to, on either side."
          : user.role === "DEVELOPER"
            ? "Fund an agreed order to kick off work, then track it through to payout."
            : "Track work you've been booked for, from funding through payout."}
      </p>

      {isLoading && <p className="text-ink-muted">Loading…</p>}
      {orders?.length === 0 && (
        <div className="text-sm text-ink-muted border border-border rounded-card p-6 bg-surface">
          No orders yet.
        </div>
      )}

      <div className="border border-border rounded-card bg-surface overflow-hidden">
        {orders?.map((order, i) => {
          // For most users this is just their fixed role, but an admin's
          // orders can have them on either side, so it's decided per order
          // by comparing the actual party rather than the logged-in role.
          const counterparty =
            order.offer.developer.userId === user.userId
              ? order.offer.creator.user.name
              : order.offer.developer.user.name;
          const href = order.status === "AGREED" ? `/checkout/${order.id}` : `/orders/${order.id}`;
          return (
            <Link key={order.id} href={href} className="block">
              <div
                className={`flex items-center justify-between px-6 py-4 hover:bg-ground/50 ${
                  i < orders.length - 1 ? "border-b border-border" : ""
                }`}
              >
                <div>
                  <div className="text-[15px] font-semibold">{order.offer.deliverable}</div>
                  <div className="text-[13px] text-ink-muted mt-0.5">{counterparty}</div>
                </div>
                <div className="flex items-center gap-4">
                  <Money kobo={order.totalKobo} size="text-lg" />
                  {statusPill(order.status)}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
