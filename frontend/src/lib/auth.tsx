"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

export interface AuthUser {
  token: string;
  userId: string;
  role: "DEVELOPER" | "CREATOR" | "ADMIN" | "BRAND";
  name: string;
  email: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  login: (user: AuthUser) => void;
  logout: () => void;
}

const TOKEN_KEY = "pairwise_token";
const USER_KEY = "pairwise_user";

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      const token = localStorage.getItem(TOKEN_KEY);
      const rawUser = localStorage.getItem(USER_KEY);
      if (token && rawUser) {
        setUser({ token, ...JSON.parse(rawUser) });
      }
    } catch {
      // corrupt/blocked storage — treat as logged out
    }
    setIsLoading(false);
  }, []);

  const login = useCallback((next: AuthUser) => {
    localStorage.setItem(TOKEN_KEY, next.token);
    localStorage.setItem(
      USER_KEY,
      JSON.stringify({ userId: next.userId, role: next.role, name: next.name, email: next.email })
    );
    setUser(next);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setUser(null);
  }, []);

  return <AuthContext.Provider value={{ user, isLoading, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
