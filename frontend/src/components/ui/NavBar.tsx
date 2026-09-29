"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { NotificationBell } from "./NotificationBell";

const links = [
  { href: "/creators", label: "Creators" },
  { href: "/products", label: "Products" },
  { href: "/requests", label: "Requests" },
  { href: "/upfront", label: "Upfront" }
];

export function NavBar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout, isLoading } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  // Buying a slot is open to any role, so "My purchases" shows for
  // everyone logged in — but listing management stays split by role:
  // a creator's listings live under their existing profile page, a
  // brand's under its own, never a shared generic form for both. Admin
  // gets every link, not just "Admin" — they hold a real
  // Developer/Creator/Brand profile too (see backend's adminProfileBundle)
  // and can exercise any flow on the platform, not just the admin panel.
  const authedLinks = !user
    ? links
    : [
        ...(user.role === "ADMIN" ? [{ href: "/admin", label: "Admin" }] : []),
        ...links,
        ...(user.role !== "BRAND"
          ? [
              { href: "/offers", label: "Offers" },
              { href: "/orders", label: "Orders" }
            ]
          : []),
        { href: "/upfront/purchases", label: "My purchases" },
        { href: "/creators/saved", label: "Saved" },
        ...(user.role === "CREATOR" || user.role === "ADMIN" ? [{ href: "/creators/me", label: "My profile" }] : []),
        ...(user.role === "BRAND" || user.role === "ADMIN" ? [{ href: "/brands/me", label: "My Brand" }] : [])
      ];

  const roleLabel = !user
    ? ""
    : user.role === "DEVELOPER"
      ? "Developer"
      : user.role === "CREATOR"
        ? "Creator"
        : user.role === "BRAND"
          ? "Brand"
          : "Admin";

  function onLogout() {
    logout();
    setMenuOpen(false);
    router.push("/");
  }

  return (
    <div className="border-b border-border bg-surface relative">
      <div className="flex items-center justify-between px-4 sm:px-8 lg:px-14 py-3 lg:py-5">
        <div className="flex items-center gap-10 min-w-0">
          <Link href="/" className="flex-shrink-0" onClick={() => setMenuOpen(false)}>
            {/* eslint-disable-next-line @next/next/no-img-element -- static local SVG, no benefit from next/image's raster optimization */}
            <img src="/logo.svg" alt="Pairwize" className="h-9 w-auto lg:h-10" />
          </Link>

          {/* Desktop nav links — hidden below lg, replaced by the menu panel */}
          <div className="hidden lg:flex gap-7 text-[15px]">
            {authedLinks.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={pathname?.startsWith(l.href) ? "font-semibold" : "text-ink-muted"}
              >
                {l.label}
              </Link>
            ))}
          </div>
        </div>

        {/* Desktop right side */}
        {isLoading ? null : user ? (
          <div className="hidden lg:flex items-center gap-4 flex-shrink-0">
            <NotificationBell />
            <div className="text-right leading-tight">
              <div className="text-sm font-semibold">{user.name}</div>
              <div className="text-xs text-ink-muted">{roleLabel}</div>
            </div>
            {(user.role === "DEVELOPER" || user.role === "ADMIN") && (
              <Link href="/products/new">
                <button className="bg-accent text-white text-sm font-semibold px-5 py-2.5 rounded-lg">
                  List your product
                </button>
              </Link>
            )}
            <button onClick={onLogout} className="text-sm text-ink-muted font-semibold px-2">
              Log out
            </button>
          </div>
        ) : (
          <div className="hidden lg:flex items-center gap-3 flex-shrink-0">
            <Link href="/login" className="text-sm font-semibold text-ink-muted">
              Log in
            </Link>
            <Link href="/register">
              <button className="bg-accent text-white text-sm font-semibold px-5 py-2.5 rounded-lg">
                Register
              </button>
            </Link>
          </div>
        )}

        {/* Mobile / tablet: bell (if logged in) + hamburger */}
        <div className="flex lg:hidden items-center gap-2 flex-shrink-0">
          {!isLoading && user && <NotificationBell />}
          <button
            onClick={() => setMenuOpen((o) => !o)}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            className="w-10 h-10 flex flex-col items-center justify-center gap-1.5 flex-shrink-0"
          >
            <span
              className={`block w-5 h-0.5 bg-ink transition-transform ${menuOpen ? "translate-y-2 rotate-45" : ""}`}
            />
            <span className={`block w-5 h-0.5 bg-ink transition-opacity ${menuOpen ? "opacity-0" : ""}`} />
            <span
              className={`block w-5 h-0.5 bg-ink transition-transform ${menuOpen ? "-translate-y-2 -rotate-45" : ""}`}
            />
          </button>
        </div>
      </div>

      {/* Mobile / tablet menu panel */}
      {menuOpen && (
        <div className="lg:hidden border-t border-border bg-surface px-4 sm:px-8 py-4 max-h-[calc(100vh-56px)] overflow-y-auto">
          {!isLoading && user && (
            <div className="flex items-center justify-between pb-4 mb-3 border-b border-border">
              <div>
                <div className="text-sm font-semibold">{user.name}</div>
                <div className="text-xs text-ink-muted">{roleLabel}</div>
              </div>
              <button onClick={onLogout} className="text-sm text-ink-muted font-semibold px-2 py-1.5">
                Log out
              </button>
            </div>
          )}

          <div className="flex flex-col gap-1">
            {authedLinks.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setMenuOpen(false)}
                className={`py-2.5 text-[15px] ${
                  pathname?.startsWith(l.href) ? "font-semibold" : "text-ink-muted"
                }`}
              >
                {l.label}
              </Link>
            ))}
          </div>

          {!isLoading && user && (user.role === "DEVELOPER" || user.role === "ADMIN") && (
            <Link href="/products/new" onClick={() => setMenuOpen(false)}>
              <button className="mt-4 w-full bg-accent text-white text-sm font-semibold px-5 py-3 rounded-lg">
                List your product
              </button>
            </Link>
          )}

          {!isLoading && !user && (
            <div className="flex flex-col gap-2.5 mt-2">
              <Link href="/login" onClick={() => setMenuOpen(false)} className="text-sm font-semibold text-ink-muted py-2">
                Log in
              </Link>
              <Link href="/register" onClick={() => setMenuOpen(false)}>
                <button className="w-full bg-accent text-white text-sm font-semibold px-5 py-3 rounded-lg">
                  Register
                </button>
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
