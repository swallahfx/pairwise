"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { QuestionTargetType } from "@/types";

// Public pre-purchase Q&A, shared by creator profiles and Upfront listing
// pages — same reasoning as showing reviews publicly: an answer is useful
// to the next person asking the same thing, not just the asker, so this
// isn't a private DM thread.
export function QuestionBox({
  targetType,
  targetId,
  isOwner
}: {
  targetType: QuestionTargetType;
  targetId: string;
  isOwner: boolean;
}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = ["questions", targetType, targetId];
  const { data: questions, isLoading } = useQuery({
    queryKey,
    queryFn: () => api.qa.listForTarget(targetType, targetId)
  });

  const [questionText, setQuestionText] = useState("");
  const askMutation = useMutation({
    mutationFn: () => api.qa.ask({ targetType, targetId, questionText }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      setQuestionText("");
    }
  });

  return (
    <div className="mt-10">
      <h2 className="font-display text-xl font-semibold mb-4">Questions & answers</h2>

      {isLoading && <p className="text-sm text-ink-muted">Loading…</p>}
      {!isLoading && questions?.length === 0 && (
        <p className="text-sm text-ink-muted mb-4">No questions yet — be the first to ask.</p>
      )}

      <div className="space-y-3 mb-4">
        {questions?.map((q) => (
          <QuestionRow key={q.id} question={q} isOwner={isOwner} queryKey={queryKey} />
        ))}
      </div>

      {user && !isOwner ? (
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (questionText.trim()) askMutation.mutate();
          }}
        >
          <input
            className="input"
            placeholder="Ask a question…"
            value={questionText}
            onChange={(e) => setQuestionText(e.target.value)}
          />
          <button
            type="submit"
            disabled={askMutation.isPending}
            className="bg-gradient-to-r from-accent to-accent-teal text-white text-sm font-semibold px-4 py-2.5 rounded-lg disabled:opacity-60 flex-shrink-0"
          >
            {askMutation.isPending ? "Asking…" : "Ask"}
          </button>
        </form>
      ) : !user ? (
        <p className="text-sm text-ink-muted">Log in to ask a question.</p>
      ) : null}
      {askMutation.isError && <p className="text-sm text-red-600 mt-2">{(askMutation.error as Error).message}</p>}
    </div>
  );
}

function QuestionRow({
  question,
  isOwner,
  queryKey
}: {
  question: import("@/types").Question;
  isOwner: boolean;
  queryKey: unknown[];
}) {
  const queryClient = useQueryClient();
  const [answerText, setAnswerText] = useState("");
  const [answering, setAnswering] = useState(false);
  const answerMutation = useMutation({
    mutationFn: () => api.qa.answer(question.id, answerText),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      setAnswering(false);
    }
  });

  return (
    <div className="bg-surface border border-border rounded-card p-4">
      <div className="text-sm font-semibold">
        Q: {question.questionText}
        <span className="text-ink-muted font-normal"> — {question.asker.name}</span>
      </div>
      {question.answerText ? (
        <div className="text-sm text-ink-muted mt-1.5">A: {question.answerText}</div>
      ) : isOwner ? (
        answering ? (
          <form
            className="flex gap-2 mt-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (answerText.trim()) answerMutation.mutate();
            }}
          >
            <input
              className="input"
              placeholder="Your answer…"
              value={answerText}
              onChange={(e) => setAnswerText(e.target.value)}
              autoFocus
            />
            <button
              type="submit"
              disabled={answerMutation.isPending}
              className="bg-gradient-to-r from-accent to-accent-teal text-white text-sm font-semibold px-3 py-2 rounded-lg disabled:opacity-60 flex-shrink-0"
            >
              Post
            </button>
          </form>
        ) : (
          <button onClick={() => setAnswering(true)} className="text-sm font-semibold text-accent mt-1.5">
            Answer this
          </button>
        )
      ) : (
        <div className="text-sm text-ink-muted mt-1.5 italic">Not answered yet.</div>
      )}
      {answerMutation.isError && (
        <p className="text-sm text-red-600 mt-1">{(answerMutation.error as Error).message}</p>
      )}
    </div>
  );
}
