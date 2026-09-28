"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { AppNotification } from "@/types";

// Purely in-app — polls every 20s rather than pushing, which is plenty for
// a marketplace where "funded" or "submitted" doesn't need sub-second
// delivery, and avoids standing up a websocket/SSE channel for it.
export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data } = useQuery({
    queryKey: ["notifications"],
    queryFn: api.notifications.mine,
    refetchInterval: 20000
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => api.notifications.markRead(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] })
  });
  const markAllReadMutation = useMutation({
    mutationFn: api.notifications.markAllRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] })
  });

  const unreadCount = data?.unreadCount ?? 0;

  function onClickNotification(n: AppNotification) {
    if (!n.isRead) markReadMutation.mutate(n.id);
    setOpen(false);
    if (n.link) router.push(n.link);
  }

  return (
    <div className="relative">
      <button onClick={() => setOpen((o) => !o)} className="relative text-ink-muted px-1" title="Notifications">
        <span className="text-xl">🔔</span>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-9 z-20 w-80 bg-surface border border-border rounded-card shadow-lg overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <span className="text-sm font-semibold">Notifications</span>
              {unreadCount > 0 && (
                <button
                  onClick={() => markAllReadMutation.mutate()}
                  className="text-xs font-semibold text-accent"
                >
                  Mark all read
                </button>
              )}
            </div>
            <div className="max-h-96 overflow-y-auto">
              {data?.notifications.length === 0 && (
                <div className="px-4 py-6 text-sm text-ink-muted text-center">No notifications yet.</div>
              )}
              {data?.notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => onClickNotification(n)}
                  className={`block w-full text-left px-4 py-3 border-b border-border last:border-0 text-sm ${
                    n.isRead ? "text-ink-muted" : "font-semibold bg-ground/40"
                  }`}
                >
                  {n.message}
                  <div className="text-[11px] text-ink-muted font-normal mt-1">
                    {new Date(n.createdAt).toLocaleString()}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
