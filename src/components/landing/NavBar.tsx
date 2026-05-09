"use client";

import { useState } from "react";
import { Menu, X } from "lucide-react";

const NAV_LINKS = [
  { label: "Discover", href: "#discover" },
  { label: "Live now", href: "#live" },
  { label: "For artists", href: "#artists" },
  { label: "Tickets", href: "#tickets" },
];

export function NavBar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-stage-black/95 backdrop-blur border-b border-border-subtle">
      <div className="max-w-7xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
        <a href="/" className="flex items-center gap-2">
          <span className="font-display font-bold text-2xl text-ayo-gold tracking-tight">
            Ayo
          </span>
          <span className="text-[10px] uppercase tracking-widest text-text-muted border border-border-subtle rounded-badge px-1.5 py-0.5">
            Beta
          </span>
        </a>

        <nav className="hidden md:flex items-center gap-8">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm text-text-secondary hover:text-text-primary transition-colors"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-3">
          <a
            href="/auth/signin"
            className="text-sm text-text-secondary hover:text-text-primary px-3 py-2 transition-colors"
          >
            Sign in
          </a>
          <a
            href="/auth/signin?role=artist"
            className="text-sm font-semibold text-stage-black bg-ayo-gold hover:bg-ayo-gold-hover px-4 py-2 rounded-btn transition-colors"
          >
            Become an artist
          </a>
        </div>

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
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="block text-sm text-text-secondary hover:text-text-primary"
              onClick={() => setOpen(false)}
            >
              {link.label}
            </a>
          ))}
          <div className="flex gap-3 pt-2 border-t border-border-subtle">
            <a
              href="/auth/signin"
              className="flex-1 text-center text-sm text-text-secondary border border-border-subtle rounded-btn px-3 py-2"
            >
              Sign in
            </a>
            <a
              href="/auth/signin?role=artist"
              className="flex-1 text-center text-sm font-semibold text-stage-black bg-ayo-gold rounded-btn px-3 py-2"
            >
              Become an artist
            </a>
          </div>
        </div>
      )}
    </header>
  );
}
