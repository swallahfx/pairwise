"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Money } from "@/components/ui/Money";
import {
  AdminUser,
  AdvertRequest,
  BrandProfile,
  CreatorProfile,
  Order,
  Product,
  UpfrontListing,
  UpfrontPurchase
} from "@/types";

const ENTITIES = ["users", "creators", "brands", "products", "requests", "upfront", "orders", "purchases"] as const;
type Entity = (typeof ENTITIES)[number];
const ENTITY_LABELS: Record<Entity, string> = {
  users: "Users",
  creators: "Creators",
  brands: "Brands",
  products: "Products",
  requests: "Requests",
  upfront: "Upfront listings",
  orders: "Orders",
  purchases: "Upfront purchases"
};

// A blunt, table-per-entity data browser rather than one generic grid — the
// fields, edit rules, and destructive-vs-status-only actions genuinely
// differ per domain (deleting a Product isn't the same shape of operation
// as disputing an Order), so faking a single schema-agnostic table would
// hide more than it'd save.
export function ManageData() {
  const [entity, setEntity] = useState<Entity>("users");

  return (
    <div>
      <p className="text-ink-muted mb-5">
        Direct edit/delete access to every record on the platform. Deleting a creator, brand, product,
        request, or Upfront listing cascades through everything attached to it — you'll see exactly what
        before confirming. The one thing that still blocks a delete outright is real money: an order or
        Upfront purchase that's gone past AGREED. Orders and Upfront purchases themselves can't be deleted
        at all — mark them disputed or refunded instead, which just records the outcome; it doesn't reverse
        a Paystack transfer that's already gone out.
      </p>
      <div className="flex gap-1.5 mb-6 flex-wrap">
        {ENTITIES.map((e) => (
          <button
            key={e}
            onClick={() => setEntity(e)}
            className={`px-3 py-1.5 rounded-full text-[13px] font-semibold border ${
              entity === e ? "bg-gradient-to-r from-accent to-accent-teal text-white border-accent" : "bg-surface border-border text-ink-muted"
            }`}
          >
            {ENTITY_LABELS[e]}
          </button>
        ))}
      </div>

      {entity === "users" && <UsersTable />}
      {entity === "creators" && <CreatorsTable />}
      {entity === "brands" && <BrandsTable />}
      {entity === "products" && <ProductsTable />}
      {entity === "requests" && <RequestsTable />}
      {entity === "upfront" && <UpfrontListingsTable />}
      {entity === "orders" && <OrdersTable />}
      {entity === "purchases" && <PurchasesTable />}
    </div>
  );
}

function ErrorLine({ error }: { error: unknown }) {
  if (!error) return null;
  return <p className="text-sm text-red-600 mt-2">{(error as Error).message}</p>;
}

function Row({ children }: { children: React.ReactNode }) {
  return <div className="border-b border-border last:border-0 px-5 py-4">{children}</div>;
}

function Table({ children, empty, isLoading }: { children: React.ReactNode; empty: boolean; isLoading: boolean }) {
  return (
    <div className="bg-surface border border-border rounded-card overflow-hidden">
      {isLoading && <div className="p-6 text-sm text-ink-muted">Loading…</div>}
      {!isLoading && empty && <div className="p-6 text-sm text-ink-muted">Nothing here yet.</div>}
      {!isLoading && !empty && children}
    </div>
  );
}

