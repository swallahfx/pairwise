"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

// Shared by /creators/me and /brands/me — a creator and a brand release
// payouts through the exact same bank-account-resolve-then-save flow, just
// gated by a different eligibility rule per caller.
export function PayoutAccountForm({
  paystackRecipientCode,
  bankAccountName,
  bankAccountNumber,
  isEligible,
  ineligibleMessage,
  queryKey
}: {
  paystackRecipientCode?: string | null;
  bankAccountName?: string | null;
  bankAccountNumber?: string | null;
  isEligible: boolean;
  ineligibleMessage: string;
  queryKey: unknown[];
}) {
  const queryClient = useQueryClient();
  const { data: banks } = useQuery({ queryKey: ["banks"], queryFn: api.payments.listBanks });
  const [payoutForm, setPayoutForm] = useState({ bankCode: "", accountNumber: "" });
  const [resolvedName, setResolvedName] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);

  const resolveMutation = useMutation({
    mutationFn: () => api.payments.resolveAccount(payoutForm),
    onSuccess: (data) => setResolvedName(data.accountName)
  });

  const saveMutation = useMutation({
    mutationFn: () => api.payments.savePayoutAccount(payoutForm),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      setEditing(false);
      setResolvedName(null);
      setPayoutForm({ bankCode: "", accountNumber: "" });
    }
  });

  return (
    <div className="bg-surface border border-border rounded-card p-6">
      <h2 className="font-display text-xl font-semibold mb-1">Payouts</h2>
      <p className="text-sm text-ink-muted mb-4">
        Approved payouts release straight to this Nigerian bank account via Paystack — no card details, just
        your account number and bank.
      </p>

      {!isEligible ? (
        <p className="text-xs text-ink-muted">{ineligibleMessage}</p>
      ) : paystackRecipientCode && !editing ? (
        <div className="flex items-center justify-between bg-ground rounded-lg px-4 py-3">
          <div>
            <div className="text-sm font-semibold">{bankAccountName}</div>
            <div className="text-xs text-ink-muted">{bankAccountNumber} · linked for payouts</div>
          </div>
          <button onClick={() => setEditing(true)} className="text-sm font-semibold text-accent px-3 py-1.5">
            Change
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[12px] font-semibold mb-1.5">Bank</label>
              <select
                className="input"
                value={payoutForm.bankCode}
                onChange={(e) => {
                  setPayoutForm({ ...payoutForm, bankCode: e.target.value });
                  setResolvedName(null);
                }}
              >
                <option value="">Select your bank</option>
                {banks?.map((b) => (
                  <option key={b.code} value={b.code}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[12px] font-semibold mb-1.5">Account number</label>
              <input
                className="input"
                maxLength={10}
                value={payoutForm.accountNumber}
                onChange={(e) => {
                  setPayoutForm({ ...payoutForm, accountNumber: e.target.value.replace(/\D/g, "") });
                  setResolvedName(null);
                }}
                placeholder="0123456789"
              />
            </div>
          </div>

          {resolvedName ? (
            <div className="flex items-center justify-between bg-ground rounded-lg px-4 py-3">
              <div className="text-sm">
                Account belongs to <span className="font-semibold">{resolvedName}</span>
              </div>
              <button
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending}
                className="bg-gradient-to-r from-accent to-accent-teal text-white text-xs font-semibold px-3 py-1.5 rounded-lg disabled:opacity-60"
              >
                {saveMutation.isPending ? "Saving…" : "This is me — save"}
              </button>
            </div>
          ) : (
            <button
              onClick={() => resolveMutation.mutate()}
              disabled={
                resolveMutation.isPending || !payoutForm.bankCode || payoutForm.accountNumber.length !== 10
              }
              className="bg-gradient-to-r from-accent to-accent-teal text-white text-sm font-semibold px-4 py-2.5 rounded-lg disabled:opacity-40"
            >
              {resolveMutation.isPending ? "Verifying…" : "Verify account"}
            </button>
          )}
          {editing && (
            <button
              onClick={() => {
                setEditing(false);
                setResolvedName(null);
              }}
              className="text-sm font-semibold text-ink-muted px-1"
            >
              Cancel
            </button>
          )}
        </div>
      )}
      {(resolveMutation.isError || saveMutation.isError) && (
        <p className="text-sm text-red-600 mt-2">
          {((resolveMutation.error ?? saveMutation.error) as Error).message}
        </p>
      )}
    </div>
  );
}
