"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { GoogleSignInButton } from "@/components/ui/GoogleSignInButton";

export default function RegisterPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [form, setForm] = useState<{
    name: string;
    email: string;
    password: string;
    role: "DEVELOPER" | "CREATOR" | "BRAND";
  }>({ name: "", email: "", password: "", role: "DEVELOPER" });

  const onAuthed = (data: {
    token: string;
    userId: string;
    role: "DEVELOPER" | "CREATOR" | "ADMIN" | "BRAND";
    name: string;
    email: string;
  }) => {
    login(data);
    router.push(data.role === "CREATOR" ? "/creators/me" : data.role === "BRAND" ? "/brands/me" : "/creators");
  };

  const mutation = useMutation({
    mutationFn: () => api.auth.register(form),
    onSuccess: onAuthed
  });

  const googleMutation = useMutation({
    mutationFn: (credential: string) => api.auth.google({ credential, role: form.role }),
    onSuccess: onAuthed
  });

  return (
    <div className="max-w-sm mx-auto px-6 py-16">
      <h1 className="font-display text-3xl font-semibold mb-2">Create an account</h1>
      <p className="text-ink-muted mb-9">
        Developers hire creators. Creators list rates. Brands sell advertising into their own upcoming
        programs.
      </p>

      <form
        className="space-y-5"
        onSubmit={(e) => {
          e.preventDefault();
          mutation.mutate();
        }}
      >
        <div>
          <label className="block text-[13px] font-semibold mb-2">I am a…</label>
          <div className="flex gap-2.5">
            {(["DEVELOPER", "CREATOR", "BRAND"] as const).map((role) => (
              <button
                type="button"
                key={role}
                onClick={() => setForm({ ...form, role })}
                className={`flex-1 py-2.5 rounded-lg text-sm font-semibold border ${
                  form.role === role ? "bg-gradient-to-r from-accent to-accent-teal text-white border-accent" : "bg-surface border-border"
                }`}
              >
                {role === "DEVELOPER" ? "Developer" : role === "CREATOR" ? "Creator" : "Brand"}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-[13px] font-semibold mb-2">Name</label>
          <input
            className="input"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
        </div>
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
            minLength={8}
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
          />
        </div>
        <button
          type="submit"
          disabled={mutation.isPending}
          className="w-full bg-gradient-to-r from-accent to-accent-teal text-white py-3.5 rounded-lg font-semibold text-[15px] disabled:opacity-60"
        >
          {mutation.isPending ? "Creating…" : "Create account"}
        </button>
        {mutation.isError && <p className="text-sm text-red-600">{(mutation.error as Error).message}</p>}
      </form>

      <div className="my-6 flex items-center gap-3">
        <div className="h-px bg-border flex-1" />
        <span className="text-xs text-ink-muted">or</span>
        <div className="h-px bg-border flex-1" />
      </div>

      <GoogleSignInButton role={form.role} onCredential={(credential) => googleMutation.mutate(credential)} />
      <p className="text-xs text-ink-muted mt-2">
        Signs up as{" "}
        {form.role === "DEVELOPER" ? "a developer" : form.role === "CREATOR" ? "a creator" : "a brand"} — change
        that above first if needed.
      </p>
      {googleMutation.isError && (
        <p className="text-sm text-red-600 mt-3">{(googleMutation.error as Error).message}</p>
      )}

      <p className="text-sm text-ink-muted mt-6">
        Already have an account?{" "}
        <Link href="/login" className="text-accent font-semibold">
          Log in
        </Link>
      </p>
    </div>
  );
}
