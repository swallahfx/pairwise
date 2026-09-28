"use client";

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

  return (
    <div className="flex items-center justify-between px-14 py-5 border-b border-border bg-surface">
      <div className="flex items-center gap-10">
        <Link href="/">
          <span className="font-display text-xl font-bold tracking-tight">Pairwise</span>
        </Link>
        <div className="flex gap-7 text-[15px]">
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

      {isLoading ? null : user ? (
        <div className="flex items-center gap-4">
          <NotificationBell />
          <div className="text-right leading-tight">
            <div className="text-sm font-semibold">{user.name}</div>
            <div className="text-xs text-ink-muted">
              {user.role === "DEVELOPER"
                ? "Developer"
                : user.role === "CREATOR"
                  ? "Creator"
                  : user.role === "BRAND"
                    ? "Brand"
                    : "Admin"}
            </div>
          </div>
          {(user.role === "DEVELOPER" || user.role === "ADMIN") && (
            <Link href="/products/new">
              <button className="bg-accent text-white text-sm font-semibold px-5 py-2.5 rounded-lg">
                List your product
              </button>
            </Link>
          )}
          <button
            onClick={() => {
              logout();
              router.push("/");
            }}
            className="text-sm text-ink-muted font-semibold px-2"
          >
            Log out
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-3">
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
    </div>
  );
}
