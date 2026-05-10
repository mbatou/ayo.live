"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Role = "artist" | "fan";

const ROLE_INTENT_KEY = "ayo_intended_role";

function safeNext(value: string | null): string | null {
  if (!value) return null;
  if (!value.startsWith("/")) return null;
  if (value.startsWith("//") || value.startsWith("/\\")) return null;
  return value;
}

export default function OnboardingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Role | null>(null);

  // Pre-select from the role intent the sign-in form stored, so users
  // who came in via "Become an artist" don't have to pick again.
  useEffect(() => {
    try {
      const intended = localStorage.getItem(ROLE_INTENT_KEY);
      if (intended === "artist" || intended === "fan") {
        setSelected(intended);
        localStorage.removeItem(ROLE_INTENT_KEY);
      }
    } catch {
      // localStorage can throw (private mode); ignore.
    }
  }, []);

  async function handleContinue() {
    if (!selected) return;
    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/auth/signin");
        return;
      }

      // Upsert: the profile row may not exist yet (post-0009 signups
      // don't auto-create one), and may exist for users who came via
      // the old trigger.
      const { error: upsertErr } = await supabase
        .from("profiles")
        .upsert(
          {
            id: user.id,
            role: selected,
            display_name: user.email ?? null,
          },
          { onConflict: "id" },
        );

      if (upsertErr) {
        console.error("[onboarding] upsert error:", upsertErr);
        setError(upsertErr.message);
        setLoading(false);
        return;
      }

      const next = safeNext(
        new URLSearchParams(window.location.search).get("next"),
      );
      const target = next ?? (selected === "artist" ? "/dashboard" : "/fan");
      router.push(target);
    } catch (err) {
      console.error("[onboarding] failed:", err);
      setError(
        err instanceof Error ? err.message : "Could not save your choice",
      );
      setLoading(false);
    }
  }

  return (
    <main className="bg-stage-black min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <span className="font-display text-2xl font-bold text-ayo-gold">
            ayọ
          </span>
          <p className="text-white font-display text-xl font-semibold mt-4">
            Welcome. How will you use Ayo?
          </p>
          <p className="text-text-secondary text-sm mt-2">
            You can always change this later.
          </p>
        </div>

        <div className="space-y-3 mb-6">
          <button
            type="button"
            onClick={() => setSelected("artist")}
            className={
              "w-full text-left rounded-card border p-5 transition-all " +
              (selected === "artist"
                ? "border-ayo-gold bg-ayo-gold/5"
                : "border-border-subtle bg-surface hover:border-ayo-gold/40")
            }
          >
            <div className="flex items-start gap-4">
              <span className="text-2xl">🎤</span>
              <div className="flex-1">
                <p className="text-white font-medium text-sm">
                  I&apos;m an artist
                </p>
                <p className="text-text-muted text-xs mt-0.5">
                  I want to perform live, sell tickets, and get paid directly.
                </p>
              </div>
              {selected === "artist" && (
                <span className="text-ayo-gold text-lg">✓</span>
              )}
            </div>
          </button>

          <button
            type="button"
            onClick={() => setSelected("fan")}
            className={
              "w-full text-left rounded-card border p-5 transition-all " +
              (selected === "fan"
                ? "border-ayo-gold bg-ayo-gold/5"
                : "border-border-subtle bg-surface hover:border-ayo-gold/40")
            }
          >
            <div className="flex items-start gap-4">
              <span className="text-2xl">🎟</span>
              <div className="flex-1">
                <p className="text-white font-medium text-sm">I&apos;m a fan</p>
                <p className="text-text-muted text-xs mt-0.5">
                  I want to discover shows, buy tickets, and watch live.
                </p>
              </div>
              {selected === "fan" && (
                <span className="text-ayo-gold text-lg">✓</span>
              )}
            </div>
          </button>
        </div>

        {error && (
          <p className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-btn px-3 py-2 mb-4">
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={handleContinue}
          disabled={!selected || loading}
          className="w-full bg-ayo-gold hover:bg-ayo-gold-hover text-stage-black font-semibold rounded-btn py-3 text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {loading ? "Setting up your account…" : "Continue"}
        </button>
      </div>
    </main>
  );
}
