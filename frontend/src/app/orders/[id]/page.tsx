"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import { hasRole, useAuth } from "@/lib/auth";
import { OrderStatus } from "@/types";

const STEPS: { key: OrderStatus[]; label: string }[] = [
  { key: ["AGREED"], label: "Agreed" },
  { key: ["FUNDED"], label: "Funded" },
  { key: ["IN_PROGRESS", "REVISION_REQUESTED"], label: "In progress" },
  { key: ["SUBMITTED"], label: "Submitted" },
  { key: ["APPROVED", "AUTO_APPROVED"], label: "Approved" },
  { key: ["PAID"], label: "Paid" }
];

function stepIndex(status: OrderStatus): number {
  const i = STEPS.findIndex((s) => s.key.includes(status));
  return i === -1 ? 0 : i;
}

export default function OrderStatusPage() {
  const params = useParams<{ id: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: order, isLoading } = useQuery({
    queryKey: ["order", params.id],
    queryFn: () => api.orders.get(params.id),
    refetchInterval: 5000 // status can change server-side (webhook, auto-approve sweep)
  });

  const [showDisputeForm, setShowDisputeForm] = useState(false);
  const [disputeReason, setDisputeReason] = useState("");
  const [respondText, setRespondText] = useState("");
  const [deliveryNote, setDeliveryNote] = useState("");

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["order", params.id] });
  const startMutation = useMutation({ mutationFn: () => api.orders.start(params.id), onSuccess: invalidate });
  const submitMutation = useMutation({
    mutationFn: () => api.orders.submit(params.id, deliveryNote),
    onSuccess: () => {
      setDeliveryNote("");
      invalidate();
    }
  });
  const revisionMutation = useMutation({
    mutationFn: () => api.orders.requestRevision(params.id),
    onSuccess: invalidate
  });
  const approveMutation = useMutation({ mutationFn: () => api.orders.approve(params.id), onSuccess: invalidate });
  const disputeMutation = useMutation({
    mutationFn: () => api.orders.raiseDispute(params.id, disputeReason),
    onSuccess: () => {
      setShowDisputeForm(false);
      setDisputeReason("");
      invalidate();
    }
  });
  const respondMutation = useMutation({
    mutationFn: () => api.orders.respondToDispute(params.id, respondText),
    onSuccess: () => {
      setRespondText("");
      invalidate();
    }
  });

  if (isLoading) return <div className="p-14 text-ink-muted">Loading…</div>;
  if (!order) return <div className="p-14 text-ink-muted">Order not found.</div>;

  const current = stepIndex(order.status);
  const isDisputed = order.status === "DISPUTED";
  const isRefunded = order.status === "REFUNDED";
  const isTerminalDispute = isDisputed || isRefunded;
  const isParty = user?.userId === order.offer.developer.userId || user?.userId === order.offer.creator.userId;
  const canRaiseDispute =
    isParty && ["FUNDED", "IN_PROGRESS", "REVISION_REQUESTED", "SUBMITTED"].includes(order.status);
  const canRespondToDispute = isDisputed && user?.userId && order.disputedByUserId !== user.userId && isParty && !order.disputeRespondedAt;
  const actionError = (startMutation.error ?? submitMutation.error ?? revisionMutation.error ?? approveMutation.error) as
    | Error
    | undefined;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
      <div className="text-[13px] text-ink-muted mb-1">
        Order #{order.id.slice(0, 8)} · {order.offer.creator.user.name}
      </div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="font-display text-[28px] font-semibold">{order.offer.deliverable}</h1>
        <div className="text-left sm:text-right flex-shrink-0">
          <div className="font-display text-3xl font-bold text-money">
            ₦{(order.priceKobo / 100).toLocaleString("en-NG")}
          </div>
          <div className="text-xs text-ink-muted">
            {order.status === "PAID" ? "paid out" : `held for ${order.offer.creator.user.name}`}
          </div>
        </div>
      </div>

      {order.offer.requirements && (
        <div className="mt-4 bg-surface border border-border rounded-card p-5">
          <div className="text-[13px] font-semibold text-ink-muted mb-1.5">What was requested</div>
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{order.offer.requirements}</p>
        </div>
      )}

      {order.deliveryNote && (
        <div className="mt-4 bg-surface border border-border rounded-card p-5">
          <div className="text-[13px] font-semibold text-ink-muted mb-1.5">What was delivered</div>
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{order.deliveryNote}</p>
        </div>
      )}

      {order.disputeReason && (
        <div className="mt-4 bg-surface border border-border rounded-card p-5 space-y-3">
          <div>
            <div className="text-[13px] font-semibold text-ink-muted mb-1.5">
              Dispute raised by {order.disputedByUserId === order.offer.developer.userId ? order.offer.developer.user.name : order.offer.creator.user.name}
            </div>
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{order.disputeReason}</p>
          </div>
          {order.disputeResponse && (
            <div className="pt-3 border-t border-border">
              <div className="text-[13px] font-semibold text-ink-muted mb-1.5">Response</div>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{order.disputeResponse}</p>
            </div>
          )}
          {canRespondToDispute && (
            <form
              className="pt-3 border-t border-border space-y-2.5"
              onSubmit={(e) => {
                e.preventDefault();
                respondMutation.mutate();
              }}
            >
              <label className="block text-[13px] font-semibold">Give your side of it</label>
              <textarea
                className="input"
                rows={3}
                value={respondText}
                onChange={(e) => setRespondText(e.target.value)}
                required
                minLength={10}
              />
              <button
                type="submit"
                disabled={respondMutation.isPending}
                className="bg-gradient-to-r from-accent to-accent-teal text-white text-sm font-semibold px-4 py-2.5 rounded-lg disabled:opacity-60"
              >
                {respondMutation.isPending ? "Sending…" : "Send response"}
              </button>
              {respondMutation.isError && (
                <p className="text-sm text-red-600">{(respondMutation.error as Error).message}</p>
              )}
            </form>
          )}
        </div>
      )}

      {isTerminalDispute ? (
        <div className="mt-10 p-6 bg-surface border border-border rounded-card">
          <div className="text-sm font-semibold">This order is {order.status.toLowerCase()}.</div>
          <div className="text-sm text-ink-muted mt-1">
            {isDisputed
              ? "A human review is needed — this doesn't auto-resolve."
              : "An admin reviewed this and refunded the developer."}
          </div>
        </div>
      ) : (
        <div className="flex items-center mt-10">
          {STEPS.map((step, i) => {
            const done = i < current;
            const active = i === current;
            return (
              <div key={step.label} className="flex items-center flex-1">
                <div className="flex flex-col items-center gap-2">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 flex-shrink-0 ${
                      done || active ? "bg-gradient-to-r from-accent to-accent-teal text-white border-accent" : "bg-surface text-ink-muted border-border"
                    }`}
                  >
                    {done ? "✓" : i + 1}
                  </div>
                  <div className={`text-xs font-semibold whitespace-nowrap ${active ? "text-ink" : "text-ink-muted"}`}>
                    {step.label}
                  </div>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`flex-grow h-0.5 mx-2 mb-5 ${done ? "bg-accent" : "bg-border"}`} />
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-10 bg-surface border border-border rounded-card p-6 flex items-center gap-4">
        <div className="w-11 h-11 rounded-full bg-ground border border-border flex items-center justify-center text-lg flex-shrink-0">
          {order.status === "PAID" ? "✅" : "⏳"}
        </div>
        <div>
          <div className="text-sm font-semibold">{statusMessage(order.status, order.offer.creator.user.name)}</div>
          <div className="text-[13px] text-ink-muted mt-0.5">
            {order.status === "SUBMITTED" &&
              "Funds release automatically after 7 days if you don't respond."}
          </div>
        </div>
      </div>

      {hasRole(user, "CREATOR") && order.status === "FUNDED" && (
        <ActionRow
          message="Funded. Start work when you're ready."
          buttonLabel="Start work"
          onClick={() => startMutation.mutate()}
          pending={startMutation.isPending}
        />
      )}

      {hasRole(user, "CREATOR") && (order.status === "IN_PROGRESS" || order.status === "REVISION_REQUESTED") && (
        <div className="mt-4 bg-surface border border-border rounded-card p-6 space-y-3">
          <div className="text-sm font-semibold">Done? Submit for the developer to review.</div>
          <form
            className="space-y-2.5"
            onSubmit={(e) => {
              e.preventDefault();
              submitMutation.mutate();
            }}
          >
            <label className="block text-[13px] font-semibold">What did you deliver?</label>
            <textarea
              className="input"
              rows={3}
              placeholder="A link, or a description of where/how it was sent"
              value={deliveryNote}
              onChange={(e) => setDeliveryNote(e.target.value)}
              required
              minLength={5}
            />
            <button
              type="submit"
              disabled={submitMutation.isPending}
              className="bg-gradient-to-r from-accent to-accent-teal text-white text-sm font-semibold px-4 py-2.5 rounded-lg disabled:opacity-60"
            >
              {submitMutation.isPending ? "Submitting…" : "Submit work"}
            </button>
          </form>
        </div>
      )}

      {hasRole(user, "DEVELOPER") && order.status === "SUBMITTED" && (
        <div className="mt-4 bg-surface border border-border rounded-card p-6 flex items-center justify-between gap-4">
          <div className="text-sm font-semibold">Review the delivered work.</div>
          <div className="flex gap-3">
            <button
              onClick={() => revisionMutation.mutate()}
              disabled={revisionMutation.isPending || approveMutation.isPending}
              className="border border-border text-sm font-semibold px-4 py-2.5 rounded-lg disabled:opacity-60"
            >
              Request revision
            </button>
            <button
              onClick={() => approveMutation.mutate()}
              disabled={approveMutation.isPending || revisionMutation.isPending}
              className="bg-gradient-to-r from-accent to-accent-teal text-white text-sm font-semibold px-4 py-2.5 rounded-lg disabled:opacity-60"
            >
              {approveMutation.isPending ? "Releasing…" : "Approve & release payment"}
            </button>
          </div>
        </div>
      )}

      {actionError && <p className="text-sm text-red-600 mt-3">{actionError.message}</p>}

      {hasRole(user, "DEVELOPER") && order.status === "PAID" && (
        <ReviewForm orderId={order.id} creatorName={order.offer.creator.user.name} />
      )}

      {canRaiseDispute && (
        <div className="mt-6 pt-6 border-t border-border">
          {!showDisputeForm ? (
            <button
              onClick={() => setShowDisputeForm(true)}
              className="text-sm font-semibold text-red-600"
            >
              Something wrong? Raise a dispute
            </button>
          ) : (
            <form
              className="space-y-2.5"
              onSubmit={(e) => {
                e.preventDefault();
                disputeMutation.mutate();
              }}
            >
              <label className="block text-[13px] font-semibold">
                What's wrong? This pauses auto-release and the other side gets a chance to respond before an
                admin looks at it.
              </label>
              <textarea
                className="input"
                rows={3}
                value={disputeReason}
                onChange={(e) => setDisputeReason(e.target.value)}
                required
                minLength={10}
              />
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowDisputeForm(false)}
                  className="text-sm font-semibold text-ink-muted px-4 py-2.5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={disputeMutation.isPending}
                  className="bg-red-600 text-white text-sm font-semibold px-4 py-2.5 rounded-lg disabled:opacity-60"
                >
                  {disputeMutation.isPending ? "Submitting…" : "Raise dispute"}
                </button>
              </div>
              {disputeMutation.isError && (
                <p className="text-sm text-red-600">{(disputeMutation.error as Error).message}</p>
              )}
            </form>
          )}
        </div>
      )}
    </div>
  );
}

function ActionRow({
  message,
  buttonLabel,
  onClick,
  pending
}: {
  message: string;
  buttonLabel: string;
  onClick: () => void;
  pending: boolean;
}) {
  return (
    <div className="mt-4 bg-surface border border-border rounded-card p-6 flex items-center justify-between gap-4">
      <div className="text-sm font-semibold">{message}</div>
      <button
        onClick={onClick}
        disabled={pending}
        className="bg-gradient-to-r from-accent to-accent-teal text-white text-sm font-semibold px-4 py-2.5 rounded-lg disabled:opacity-60"
      >
        {pending ? "Working…" : buttonLabel}
      </button>
    </div>
  );
}

function ReviewForm({ orderId, creatorName }: { orderId: string; creatorName: string }) {
  const [rating, setRating] = useState(5);
  const [text, setText] = useState("");
  const mutation = useMutation({
    mutationFn: () => api.reviews.create(orderId, { rating, text })
  });

  if (mutation.isSuccess) {
    return (
      <div className="mt-4 bg-surface border border-border rounded-card p-6 text-sm font-semibold text-money">
        Review submitted. Thanks!
      </div>
    );
  }

  return (
    <form
      className="mt-4 bg-surface border border-border rounded-card p-6 space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        mutation.mutate();
      }}
    >
      <div className="text-sm font-semibold">Leave a review for {creatorName}</div>
      <div className="flex gap-1.5">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            type="button"
            key={n}
            onClick={() => setRating(n)}
            className={`w-9 h-9 rounded-lg border text-sm font-bold ${
              n <= rating ? "bg-gradient-to-r from-accent to-accent-teal text-white border-accent" : "bg-ground border-border text-ink-muted"
            }`}
          >
            {n}
          </button>
        ))}
      </div>
      <textarea
        className="input"
        rows={3}
        placeholder="How did it go?"
        value={text}
        onChange={(e) => setText(e.target.value)}
        required
      />
      <button
        type="submit"
        disabled={mutation.isPending}
        className="bg-gradient-to-r from-accent to-accent-teal text-white text-sm font-semibold px-4 py-2.5 rounded-lg disabled:opacity-60"
      >
        {mutation.isPending ? "Submitting…" : "Submit review"}
      </button>
      {mutation.isError && <p className="text-sm text-red-600">{(mutation.error as Error).message}</p>}
    </form>
  );
}

function statusMessage(status: OrderStatus, creatorName: string): string {
  switch (status) {
    case "AGREED":
      return "Waiting on payment to start the order.";
    case "FUNDED":
      return `Funded. ${creatorName} can start work.`;
    case "IN_PROGRESS":
      return `${creatorName} is working on it.`;
    case "REVISION_REQUESTED":
      return `Revision requested — waiting on ${creatorName}'s resubmission.`;
    case "SUBMITTED":
      return `${creatorName} submitted the work — review it.`;
    case "APPROVED":
    case "AUTO_APPROVED":
      return "Approved — payment is being released.";
    case "PAID":
      return `Paid. ${creatorName} has received the funds.`;
    default:
      return status;
  }
}
