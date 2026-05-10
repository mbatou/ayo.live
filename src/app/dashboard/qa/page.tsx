const CHECKLIST = [
  {
    section: "Auth",
    items: [
      "Sign out and sign back in via password — artist lands on /dashboard",
      "Sign out and sign back in as fan — lands on /fan",
      "New user signs up — lands on /onboarding, role pre-selected if ?role=artist",
      "Already signed-in user visits /auth/signin — redirected immediately",
      "Fan tries to visit /dashboard — redirected to /fan",
      "Artist tries to visit /fan — redirected to /dashboard",
    ],
  },
  {
    section: "Event creation",
    items: [
      "Artist creates event via /dashboard/events/new — row appears in Supabase",
      "Event appears in /dashboard/events list with status 'draft'",
      "Artist publishes event — status changes to 'published'",
      "Published event appears on landing page (may take up to 60s)",
      "Published event appears on fan dashboard discovery strip",
      "Event detail page /events/[id] renders correctly",
    ],
  },
  {
    section: "Ticket purchase",
    items: [
      "Fan clicks 'Get ticket' on event page — redirected to /auth/signin if not signed in",
      "After sign in, fan lands back on event page (via ?next= param)",
      "Fan clicks 'Get ticket' when signed in — Paystack checkout loads",
      "Use test card: 4084 0840 8408 4081 / CVV: 408 / any future expiry",
      "After payment — redirected to /tickets/[token]?success=1",
      "Ticket row in Supabase has status 'confirmed' and valid UUID token",
      "Fan receives ticket email within 60 seconds",
      "Email contains correct watch link: /watch/[token]",
    ],
  },
  {
    section: "Fan dashboard",
    items: [
      "Confirmed ticket appears in 'Your tickets' on /fan",
      "Ticket shows correct event name, date, price, 'Upcoming' status",
      "Discovery strip shows published events from DB",
    ],
  },
  {
    section: "Artist dashboard",
    items: [
      "Dashboard stats reflect real ticket count and earnings",
      "Event card shows ticket progress bar and net earnings",
      "Artist can go to /dashboard/events/[id] and see ticket count",
      "Artist sets payout account in /dashboard/settings",
    ],
  },
  {
    section: "Payout flow",
    items: [
      "Artist sets up payout account (bank/Mobile Money) in Settings",
      "Settings page shows '✓ Connected' once Paystack recipient is created",
      "Artist publishes → goes live → ends event via /dashboard/events/[id]",
      "Artist clicks 'Request payout' — Paystack transfer initiated",
      "Payout row appears in Supabase payouts table with status 'processing'",
      "paystack_transfer_id is set on the payout row",
      "Artist receives funds within 24 hours (live test only)",
    ],
  },
  {
    section: "Landing page",
    items: [
      "Published events replace placeholder cards within 60s of seeding",
      "Event cards link to real /events/[id] pages",
      "Nav shows correct state (signed out / My studio / My shows)",
      "Waitlist form submits successfully for both artist and fan roles",
    ],
  },
] as const;

export default function QAPage() {
  return (
    <div className="max-w-2xl mx-auto px-6 py-8">
      <h1 className="font-display text-xl font-semibold text-white mb-1">
        QA Checklist
      </h1>
      <p className="text-text-muted text-sm mb-8">
        Run through this before the Nkyinkyim test event. All items must pass.
      </p>

      {CHECKLIST.map((section) => (
        <div key={section.section} className="mb-6">
          <h2 className="text-xs font-medium text-text-muted uppercase tracking-widest mb-3">
            {section.section}
          </h2>
          <div className="bg-[#111] border border-border-subtle rounded-card overflow-hidden">
            {section.items.map((item, i) => (
              <div
                key={item}
                className={`flex items-start gap-3 px-4 py-3 text-sm ${
                  i < section.items.length - 1
                    ? "border-b border-border-subtle"
                    : ""
                }`}
              >
                <span className="w-4 h-4 rounded border border-border-subtle mt-0.5 flex-shrink-0" />
                <span className="text-text-secondary">{item}</span>
              </div>
            ))}
          </div>
        </div>
      ))}

      <div className="bg-ayo-gold/10 border border-ayo-gold/20 rounded-card p-4 mt-8">
        <p className="text-ayo-gold text-sm font-medium mb-1">
          Stage 1 success gate
        </p>
        <p className="text-text-secondary text-xs">
          All items above pass + Nkyinkyim test event runs with 50 tickets sold
          + payout received = Stage 1 complete. Stage 2 (group stream
          protection) unlocked.
        </p>
      </div>
    </div>
  );
}
