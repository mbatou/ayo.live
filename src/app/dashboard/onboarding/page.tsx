"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const STEPS = ["Profile", "Payout account"] as const;

const GHANA_BANKS = [
  { code: "GH280100", name: "Ghana Commercial Bank" },
  { code: "GH280110", name: "Ecobank Ghana" },
  { code: "GH280120", name: "Fidelity Bank Ghana" },
  { code: "GH280130", name: "Stanbic Bank Ghana" },
  { code: "GH280140", name: "Standard Chartered Ghana" },
  { code: "GH280150", name: "Zenith Bank Ghana" },
  { code: "MTN_GHANA", name: "MTN Mobile Money" },
  { code: "VODAFONE_GHANA", name: "Vodafone Cash" },
  { code: "AIRTELTIGO_GHANA", name: "AirtelTigo Money" },
];

type Form = {
  display_name: string;
  location: string;
  bank_code: string;
  bank_account_number: string;
  account_name: string;
};

export default function ArtistOnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<0 | 1>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<Form>({
    display_name: "",
    location: "",
    bank_code: "",
    bank_account_number: "",
    account_name: "",
  });

  function set<K extends keyof Form>(field: K, value: Form[K]) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleProfile(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.push("/auth/signin");
      return;
    }

    const { error: upsertErr } = await supabase
      .from("profiles")
      .update({
        display_name: form.display_name.trim() || null,
        location: form.location.trim() || null,
      })
      .eq("id", user.id);

    setLoading(false);
    if (upsertErr) {
      setError(upsertErr.message);
      return;
    }
    setStep(1);
  }

  async function handlePayout(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await fetch("/api/artist/payout-setup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Could not save payout details");
      return;
    }
    router.push("/dashboard");
  }

  function skip() {
    router.push("/dashboard");
  }

  const inputClass =
    "w-full bg-stage-black border border-border-subtle rounded-btn px-3 py-2.5 text-white placeholder:text-text-muted focus:outline-none focus:border-ayo-gold text-sm";
  const labelClass = "block text-sm text-text-secondary mb-1.5";

  return (
    <main className="bg-stage-black min-h-screen flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <span className="font-display text-2xl font-bold text-ayo-gold">
            ayọ
          </span>
          <p className="text-white font-display text-lg font-semibold mt-4">
            Set up your artist account
          </p>
        </div>

        <div className="flex gap-2 mb-8">
          {STEPS.map((s, i) => (
            <div key={s} className="flex-1">
              <div
                className={`h-1 rounded-full ${i <= step ? "bg-ayo-gold" : "bg-border-subtle"}`}
              />
              <p
                className={`text-[10px] mt-1.5 ${i === step ? "text-ayo-gold" : "text-text-muted"}`}
              >
                {s}
              </p>
            </div>
          ))}
        </div>

        {step === 0 && (
          <form
            onSubmit={handleProfile}
            className="bg-surface rounded-card p-6 space-y-4"
          >
            <div>
              <label className={labelClass}>Your artist or band name *</label>
              <input
                className={inputClass}
                value={form.display_name}
                onChange={(e) => set("display_name", e.target.value)}
                placeholder="e.g. Nkyinkyim Collective"
                required
              />
            </div>
            <div>
              <label className={labelClass}>Where are you based?</label>
              <input
                className={inputClass}
                value={form.location}
                onChange={(e) => set("location", e.target.value)}
                placeholder="e.g. Accra, GH"
              />
            </div>

            {error && (
              <p className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-btn px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={!form.display_name.trim() || loading}
              className="w-full bg-ayo-gold hover:bg-ayo-gold-hover text-stage-black font-semibold rounded-btn py-3 text-sm transition-colors disabled:opacity-50"
            >
              {loading ? "Saving…" : "Continue →"}
            </button>
          </form>
        )}

        {step === 1 && (
          <form
            onSubmit={handlePayout}
            className="bg-surface rounded-card p-6 space-y-4"
          >
            <p className="text-text-secondary text-xs">
              Where should we send your earnings? You receive 90% of every
              ticket sold.
            </p>
            <div>
              <label className={labelClass}>Bank / Mobile Money</label>
              <select
                className={`${inputClass} appearance-none`}
                value={form.bank_code}
                onChange={(e) => set("bank_code", e.target.value)}
                required
              >
                <option value="">Select</option>
                {GHANA_BANKS.map((b) => (
                  <option key={b.code} value={b.code}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Account / MoMo number</label>
              <input
                className={inputClass}
                value={form.bank_account_number}
                onChange={(e) => set("bank_account_number", e.target.value)}
                placeholder="0241234567"
                required
              />
            </div>
            <div>
              <label className={labelClass}>Account name</label>
              <input
                className={inputClass}
                value={form.account_name}
                onChange={(e) => set("account_name", e.target.value)}
                placeholder="As it appears on the account"
                required
              />
            </div>

            {error && (
              <p className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-btn px-3 py-2">
                {error}
              </p>
            )}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setStep(0);
                }}
                className="flex-1 border border-border-subtle text-text-secondary rounded-btn py-3 text-sm hover:text-white transition-colors"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-ayo-gold hover:bg-ayo-gold-hover text-stage-black font-semibold rounded-btn py-3 text-sm transition-colors disabled:opacity-50"
              >
                {loading ? "Setting up…" : "Go to studio →"}
              </button>
            </div>

            <button
              type="button"
              onClick={skip}
              className="w-full text-center text-text-muted text-xs hover:text-text-secondary transition-colors pt-1"
            >
              Skip for now
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
