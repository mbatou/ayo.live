"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/fan", icon: "ti-layout-dashboard", label: "My shows" },
  { href: "/fan/discover", icon: "ti-search", label: "Discover" },
  { href: "/fan/tickets", icon: "ti-ticket", label: "My tickets" },
  { href: "/fan/following", icon: "ti-heart", label: "Following" },
  { href: "/fan/settings", icon: "ti-settings", label: "Settings" },
] as const;

interface Props {
  profile: { display_name: string | null; location: string | null };
}

export function FanSidebar({ profile }: Props) {
  const pathname = usePathname();
  const initials = (profile.display_name ?? "FA").slice(0, 2).toUpperCase();

  return (
    <aside className="w-[200px] bg-[#111] border-r border-border-subtle flex flex-col flex-shrink-0 h-screen">
      <div className="px-5 py-5 border-b border-border-subtle">
        <Link
          href="/"
          className="font-display text-xl font-bold text-ayo-gold tracking-tight hover:opacity-80 transition-opacity"
        >
          ayọ
        </Link>
        <div className="text-[10px] text-text-muted tracking-[2px] uppercase mt-0.5">
          Fan
        </div>
      </div>

      <nav className="flex-1 py-4">
        {NAV.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== "/fan" && pathname?.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 px-5 py-2.5 text-[13px] border-l-2 transition-all",
                active
                  ? "text-ayo-gold bg-ayo-gold/5 border-l-ayo-gold"
                  : "text-text-muted border-l-transparent hover:text-text-secondary hover:bg-white/[0.03]",
              )}
            >
              <i className={`ti ${item.icon} text-base`} aria-hidden="true" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="px-5 py-4 border-t border-border-subtle flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-full bg-protected/20 flex items-center justify-center text-xs font-semibold text-protected flex-shrink-0">
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[12px] font-medium text-text-secondary truncate">
            {profile.display_name ?? "Fan"}
          </p>
          <p className="text-[11px] text-text-muted truncate">
            {profile.location ?? "Fan"}
          </p>
        </div>
        <form action="/auth/signout" method="post">
          <button
            type="submit"
            title="Sign out"
            aria-label="Sign out"
            className="text-text-muted hover:text-white transition-colors p-1 -mr-1"
          >
            <i className="ti ti-logout text-sm" aria-hidden="true" />
          </button>
        </form>
      </div>
    </aside>
  );
}