// Fetches a preview before doing anything destructive: if real money is
// attached (any order/Upfront purchase past AGREED), that's shown as the
// specific reason deletion is blocked — no silent partial delete. Otherwise
// the admin sees exactly what cascades away (rate cards, offers, listings,
// the account itself...) before confirming.
function DeleteButton({
  onDelete,
  isPending,
  preview
}: {
  onDelete: () => void;
  isPending: boolean;
  preview: () => Promise<import("@/types").DeletePreview>;
}) {
  const [isChecking, setIsChecking] = useState(false);
  return (
    <button
      onClick={async () => {
        setIsChecking(true);
        try {
          const { cascade, blocked, label } = await preview();
          if (blocked.length > 0) {
            window.alert(
              `Can't delete ${label} — real money is attached:\n\n${blocked
                .map((b) => `• ${b.detail}`)
                .join("\n")}\n\nResolve those first (let them pay out, or mark disputed/refunded).`
            );
            return;
          }
          const cascadeText = cascade.length > 0 ? `This will also delete:\n${cascade.map((c) => `• ${c}`).join("\n")}\n\n` : "";
          if (window.confirm(`Delete ${label}?\n\n${cascadeText}This can't be undone.`)) onDelete();
        } finally {
          setIsChecking(false);
        }
      }}
      disabled={isPending || isChecking}
      className="text-sm font-semibold text-red-600 px-3 py-1.5 disabled:opacity-50"
    >
      {isChecking ? "Checking…" : "Delete"}
    </button>
  );
}

function UsersTable() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["admin-users"], queryFn: api.auth.adminListUsers });
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["admin-users"] });
  const deleteMutation = useMutation({ mutationFn: (id: string) => api.auth.adminDeleteUser(id), onSuccess: invalidate });

  return (
    <>
      <Table isLoading={isLoading} empty={data?.length === 0}>
        {data?.map((u: AdminUser) => (
          <Row key={u.id}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="font-semibold text-[15px]">
                  {u.name} <span className="text-ink-muted font-normal">· {u.email}</span>
                </div>
                <div className="text-[13px] text-ink-muted mt-0.5">
                  {u.role}
                  {u.creatorProfile && ` · ${u.creatorProfile.handle} · ${u.creatorProfile.gateStatus}`}
                  {u.brandProfile && ` · ${u.brandProfile.companyName}`}
                  {" · joined "}
                  {new Date(u.createdAt).toLocaleDateString()}
                </div>
              </div>
              <DeleteButton
                onDelete={() => deleteMutation.mutate(u.id)}
                isPending={deleteMutation.isPending}
                preview={() => api.auth.adminDeleteUserPreview(u.id)}
              />
            </div>
          </Row>
        ))}
      </Table>
      <ErrorLine error={deleteMutation.error} />
    </>
  );
}

const NICHES = ["AI Tools", "Dev Tools", "SaaS", "Indie Apps", "Productivity", "Fintech"];

