"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";

export function SaveButton({ creatorId, size = "text-sm" }: { creatorId: string; size?: string }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: saved } = useQuery({
    queryKey: ["saved-creators"],
    queryFn: api.creators.listSaved,
    enabled: !!user
  });

  const isSaved = saved?.some((s) => s.creator.id === creatorId) ?? false;

  const saveMutation = useMutation({
    mutationFn: () => api.creators.save(creatorId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["saved-creators"] })
  });
  const unsaveMutation = useMutation({
    mutationFn: () => api.creators.unsave(creatorId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["saved-creators"] })
  });

  if (!user) return null;

  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        isSaved ? unsaveMutation.mutate() : saveMutation.mutate();
      }}
      disabled={saveMutation.isPending || unsaveMutation.isPending}
      className={`flex-shrink-0 ${size} ${isSaved ? "text-red-500" : "text-ink-muted"}`}
      title={isSaved ? "Remove from saved" : "Save creator"}
    >
      {isSaved ? "♥" : "♡"}
    </button>
  );
}
