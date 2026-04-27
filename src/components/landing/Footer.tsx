const FOOTER_LINKS = [
  { label: "Discover", href: "#discover" },
  { label: "Live now", href: "#live" },
  { label: "For artists", href: "#artists" },
  { label: "Tickets", href: "#tickets" },
];

const BOTTOM_LINKS = [
  { label: "For artists", href: "#artists" },
  { label: "For groups", href: "#groups" },
  { label: "Pricing", href: "#pricing" },
  { label: "Help", href: "#help" },
];

export function Footer() {
  return (
    <footer className="bg-stage-black border-t border-border-subtle">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-12">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <a href="/" className="flex items-center gap-2">
            <span className="font-display font-bold text-2xl text-ayo-gold tracking-tight">
              Ayo
            </span>
          </a>

          <nav className="flex flex-wrap gap-6">
            {FOOTER_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-sm text-text-secondary hover:text-text-primary transition-colors"
              >
                {link.label}
              </a>
            ))}
          </nav>

          <p className="text-[11px] tracking-[0.2em] uppercase text-text-muted">
            Joy · Live · Made for Africa
          </p>
        </div>

        <div className="mt-10 pt-6 border-t border-border-subtle flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-text-muted">
          <span>© 2025 Ayo</span>
          {BOTTOM_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="hover:text-text-secondary transition-colors"
            >
              · {link.label}
            </a>
          ))}
        </div>
      </div>
    </footer>
  );
}
