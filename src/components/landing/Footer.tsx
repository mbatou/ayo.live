import Link from "next/link";

const TOP_LINKS = [
  { label: "Discover", href: "/#shows" },
  { label: "Live now", href: "/#live" },
  { label: "For artists", href: "/auth/signin?role=artist" },
  { label: "Tickets", href: "/fan/tickets" },
];

const BOTTOM_LINKS = [
  { label: "For artists", href: "/auth/signin?role=artist" },
  { label: "For groups", href: "/auth/signin?role=artist" },
  { label: "Pricing", href: "mailto:hello@ayo.live?subject=Ayo%20pricing" },
  { label: "Help", href: "mailto:hello@ayo.live" },
];

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-stage-black border-t border-border-subtle">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-12">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <Link href="/" className="flex items-center gap-2">
            <span className="font-display font-bold text-2xl text-ayo-gold tracking-tight">
              Ayo
            </span>
          </Link>

          <nav className="flex flex-wrap gap-6">
            {TOP_LINKS.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="text-sm text-text-secondary hover:text-text-primary transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <p className="text-[11px] tracking-[0.2em] uppercase text-text-muted">
            Joy · Live · Made for Africa
          </p>
        </div>

        <div className="mt-10 pt-6 border-t border-border-subtle flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-text-muted">
          <span>© {year} Ayo</span>
          {BOTTOM_LINKS.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="hover:text-text-secondary transition-colors"
            >
              · {link.label}
            </Link>
          ))}
        </div>
      </div>
    </footer>
  );
}