function CreatorsTable() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["admin-creators-all"], queryFn: api.creators.adminListAll });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ handle: "", platform: "", followerCount: 0, engagementRate: 0, gateStatus: "PENDING" as const });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["admin-creators-all"] });
  const updateMutation = useMutation({
    mutationFn: (id: string) => api.creators.adminUpdate(id, form),
    onSuccess: () => {
      invalidate();
      setEditingId(null);
    }
  });
  const deleteMutation = useMutation({ mutationFn: (id: string) => api.creators.adminDelete(id), onSuccess: invalidate });

  function startEdit(c: CreatorProfile) {
    setEditingId(c.id);
    setForm({
      handle: c.handle,
      platform: c.platform,
      followerCount: c.followerCount,
      engagementRate: c.engagementRate,
      gateStatus: (c.gateStatus ?? "PENDING") as "PENDING"
    });
  }

  return (
    <>
      <Table isLoading={isLoading} empty={data?.length === 0}>
        {data?.map((c: CreatorProfile) => (
          <Row key={c.id}>
            {editingId === c.id ? (
              <div className="space-y-3">
                <div className="grid grid-cols-4 gap-3">
                  <input className="input" value={form.handle} onChange={(e) => setForm({ ...form, handle: e.target.value })} placeholder="Handle" />
                  <input className="input" value={form.platform} onChange={(e) => setForm({ ...form, platform: e.target.value })} placeholder="Platform" />
                  <input
                    className="input"
                    type="number"
                    value={form.followerCount}
                    onChange={(e) => setForm({ ...form, followerCount: Number(e.target.value) })}
                    placeholder="Followers"
                  />
                  <select
                    className="input"
                    value={form.gateStatus}
                    onChange={(e) => setForm({ ...form, gateStatus: e.target.value as "PENDING" })}
                  >
                    {["PENDING", "APPROVED", "REJECTED"].map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => updateMutation.mutate(c.id)}
                    disabled={updateMutation.isPending}
                    className="bg-gradient-to-r from-accent to-accent-teal text-white text-sm font-semibold px-4 py-1.5 rounded-lg disabled:opacity-60"
                  >
                    Save
                  </button>
                  <button onClick={() => setEditingId(null)} className="text-sm font-semibold text-ink-muted px-3 py-1.5">
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="font-semibold text-[15px]">
                    {c.user.name} <span className="text-ink-muted font-normal">· {c.handle}</span>
                  </div>
                  <div className="text-[13px] text-ink-muted mt-0.5">
                    {c.platform} · {(c.followerCount / 1000).toFixed(1)}K followers ·{" "}
                    {(c.engagementRate * 100).toFixed(1)}% · {c.gateStatus}
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={() => startEdit(c)} className="text-sm font-semibold text-accent px-3 py-1.5">
                    Edit
                  </button>
                  <DeleteButton
                    onDelete={() => deleteMutation.mutate(c.id)}
                    isPending={deleteMutation.isPending}
                    preview={() => api.creators.adminDeletePreview(c.id)}
                  />
                </div>
              </div>
            )}
          </Row>
        ))}
      </Table>
      <ErrorLine error={updateMutation.error ?? deleteMutation.error} />
    </>
  );
}

function BrandsTable() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["admin-brands-all"], queryFn: api.brands.adminListAll });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ companyName: "", website: "", industry: "" });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["admin-brands-all"] });
  const updateMutation = useMutation({
    mutationFn: (id: string) => api.brands.adminUpdate(id, form),
    onSuccess: () => {
      invalidate();
      setEditingId(null);
    }
  });
  const deleteMutation = useMutation({ mutationFn: (id: string) => api.brands.adminDelete(id), onSuccess: invalidate });

  return (
    <>
      <Table isLoading={isLoading} empty={data?.length === 0}>
        {data?.map((b: BrandProfile) => (
          <Row key={b.id}>
            {editingId === b.id ? (
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  <input className="input" value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} placeholder="Company name" />
                  <input className="input" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} placeholder="Website" />
                  <input className="input" value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })} placeholder="Industry" />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => updateMutation.mutate(b.id)}
                    disabled={updateMutation.isPending}
                    className="bg-gradient-to-r from-accent to-accent-teal text-white text-sm font-semibold px-4 py-1.5 rounded-lg disabled:opacity-60"
                  >
                    Save
                  </button>
                  <button onClick={() => setEditingId(null)} className="text-sm font-semibold text-ink-muted px-3 py-1.5">
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="font-semibold text-[15px]">{b.companyName}</div>
                  <div className="text-[13px] text-ink-muted mt-0.5">
                    {b.user.name} · {b.user.email} {b.industry ? `· ${b.industry}` : ""}
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => {
                      setEditingId(b.id);
                      setForm({ companyName: b.companyName, website: b.website ?? "", industry: b.industry ?? "" });
                    }}
                    className="text-sm font-semibold text-accent px-3 py-1.5"
                  >
                    Edit
                  </button>
                  <DeleteButton
                    onDelete={() => deleteMutation.mutate(b.id)}
                    isPending={deleteMutation.isPending}
                    preview={() => api.brands.adminDeletePreview(b.id)}
                  />
                </div>
              </div>
            )}
          </Row>
        ))}
      </Table>
      <ErrorLine error={updateMutation.error ?? deleteMutation.error} />
    </>
  );
}

