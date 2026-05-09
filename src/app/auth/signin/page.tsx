"use client";

import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // TODO(remove after auth confirmed working in prod): diagnostic for the
    // "Failed to fetch" hotfix. Confirms env vars are reaching the browser.
    if (typeof window !== "undefined") {
      console.log(
        "[Ayo] Supabase URL:",
        process.env.NEXT_PUBLIC_SUPABASE_URL ? "SET" : "MISSING",
      );
      console.log(
        "[Ayo] Supabase Anon Key:",
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "SET" : "MISSING",
      );
    }

    try {
      const supabase = createClient();
      const next = new URLSearchParams(window.location.search).get("next");
      const callbackUrl = next
        ? `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`
        : `${window.location.origin}/auth/callback`;

      const { error: signInError } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: callbackUrl },
      });

      if (signInError) {
        setError(signInError.message);
        return;
      }
      setSent(true);
    } catch (err) {
      console.error("[Ayo] sign-in failed:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Could not reach the sign-in service. Check your connection and try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="bg-stage-black min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <span className="font-display text-2xl font-bold text-ayo-gold">
            ayọ
          </span>
          <p className="text-text-secondary mt-2 text-sm">Joy, Live.</p>
        </div>

        {sent ? (
          <div className="bg-surface rounded-card p-6 text-center">
            <p className="text-white font-medium mb-1">Check your email ✓</p>
            <p className="text-text-secondary text-sm">
              We sent a magic link to{" "}
              <span className="text-white">{email}</span>
            </p>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="bg-surface rounded-card p-6 space-y-4"
          >
            <div>
              <label className="block text-sm text-text-secondary mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                autoComplete="email"
                className="w-full bg-stage-black border border-border-subtle rounded-btn px-3 py-2.5 text-white placeholder:text-text-muted focus:outline-none focus:border-ayo-gold text-sm"
              />
            </div>

            {error && (
              <p className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-btn px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-ayo-gold hover:bg-ayo-gold-hover text-stage-black font-semibold rounded-btn py-2.5 text-sm transition-colors disabled:opacity-50"
            >
              {loading ? "Sending…" : "Send magic link"}
            </button>
            <p className="text-center text-text-muted text-xs">
              No password needed. We email you a sign-in link.
            </p>
          </form>
        )}
      </div>
    </main>
  );
}
