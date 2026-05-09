"use client";

import { useState, useEffect, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";

type Role = "artist" | "fan";

function safeNext(value: string | null): string | null {
  if (!value) return null;
  if (!value.startsWith("/")) return null;
  if (value.startsWith("//") || value.startsWith("/\\")) return null;
  return value;
}

export default function SignInPage() {
  const [role, setRole] = useState<Role | null>(null);
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pre-select the role from `?role=` so deep links from
  // "Become an artist" / "Get ticket" pin the right card.
  useEffect(() => {
    const param = new URLSearchParams(window.location.search).get("role");
    if (param === "artist" || param === "fan") {
      setRole(param);
    }
  }, []);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!role) {
      setError("Pick a role first.");
      return;
    }
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
      const next = safeNext(
        new URLSearchParams(window.location.search).get("next"),
      );

      const callbackParams = new URLSearchParams();
      callbackParams.set("role", role);
      if (next) callbackParams.set("next", next);
      const callbackUrl = `${window.location.origin}/auth/callback?${callbackParams.toString()}`;

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
    <main className="bg-stage-black min-h-screen flex items-center justify-center px-4 py-10">
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
              <span className="text-white">{email}</span>.
            </p>
            <p className="text-text-muted text-xs mt-3">
              You&apos;ll come back as{" "}
              <span className="text-text-secondary">
                {role === "artist" ? "an artist" : "a fan"}
              </span>
              .
            </p>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="bg-surface rounded-card p-6 space-y-5"
          >
            <div>
              <p className="text-sm text-text-secondary mb-2">
                I&apos;m signing in as
              </p>
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => setRole("artist")}
                  className={
                    "w-full text-left rounded-btn border px-4 py-3 transition-all " +
                    (role === "artist"
                      ? "border-ayo-gold bg-ayo-gold/5"
                      : "border-border-subtle bg-stage-black hover:border-ayo-gold/40")
                  }
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg">🎤</span>
                    <div className="flex-1">
                      <p className="text-white text-sm font-medium">Artist</p>
                      <p className="text-text-muted text-xs">
                        Perform live, sell tickets, get paid.
                      </p>
                    </div>
                    {role === "artist" && (
                      <span className="text-ayo-gold">✓</span>
                    )}
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setRole("fan")}
                  className={
                    "w-full text-left rounded-btn border px-4 py-3 transition-all " +
                    (role === "fan"
                      ? "border-ayo-gold bg-ayo-gold/5"
                      : "border-border-subtle bg-stage-black hover:border-ayo-gold/40")
                  }
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg">🎟</span>
                    <div className="flex-1">
                      <p className="text-white text-sm font-medium">Fan</p>
                      <p className="text-text-muted text-xs">
                        Discover shows, buy tickets, watch live.
                      </p>
                    </div>
                    {role === "fan" && (
                      <span className="text-ayo-gold">✓</span>
                    )}
                  </div>
                </button>
              </div>
            </div>

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
              disabled={loading || !role}
              className="w-full bg-ayo-gold hover:bg-ayo-gold-hover text-stage-black font-semibold rounded-btn py-2.5 text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
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
