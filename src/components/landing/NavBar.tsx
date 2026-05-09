"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Role = "artist" | "fan";

const PUBLIC_NAV_LINKS = [
  { label: "Discover", href: "/#shows" },
  { label: "Live now", href: "/#live" },
  { label: "For artists", href: "/auth/signin?role=artist" },
];

export function NavBar() {
  const [open, setOpen] = useState(false);
  const [authState, setAuthState] = useState<{
    loading: boolean;
    signedIn: boolean;
    role: Role | null;
  }>({ loading: true, signedIn: false, role: null });

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data }) => {
      if (cancelled) return;
      if (!data.user) {
        setAuthState({ loading: false, signedIn: false, role: null });
        return;
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .single();
      if (cancelled) return;
      const role =
        profile?.role === "artist" || profile?.role === "fan"
          ? (profile.role as Role)
          : null;
      setAuthState({ loading: false, signedIn: true, role });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const ticketsHref = authState.signedIn
    ? "/fan/tickets"
    : "/auth/signin?role=fan&next=/fan/tickets";

  const navLinks = [
    ...PUBLIC_NAV_LINKS,
    { label: "Tickets", href: ticketsHref },
  ];

  // Right-side CTAs depend on auth state
  const rightSide = (() => {
    if (authState.loading) {
      // Reserve space, render nothing — avoids flash from "Sign in" → "My studio".
      return <div className="w-[260px] h-9" aria-hidden />;
    }
    if (authState.signedIn) {
      const dashboardHref = authState.role === "artist" ? "/dashboard" : "/fan";
      const dashboardLabel =
        authState.role === "artist" ? "My studio" : "My shows";
      return (
        <>
          <Link
            href={dashboardHref}
            className="text-sm font-semibold text-stage-black bg-ayo-gold hover:bg-ayo-gold-hover px-4 py-2 rounded-btn transition-colors"
          >
            {dashboardLabel}
          </Link>
        </>
      );
    }
    return (
      <>
        <Link
          href="/auth/signin"
          className="text-sm text-text-secondary hover:text-text-primary px-3 py-2 transition-colors"
        >
          Sign in
        </Link>
        <Link
          href="/auth/signin?role=artist"
          className="text-sm font-semibold text-stage-black bg-ayo-gold hover:bg-ayo-gold-hover px-4 py-2 rounded-btn transition-colors"
        >
          Become an artist
        </Link>
      </>
    );
  })();

  return (
    <header className="sticky top-0 z-50 bg-stage-black/95 backdrop-blur border-b border-border-subtle">
      <div className="max-w-7xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <span className="font-display font-bold text-2xl text-ayo-gold tracking-tight">
            Ayo
          </span>
          <span className="text-[10px] uppercase tracking-widest text-text-muted border border-border-subtle rounded-badge px-1.5 py-0.5">
            Beta
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="text-sm text-text-secondary hover:text-text-primary transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-3">{rightSide}</div>

        <button
          aria-label="Toggle menu"
          className="md:hidden p-2 text-text-primary"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {open && (
        <div className="md:hidden border-t border-border-subtle bg-stage-black px-4 py-4 space-y-3">
          {navLinks.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="block text-sm text-text-secondary hover:text-text-primary"
              onClick={() => setOpen(false)}
            >
              {link.label}
            </Link>
          ))}
          {!authState.loading && (
            <div className="flex gap-3 pt-2 border-t border-border-subtle">
              {authState.signedIn ? (
                <Link
                  href={authState.role === "artist" ? "/dashboard" : "/fan"}
                  className="flex-1 text-center text-sm font-semibold text-stage-black bg-ayo-gold rounded-btn px-3 py-2"
                  onClick={() => setOpen(false)}
                >
                  {authState.role === "artist" ? "My studio" : "My shows"}
                </Link>
              ) : (
                <>
                  <Link
                    href="/auth/signin"
                    className="flex-1 text-center text-sm text-text-secondary border border-border-subtle rounded-btn px-3 py-2"
                    onClick={() => setOpen(false)}
                  >
                    Sign in
                  </Link>
                  <Link
                    href="/auth/signin?role=artist"
                    className="flex-1 text-center text-sm font-semibold text-stage-black bg-ayo-gold rounded-btn px-3 py-2"
                    onClick={() => setOpen(false)}
                  >
                    Become an artist
                  </Link>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </header>
  );
}
