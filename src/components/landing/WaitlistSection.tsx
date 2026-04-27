"use client";

import { useState, FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import type { WaitlistRole } from "@/types";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type FormState = {
  email: string;
  status: "idle" | "submitting" | "success" | "error";
  error: string | null;
};

const initialState: FormState = {
  email: "",
  status: "idle",
  error: null,
};

function useWaitlist(role: WaitlistRole) {
  const [state, setState] = useState<FormState>(initialState);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const email = state.email.trim();
    if (!EMAIL_RE.test(email)) {
      setState((s) => ({ ...s, status: "error", error: "Enter a valid email" }));
      return;
    }
    setState((s) => ({ ...s, status: "submitting", error: null }));
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("waitlist")
        .insert({ email, role });
      if (error) throw error;
      setState({ email: "", status: "success", error: null });
    } catch (err) {
      setState((s) => ({
        ...s,
        status: "error",
        error: err instanceof Error ? err.message : "Something went wrong",
      }));
    }
  }

  return {
    state,
    setEmail: (email: string) =>
      setState((s) => ({ ...s, email, status: "idle", error: null })),
    handleSubmit,
  };
}

function ArtistForm() {
  const { state, setEmail, handleSubmit } = useWaitlist("artist");
  const isSuccess = state.status === "success";
  const isSubmitting = state.status === "submitting";

  return (
    <div
      id="artist-waitlist"
      className="rounded-card border border-border-subtle bg-surface p-6 md:p-8"
    >
      <h3 className="font-display font-semibold text-text-primary text-2xl">
        Be first to perform on Ayo
      </h3>
      <p className="text-text-secondary text-sm mt-2">
        Apply for founding artist status — 0% commission for your first 6 months.
      </p>
      {isSuccess ? (
        <p className="mt-6 text-protected text-sm font-medium">
          You&apos;re on the list ✓
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="mt-6 space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="email"
              required
              autoComplete="email"
              placeholder="you@stage.com"
              value={state.email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1 bg-stage-black border border-border-subtle text-text-primary placeholder:text-text-muted text-sm rounded-btn px-4 py-3 focus:outline-none focus:border-ayo-gold transition-colors"
            />
            <button
              type="submit"
              disabled={isSubmitting}
              className="text-sm font-semibold text-stage-black bg-ayo-gold hover:bg-ayo-gold-hover disabled:opacity-60 px-5 py-3 rounded-btn transition-colors"
            >
              {isSubmitting ? "Submitting..." : "Apply to perform"}
            </button>
          </div>
          {state.error && (
            <p className="text-live-red text-xs">{state.error}</p>
          )}
        </form>
      )}
    </div>
  );
}

function FanForm() {
  const { state, setEmail, handleSubmit } = useWaitlist("fan");
  const isSuccess = state.status === "success";
  const isSubmitting = state.status === "submitting";

  return (
    <div className="rounded-card border border-border-subtle bg-surface p-6 md:p-8">
      <h3 className="font-display font-semibold text-text-primary text-2xl">
        Get notified for upcoming shows
      </h3>
      <p className="text-text-secondary text-sm mt-2">
        Be the first to know when artists you love go live.
      </p>
      {isSuccess ? (
        <p className="mt-6 text-protected text-sm font-medium">
          You&apos;re on the list ✓
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="mt-6 space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="email"
              required
              autoComplete="email"
              placeholder="you@inbox.com"
              value={state.email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1 bg-stage-black border border-border-subtle text-text-primary placeholder:text-text-muted text-sm rounded-btn px-4 py-3 focus:outline-none focus:border-ayo-gold transition-colors"
            />
            <button
              type="submit"
              disabled={isSubmitting}
              className="text-sm font-semibold text-text-primary border border-text-primary hover:bg-text-primary hover:text-stage-black disabled:opacity-60 px-5 py-3 rounded-btn transition-colors"
            >
              {isSubmitting ? "Submitting..." : "Notify me"}
            </button>
          </div>
          {state.error && (
            <p className="text-live-red text-xs">{state.error}</p>
          )}
        </form>
      )}
    </div>
  );
}

export function WaitlistSection() {
  return (
    <section
      id="artists"
      className="border-b border-border-subtle"
    >
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-16 md:py-20 grid grid-cols-1 md:grid-cols-2 gap-6">
        <ArtistForm />
        <FanForm />
      </div>
    </section>
  );
}