function ProductsTable() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["admin-products-all"], queryFn: api.products.list });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", niche: "", pitch: "" });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["admin-products-all"] });
  const updateMutation = useMutation({
    mutationFn: (id: string) => api.products.adminUpdate(id, form),
    onSuccess: () => {
      invalidate();
      setEditingId(null);
    }
  });
  const deleteMutation = useMutation({ mutationFn: (id: string) => api.products.adminDelete(id), onSuccess: invalidate });

  return (
    <>
      <Table isLoading={isLoading} empty={data?.length === 0}>
        {data?.map((p: Product) => (
          <Row key={p.id}>
            {editingId === p.id ? (
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Name" />
                  <input className="input" value={form.niche} onChange={(e) => setForm({ ...form, niche: e.target.value })} placeholder="Niche" />
                </div>
                <textarea className="input" rows={2} value={form.pitch} onChange={(e) => setForm({ ...form, pitch: e.target.value })} placeholder="Pitch" />
                <div className="flex gap-2">
                  <button
                    onClick={() => updateMutation.mutate(p.id)}
                    disabled={updateMutation.isPending}
                    className="bg-gradient-to-r from-accent to-accent-teal text-white text-sm font-semibold px-4 py-1.5 rounded-lg disabled:opacity-60"
                  >
                    Save
                  </button>
                  <button onClick={() => setEditingId(null)} className="text-sm font-semibold text-ink-muted px-3 py-1.5">
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="font-semibold text-[15px]">{p.name}</div>
                  <div className="text-[13px] text-ink-muted mt-0.5">
                    {p.niche} · {p.monetizationStatus}
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => {
                      setEditingId(p.id);
                      setForm({ name: p.name, niche: p.niche, pitch: p.pitch });
                    }}
                    className="text-sm font-semibold text-accent px-3 py-1.5"
                  >
                    Edit
                  </button>
                  <DeleteButton
                    onDelete={() => deleteMutation.mutate(p.id)}
                    isPending={deleteMutation.isPending}
                    preview={() => api.products.adminDeletePreview(p.id)}
                  />
                </div>
              </div>
            )}
          </Row>
        ))}
      </Table>
      <ErrorLine error={updateMutation.error ?? deleteMutation.error} />
    </>
  );
}

function RequestsTable() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["admin-requests-all"], queryFn: api.requests.adminListAll });
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["admin-requests-all"] });
  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "OPEN" | "CLOSED" }) => api.requests.adminUpdate(id, { status }),
    onSuccess: invalidate
  });
  const deleteMutation = useMutation({ mutationFn: (id: string) => api.requests.adminDelete(id), onSuccess: invalidate });

  return (
    <>
      <Table isLoading={isLoading} empty={data?.length === 0}>
        {data?.map((r: AdvertRequest) => (
          <Row key={r.id}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="font-semibold text-[15px]">{r.product.name}</div>
                <div className="text-[13px] text-ink-muted mt-0.5">
                  <Money kobo={r.budgetKobo} size="text-[13px]" /> budget · {r.status} · {r._count?.offers ?? 0} offers
                </div>
                <p className="text-[13px] text-ink-muted mt-1">{r.brief}</p>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={() => statusMutation.mutate({ id: r.id, status: r.status === "OPEN" ? "CLOSED" : "OPEN" })}
                  disabled={statusMutation.isPending}
                  className="text-sm font-semibold text-accent px-3 py-1.5"
                >
                  Mark {r.status === "OPEN" ? "closed" : "open"}
                </button>
                <DeleteButton
                  onDelete={() => deleteMutation.mutate(r.id)}
                  isPending={deleteMutation.isPending}
                  preview={() => api.requests.adminDeletePreview(r.id)}
                />
              </div>
            </div>
          </Row>
        ))}
      </Table>
      <ErrorLine error={statusMutation.error ?? deleteMutation.error} />
    </>
  );
}

