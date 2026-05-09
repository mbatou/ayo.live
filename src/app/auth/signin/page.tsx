"use client";

import { useState, useEffect, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Role = "artist" | "fan";
type Mode = "signin" | "signup";

const ROLE_INTENT_KEY = "ayo_intended_role";

function safeNext(value: string | null): string | null {
  if (!value) return null;
  if (!value.startsWith("/")) return null;
  if (value.startsWith("//") || value.startsWith("/\\")) return null;
  return value;
}

function destinationFor(role: string | null, next: string | null): string {
  if (next) return next;
  if (role === "artist") return "/dashboard";
  if (role === "fan") return "/fan";
  return "/";
}

export default function SignInPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("signup");
  const [role, setRole] = useState<Role | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailSent, setEmailSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pre-select role + mode from query so deep-link CTAs work, and
  // remember the role intent across the auth bounce in case the user
  // ends up on /onboarding (no profile yet, role param dropped, etc).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roleParam = params.get("role");
    if (roleParam === "artist" || roleParam === "fan") {
      setRole(roleParam);
      try {
        localStorage.setItem(ROLE_INTENT_KEY, roleParam);
      } catch {
        // localStorage can throw (private mode, quota); not critical.
      }
    }
    const modeParam = params.get("mode");
    if (modeParam === "signin" || modeParam === "signup") setMode(modeParam);
  }, []);

  // Already-signed-in users shouldn't see the form. Send them home.
  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;
    supabase.auth.getUser().then(async ({ data }) => {
      if (cancelled || !data.user) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .single();
      if (cancelled) return;
      if (profile?.role === "artist") router.replace("/dashboard");
      else if (profile?.role === "fan") router.replace("/fan");
      else router.replace("/onboarding");
    });
    return () => {
      cancelled = true;
    };
  }, [router]);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (mode === "signup" && !role) {
      setError("Pick a role first.");
      return;
    }

    setLoading(true);

    // TODO(remove after auth confirmed working in prod): env-var diagnostic.
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

      if (mode === "signup") {
        const signupRole: Role = role!; // checked above
        const callbackParams = new URLSearchParams();
        callbackParams.set("role", signupRole);
        if (next) callbackParams.set("next", next);
        const callbackUrl = `${window.location.origin}/auth/callback?${callbackParams.toString()}`;

        const { data, error: signUpErr } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { role: signupRole },
            emailRedirectTo: callbackUrl,
          },
        });

        if (signUpErr) {
          setError(signUpErr.message);
          return;
        }

        // No session => Supabase has email confirmation enabled. Show a
        // "check your email" panel; the link routes through /auth/callback
        // which will upsert the role and route from there.
        if (!data.session || !data.user) {
          setEmailSent(true);
          return;
        }

        // Auto-confirmed: write the profile ourselves and route. The
        // INSERT/UPDATE policies from migration 0009 cover this.
        const { error: upsertErr } = await supabase
          .from("profiles")
          .upsert(
            { id: data.user.id, role: signupRole, display_name: email },
            { onConflict: "id" },
          );
        if (upsertErr) {
          console.error("[Ayo] profile upsert failed:", upsertErr);
          setError(
            "Account created but profile setup failed. Try signing in.",
          );
          return;
        }
        // Full reload so server components pick up the new auth cookie.
        window.location.href = destinationFor(signupRole, next);
        return;
      }

      // Sign in
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInErr) {
        setError(signInErr.message);
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setError("Signed in but no session — try again.");
        return;
      }

      // If the user picked a role on the sign-in form, treat that as a
      // role-switch request and upsert it. Lets the existing test account
      // (stuck on role='fan' from the old auto-profile trigger) flip to
      // artist by signing in via /auth/signin?role=artist.
      let finalRole: string | null = null;
      const pickedRole: Role | null = role;
      if (pickedRole) {
        const { data: upserted, error: upsertErr } = await supabase
          .from("profiles")
          .upsert(
            { id: user.id, role: pickedRole, display_name: email },
            { onConflict: "id" },
          )
          .select("role")
          .single();
        if (upsertErr) {
          console.error("[Ayo] role update failed:", upsertErr);
        } else {
          finalRole = upserted?.role ?? null;
        }
      } else {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();
        finalRole = profile?.role ?? null;
      }

      window.location.href = destinationFor(finalRole, next);
    } catch (err) {
      console.error("[Ayo] auth failed:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Could not reach the auth service. Check your connection and try again.",
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

        {emailSent ? (
          <div className="bg-surface rounded-card p-6 text-center">
            <p className="text-white font-medium mb-1">
              Check your email ✓
            </p>
            <p className="text-text-secondary text-sm">
              We sent a confirmation link to{" "}
              <span className="text-white">{email}</span>.
            </p>
            <p className="text-text-muted text-xs mt-3">
              Click it to finish creating your{" "}
              <span className="text-text-secondary">
                {role === "artist" ? "artist" : "fan"}
              </span>{" "}
              account.
            </p>
            <button
              type="button"
              onClick={() => {
                setEmailSent(false);
                setMode("signin");
              }}
              className="mt-4 text-text-muted text-xs underline hover:text-text-secondary"
            >
              Already confirmed? Sign in instead
            </button>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="bg-surface rounded-card p-6 space-y-5"
          >
            <div className="flex bg-stage-black border border-border-subtle rounded-btn p-1">
              <button
                type="button"
                onClick={() => setMode("signin")}
                className={
                  "flex-1 text-sm font-medium py-1.5 rounded transition-colors " +
                  (mode === "signin"
                    ? "bg-ayo-gold text-stage-black"
                    : "text-text-secondary hover:text-white")
                }
              >
                Sign in
              </button>
              <button
                type="button"
                onClick={() => setMode("signup")}
                className={
                  "flex-1 text-sm font-medium py-1.5 rounded transition-colors " +
                  (mode === "signup"
                    ? "bg-ayo-gold text-stage-black"
                    : "text-text-secondary hover:text-white")
                }
              >
                Sign up
              </button>
            </div>

            <div>
              <p className="text-sm text-text-secondary mb-2">
                {mode === "signup"
                  ? "I'm signing up as"
                  : "Continue as (optional)"}
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
              {mode === "signin" && role && (
                <button
                  type="button"
                  onClick={() => setRole(null)}
                  className="mt-2 text-text-muted text-xs underline hover:text-text-secondary"
                >
                  Clear role (sign in without changing it)
                </button>
              )}
            </div>

            <div className="space-y-3">
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
              <div>
                <label className="block text-sm text-text-secondary mb-1.5">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={
                    mode === "signup" ? "At least 6 characters" : "Your password"
                  }
                  required
                  minLength={6}
                  autoComplete={
                    mode === "signup" ? "new-password" : "current-password"
                  }
                  className="w-full bg-stage-black border border-border-subtle rounded-btn px-3 py-2.5 text-white placeholder:text-text-muted focus:outline-none focus:border-ayo-gold text-sm"
                />
              </div>
            </div>

            {error && (
              <p className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-btn px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || (mode === "signup" && !role)}
              className="w-full bg-ayo-gold hover:bg-ayo-gold-hover text-stage-black font-semibold rounded-btn py-2.5 text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading
                ? mode === "signup"
                  ? "Creating account…"
                  : "Signing in…"
                : mode === "signup"
                  ? "Create account"
                  : "Sign in"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
