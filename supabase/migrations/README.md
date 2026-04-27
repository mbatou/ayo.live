# Supabase migrations

Run these in order in the Supabase SQL editor for project `ayo-production`.

| File | Stage | Notes |
| --- | --- | --- |
| `0001_waitlist.sql` | Stage 0 / AYO-005 | Already applied to production. |
| `0002_profiles.sql` | Sprint 2 / AYO-012 | Creates `user_role` enum, `profiles` table + RLS, and the `handle_new_user` trigger that auto-creates a profile row when a user signs up via Supabase Auth. |
| `0003_events.sql` | Sprint 2 / AYO-012 | Creates `event_status` enum, `events` table + RLS. Depends on `profiles`. |
| `0004_tickets.sql` | Sprint 2 / AYO-012 | Creates `tickets` table + RLS. Depends on `events` and `profiles`. Inserts/updates are server-side only (service role). |
| `0005_sessions.sql` | Sprint 2 / AYO-012 | Creates `sessions` table + RLS. Server-side only. Depends on `tickets`. |
| `0006_payouts.sql` | Sprint 2 / AYO-012 | Creates `payout_status` enum, `payouts` table + RLS. Depends on `profiles` and `events`. |
| `0007_updated_at_triggers.sql` | Sprint 2 / AYO-012 | Adds `set_updated_at()` triggers on `profiles` and `events`. Run last. |

## Auth settings to apply manually

Supabase dashboard → Authentication:

- Enable **Email** provider
- Enable **Magic Link** (passwordless)
- Disable **Email confirmations** for now
- Site URL: `https://ayo-live.vercel.app`
- Redirect URLs:
  - `https://ayo-live.vercel.app/auth/callback`
  - `http://localhost:3000/auth/callback`

## Vercel env vars

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=    # server-only, do NOT prefix with NEXT_PUBLIC_
```