function UpfrontListingsTable() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["admin-upfront-all"], queryFn: api.upfront.adminListAllListings });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ title: "", pricePerSlotKobo: 0, totalSlots: 0, gateStatus: "PENDING" as const });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["admin-upfront-all"] });
  const updateMutation = useMutation({
    mutationFn: (id: string) => api.upfront.adminUpdateListing(id, form),
    onSuccess: () => {
      invalidate();
      setEditingId(null);
    }
  });
  const deleteMutation = useMutation({ mutationFn: (id: string) => api.upfront.adminDeleteListing(id), onSuccess: invalidate });

  return (
    <>
      <Table isLoading={isLoading} empty={data?.length === 0}>
        {data?.map((l: UpfrontListing) => {
          const listerName = l.listerType === "CREATOR" ? l.creator?.user.name : l.brand?.companyName;
          return (
            <Row key={l.id}>
              {editingId === l.id ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    <input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Title" />
                    <input
                      className="input"
                      type="number"
                      value={form.pricePerSlotKobo / 100}
                      onChange={(e) => setForm({ ...form, pricePerSlotKobo: Number(e.target.value) * 100 })}
                      placeholder="Price per slot (₦)"
                    />
                    <select
                      className="input"
                      value={form.gateStatus}
                      onChange={(e) => setForm({ ...form, gateStatus: e.target.value as "PENDING" })}
                    >
                      {["PENDING", "APPROVED", "REJECTED"].map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => updateMutation.mutate(l.id)}
                      disabled={updateMutation.isPending}
                      className="bg-gradient-to-r from-accent to-accent-teal text-white text-sm font-semibold px-4 py-1.5 rounded-lg disabled:opacity-60"
                    >
                      Save
                    </button>
                    <button onClick={() => setEditingId(null)} className="text-sm font-semibold text-ink-muted px-3 py-1.5">
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="font-semibold text-[15px]">{l.title}</div>
                    <div className="text-[13px] text-ink-muted mt-0.5">
                      {listerName} · {l.niche} · {l.slotsSold}/{l.totalSlots} sold · {l.gateStatus}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Money kobo={l.pricePerSlotKobo} size="text-lg" />
                    <button
                      onClick={() => {
                        setEditingId(l.id);
                        setForm({
                          title: l.title,
                          pricePerSlotKobo: l.pricePerSlotKobo,
                          totalSlots: l.totalSlots,
                          gateStatus: l.gateStatus as "PENDING"
                        });
                      }}
                      className="text-sm font-semibold text-accent px-3 py-1.5"
                    >
                      Edit
                    </button>
                    <DeleteButton
                      onDelete={() => deleteMutation.mutate(l.id)}
                      isPending={deleteMutation.isPending}
                      preview={() => api.upfront.adminDeleteListingPreview(l.id)}
                    />
                  </div>
                </div>
              )}
            </Row>
          );
        })}
      </Table>
      <ErrorLine error={updateMutation.error ?? deleteMutation.error} />
    </>
  );
}

const ORDER_STATUS_STYLES: Record<string, string> = {
  PAID: "bg-money text-white",
  DISPUTED: "bg-red-600 text-white",
  REFUNDED: "bg-ink-muted text-white"
};

