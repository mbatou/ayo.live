"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/events", label: "Events" },
  { href: "/dashboard/profile", label: "Profile" },
] as const;

function isActive(pathname: string | null, href: string) {
  if (!pathname) return false;
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function DashboardSidebar({ email }: { email: string | null }) {
  const pathname = usePathname();
  return (
    <aside className="hidden lg:flex w-60 shrink-0 bg-surface border-r border-border-subtle flex-col">
      <div className="p-6 border-b border-border-subtle">
        <Link
          href="/"
          className="font-display text-xl font-bold text-ayo-gold hover:opacity-80 transition-opacity"
        >
          ayọ
        </Link>
        <p className="text-text-muted text-xs mt-1">Artist dashboard</p>
      </div>

      <nav className="flex-1 p-3 space-y-0.5">
        {NAV_ITEMS.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center px-3 py-2 rounded-btn text-sm transition-colors",
                active
                  ? "bg-ayo-gold/10 text-ayo-gold font-medium"
                  : "text-text-secondary hover:bg-stage-black hover:text-white",
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-border-subtle space-y-1">
        {email && (
          <p
            className="text-text-muted text-xs px-3 py-1 truncate"
            title={email}
          >
            {email}
          </p>
        )}
        <form action="/auth/signout" method="post">
          <button
            type="submit"
            className="w-full text-left px-3 py-2 text-sm text-text-secondary hover:text-white rounded-btn transition-colors"
          >
            Sign out
          </button>
        </form>
      </div>
    </aside>
  );
}

export function DashboardMobileNav() {
  const pathname = usePathname();
  return (
    <header className="lg:hidden bg-surface border-b border-border-subtle px-4 py-3 flex items-center gap-3 sticky top-0 z-10">
      <Link
        href="/"
        className="font-display text-lg font-bold text-ayo-gold shrink-0"
      >
        ayọ
      </Link>
      <nav className="flex-1 flex gap-1 text-xs overflow-x-auto">
        {NAV_ITEMS.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "px-2.5 py-1 rounded shrink-0 transition-colors",
                active
                  ? "bg-ayo-gold/10 text-ayo-gold font-medium"
                  : "text-text-secondary",
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
      <form action="/auth/signout" method="post">
        <button
          type="submit"
          className="text-xs text-text-muted hover:text-white px-2 py-1"
        >
          Sign out
        </button>
      </form>
    </header>
  );
}
