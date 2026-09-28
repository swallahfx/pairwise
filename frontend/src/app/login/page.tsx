"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { GoogleSignInButton } from "@/components/ui/GoogleSignInButton";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [form, setForm] = useState({ email: "", password: "" });

  const onAuthed = (data: {
    token: string;
    userId: string;
    role: "DEVELOPER" | "CREATOR" | "ADMIN" | "BRAND";
    name: string;
    email: string;
  }) => {
    login(data);
    router.push(
      data.role === "ADMIN"
        ? "/admin"
        : data.role === "CREATOR"
          ? "/creators/me"
          : data.role === "BRAND"
            ? "/brands/me"
            : "/creators"
    );
  };

  const mutation = useMutation({
    mutationFn: () => api.auth.login(form),
    onSuccess: onAuthed
  });

  const googleMutation = useMutation({
    mutationFn: (credential: string) => api.auth.google({ credential }),
    onSuccess: onAuthed
  });

  return (
    <div className="max-w-sm mx-auto px-6 py-16">
      <h1 className="font-display text-3xl font-semibold mb-9">Log in</h1>

      <form
        className="space-y-5"
        onSubmit={(e) => {
          e.preventDefault();
          mutation.mutate();
        }}
      >
        <div>
          <label className="block text-[13px] font-semibold mb-2">Email</label>
          <input
            className="input"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
          />
        </div>
        <div>
          <label className="block text-[13px] font-semibold mb-2">Password</label>
          <input
            className="input"
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
          />
        </div>
        <button
          type="submit"
          disabled={mutation.isPending}
          className="w-full bg-accent text-white py-3.5 rounded-lg font-semibold text-[15px] disabled:opacity-60"
        >
          {mutation.isPending ? "Logging in…" : "Log in"}
        </button>
        {mutation.isError && <p className="text-sm text-red-600">{(mutation.error as Error).message}</p>}
      </form>

      <div className="my-6 flex items-center gap-3">
        <div className="h-px bg-border flex-1" />
        <span className="text-xs text-ink-muted">or</span>
        <div className="h-px bg-border flex-1" />
      </div>

      <GoogleSignInButton onCredential={(credential) => googleMutation.mutate(credential)} />
      {googleMutation.isError && (
        <p className="text-sm text-red-600 mt-3">{(googleMutation.error as Error).message}</p>
      )}

      <p className="text-sm text-ink-muted mt-6">
        No account?{" "}
        <Link href="/register" className="text-accent font-semibold">
          Register
        </Link>
      </p>
    </div>
  );
}