function OrdersTable() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["admin-orders-all"], queryFn: api.orders.adminListAll });
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["admin-orders-all"] });
  const disputeMutation = useMutation({ mutationFn: (id: string) => api.orders.adminDispute(id), onSuccess: invalidate });
  const refundMutation = useMutation({ mutationFn: (id: string) => api.orders.adminRefund(id), onSuccess: invalidate });
  const releaseMutation = useMutation({
    mutationFn: (id: string) => api.orders.adminReleaseDisputed(id),
    onSuccess: invalidate
  });

  return (
    <>
      <Table isLoading={isLoading} empty={data?.length === 0}>
        {data?.map((o: Order) => (
          <Row key={o.id}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="font-semibold text-[15px]">{o.offer.deliverable}</div>
                <div className="text-[13px] text-ink-muted mt-0.5">
                  {o.offer.developer.user.name} → {o.offer.creator.user.name}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
                <Money kobo={o.totalKobo} size="text-lg" />
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${ORDER_STATUS_STYLES[o.status] ?? "bg-accent/10 text-accent"}`}>
                  {o.status}
                </span>
                {o.status !== "PAID" && o.status !== "REFUNDED" && (
                  <button
                    onClick={() => disputeMutation.mutate(o.id)}
                    disabled={disputeMutation.isPending || o.status === "DISPUTED"}
                    className="text-sm font-semibold text-red-600 px-2.5 py-1.5 disabled:opacity-40"
                  >
                    Dispute
                  </button>
                )}
                {o.status === "DISPUTED" && (
                  <button
                    onClick={() => releaseMutation.mutate(o.id)}
                    disabled={releaseMutation.isPending}
                    className="text-sm font-semibold text-money px-2.5 py-1.5"
                  >
                    Release to creator
                  </button>
                )}
                {(o.status === "DISPUTED" || o.status === "FUNDED") && (
                  <button
                    onClick={() => refundMutation.mutate(o.id)}
                    disabled={refundMutation.isPending}
                    className="text-sm font-semibold text-accent px-2.5 py-1.5"
                  >
                    Refund
                  </button>
                )}
              </div>
            </div>
            {o.disputeReason && (
              <div className="mt-2.5 pt-2.5 border-t border-border text-[13px] text-ink-muted space-y-1">
                <div>
                  <span className="font-semibold text-ink">
                    {o.disputedByUserId === o.offer.developer.userId ? o.offer.developer.user.name : o.offer.creator.user.name}:
                  </span>{" "}
                  {o.disputeReason}
                </div>
                {o.disputeResponse ? (
                  <div>
                    <span className="font-semibold text-ink">Response:</span> {o.disputeResponse}
                  </div>
                ) : (
                  o.status === "DISPUTED" && <div className="italic">No response yet.</div>
                )}
              </div>
            )}
          </Row>
        ))}
      </Table>
      <ErrorLine error={disputeMutation.error ?? refundMutation.error ?? releaseMutation.error} />
    </>
  );
}

function PurchasesTable() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin-purchases-all"],
    queryFn: api.upfront.adminListAllPurchases
  });
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["admin-purchases-all"] });
  const disputeMutation = useMutation({
    mutationFn: (id: string) => api.upfront.purchases.adminDispute(id),
    onSuccess: invalidate
  });
  const refundMutation = useMutation({
    mutationFn: (id: string) => api.upfront.purchases.adminRefund(id),
    onSuccess: invalidate
  });

  return (
    <>
      <Table isLoading={isLoading} empty={data?.length === 0}>
        {data?.map((p: UpfrontPurchase) => (
          <Row key={p.id}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="font-semibold text-[15px]">{p.listing.title}</div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Money kobo={p.totalKobo} size="text-lg" />
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-ground border border-border text-ink-muted">
                  {p.status}
                </span>
                {p.status !== "PAID" && p.status !== "REFUNDED" && (
                  <button
                    onClick={() => disputeMutation.mutate(p.id)}
                    disabled={disputeMutation.isPending || p.status === "DISPUTED"}
                    className="text-sm font-semibold text-red-600 px-2.5 py-1.5 disabled:opacity-40"
                  >
                    Dispute
                  </button>
                )}
                {(p.status === "DISPUTED" || p.status === "FUNDED") && (
                  <button
                    onClick={() => refundMutation.mutate(p.id)}
                    disabled={refundMutation.isPending}
                    className="text-sm font-semibold text-accent px-2.5 py-1.5"
                  >
                    Refund
                  </button>
                )}
              </div>
            </div>
          </Row>
        ))}
      </Table>
      <ErrorLine error={disputeMutation.error ?? refundMutation.error} />
    </>
  );
}
