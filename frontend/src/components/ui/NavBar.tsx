"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { roleLabel } from "@/lib/roleLabel";
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
  const [accountOpen, setAccountOpen] = useState(false);

  const { data: badgeCounts } = useQuery({
    queryKey: ["badge-counts"],
    queryFn: api.badges.counts,
    enabled: !!user,
    refetchInterval: 20000
  });

  // Only creators/upfront/creators-directory carry an unread-style badge —
  // everything else in the nav is either an action (Admin, List your
  // product) or a personal list with no "new since last visit" concept.
  const badgeForHref: Record<string, number | undefined> = {
    "/requests": badgeCounts?.requests,
    "/upfront": badgeCounts?.upfront,
    "/creators": badgeCounts?.creators
  };

  // Primary nav: the marketplace sections themselves, plus Admin/Offers/
  // Orders where the role calls for them. Admin gets every role's primary
  // link, not just "Admin" — they hold a real Developer/Creator/Brand
  // profile too (see backend's adminProfileBundle) and can exercise any
  // flow on the platform, not just the admin panel. Personal/account links
  // (purchases, saved, profile pages) live in the account dropdown below
  // instead of here — with admin alone pulling in every role's links, a
  // single flat top-level row stopped fitting any reasonable desktop width.
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
          : [])
      ];

  // Buying a slot is open to any role, so "My purchases"/"Saved" show for
  // everyone logged in — but listing management stays split by role: a
  // creator's listings live under their existing profile page, a brand's
  // under its own, never a shared generic form for both.
  const accountLinks = !user
    ? []
    : [
        { href: "/upfront/purchases", label: "My purchases" },
        { href: "/creators/saved", label: "Saved" },
        ...(user.role === "CREATOR" || user.role === "ADMIN" ? [{ href: "/creators/me", label: "My profile" }] : []),
        ...(user.role === "BRAND" || user.role === "ADMIN" ? [{ href: "/brands/me", label: "My Brand" }] : [])
      ];

  const roleLabelText = !user ? "" : roleLabel(user.role);

  function onLogout() {
    logout();
    setMenuOpen(false);
    router.push("/");
  }

  return (
    <div className="border-b border-border bg-surface relative">
      <div className="flex items-center justify-between px-4 sm:px-8 lg:px-14 py-3 lg:py-5">
        <div className="flex items-center gap-10 min-w-0">
          <Link href="/" className="flex-shrink-0 flex items-center gap-2" onClick={() => setMenuOpen(false)}>
            {/* eslint-disable-next-line @next/next/no-img-element -- static local PNG, no benefit from next/image's raster optimization */}
            <img src="/logo-mark.png" alt="" className="h-8 w-8 lg:h-9 lg:w-9" />
            <span className="font-display font-bold text-lg lg:text-xl tracking-tight">Pairwize</span>
          </Link>

          {/* Desktop nav links — hidden below lg, replaced by the menu panel */}
          <div className="hidden xl:flex gap-7 text-[15px]">
            {authedLinks.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={`flex items-center gap-1.5 ${pathname?.startsWith(l.href) ? "font-semibold" : "text-ink-muted"}`}
              >
                {l.label}
                <NavBadge count={badgeForHref[l.href]} />
              </Link>
            ))}
          </div>
        </div>

        {/* Desktop right side */}
        {isLoading ? null : user ? (
          <div className="hidden xl:flex items-center gap-4 flex-shrink-0">
            <NotificationBell />
            <div className="relative">
              <button
                onClick={() => setAccountOpen((o) => !o)}
                className="text-right leading-tight flex items-center gap-1.5"
              >
                <span>
                  <span className="block text-sm font-semibold">{user.name}</span>
                  <span className="block text-xs text-ink-muted">{roleLabelText}</span>
                </span>
                <span className="text-ink-muted text-xs mt-0.5">▾</span>
              </button>
              {accountOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setAccountOpen(false)} />
                  <div className="absolute right-0 top-9 z-20 w-52 bg-surface border border-border rounded-card shadow-lg overflow-hidden py-1.5">
                    {accountLinks.map((l) => (
                      <Link
                        key={l.href}
                        href={l.href}
                        onClick={() => setAccountOpen(false)}
                        className="flex items-center gap-1.5 px-4 py-2 text-sm text-ink hover:bg-ground"
                      >
                        {l.label}
                        <NavBadge count={badgeForHref[l.href]} />
                      </Link>
                    ))}
                    <div className="border-t border-border mt-1.5 pt-1.5">
                      <button
                        onClick={onLogout}
                        className="w-full text-left px-4 py-2 text-sm text-ink-muted hover:bg-ground"
                      >
                        Log out
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
            {(user.role === "DEVELOPER" || user.role === "ADMIN") && (
              <Link href="/products/new">
                <button className="bg-gradient-to-r from-accent to-accent-teal text-white text-sm font-semibold px-5 py-2.5 rounded-lg">
                  List your product
                </button>
              </Link>
            )}
          </div>
        ) : (
          <div className="hidden xl:flex items-center gap-3 flex-shrink-0">
            <Link href="/login" className="text-sm font-semibold text-ink-muted">
              Log in
            </Link>
            <Link href="/register">
              <button className="bg-gradient-to-r from-accent to-accent-teal text-white text-sm font-semibold px-5 py-2.5 rounded-lg">
                Register
              </button>
            </Link>
          </div>
        )}

        {/* Mobile / tablet: bell (if logged in) + hamburger */}
        <div className="flex xl:hidden items-center gap-2 flex-shrink-0">
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
        <div className="xl:hidden border-t border-border bg-surface px-4 sm:px-8 py-4 max-h-[calc(100vh-56px)] overflow-y-auto">
          {!isLoading && user && (
            <div className="flex items-center justify-between pb-4 mb-3 border-b border-border">
              <div>
                <div className="text-sm font-semibold">{user.name}</div>
                <div className="text-xs text-ink-muted">{roleLabelText}</div>
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
                className={`py-2.5 text-[15px] flex items-center gap-1.5 ${
                  pathname?.startsWith(l.href) ? "font-semibold" : "text-ink-muted"
                }`}
              >
                {l.label}
                <NavBadge count={badgeForHref[l.href]} />
              </Link>
            ))}
          </div>

          {accountLinks.length > 0 && (
            <div className="flex flex-col gap-1 mt-3 pt-3 border-t border-border">
              {accountLinks.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={() => setMenuOpen(false)}
                  className={`py-2.5 text-[15px] flex items-center gap-1.5 ${
                    pathname?.startsWith(l.href) ? "font-semibold" : "text-ink-muted"
                  }`}
                >
                  {l.label}
                  <NavBadge count={badgeForHref[l.href]} />
                </Link>
              ))}
            </div>
          )}

          {!isLoading && user && (user.role === "DEVELOPER" || user.role === "ADMIN") && (
            <Link href="/products/new" onClick={() => setMenuOpen(false)}>
              <button className="mt-4 w-full bg-gradient-to-r from-accent to-accent-teal text-white text-sm font-semibold px-5 py-3 rounded-lg">
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
                <button className="w-full bg-gradient-to-r from-accent to-accent-teal text-white text-sm font-semibold px-5 py-3 rounded-lg">
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

function NavBadge({ count }: { count: number | undefined }) {
  if (!count) return null;
  return (
    <span className="bg-gradient-to-r from-accent to-accent-teal text-white text-[11px] font-bold rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center leading-none">
      {count > 9 ? "9+" : count}
    </span>
  );
}
