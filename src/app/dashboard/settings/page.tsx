"use client";

import { useState, useEffect, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";

type ProfileRow = {
  display_name: string | null;
  location: string | null;
  paystack_id: string | null;
};

type FormState = {
  display_name: string;
  location: string;
  bank_code: string;
  bank_account_number: string;
  account_name: string;
};

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

export default function SettingsPage() {
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [form, setForm] = useState<FormState>({
    display_name: "",
    location: "",
    bank_code: "",
    bank_account_number: "",
    account_name: "",
  });

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data }) => {
      if (cancelled || !data.user) return;
      const { data: row } = await supabase
        .from("profiles")
        .select("display_name, location, paystack_id")
        .eq("id", data.user.id)
        .single();
      if (cancelled || !row) return;
      setProfile(row as ProfileRow);
      setForm((f) => ({
        ...f,
        display_name: row.display_name ?? "",
        location: row.location ?? "",
      }));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSave(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setSaved(false);
    setError(null);

    const res = await fetch("/api/artist/payout-setup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Could not save settings");
      return;
    }
    setSaved(true);
    if (data.paystackRecipientCreated) {
      // Reflect the new connection state without a reload.
      setProfile((p) =>
        p ? { ...p, paystack_id: data.recipientCode ?? "set" } : p,
      );
      setForm((f) => ({
        ...f,
        bank_code: "",
        bank_account_number: "",
        account_name: "",
      }));
    }
  }

  const inputClass =
    "w-full bg-stage-black border border-border-subtle rounded-btn px-3 py-2.5 text-white placeholder:text-text-muted focus:outline-none focus:border-ayo-gold text-sm";
  const labelClass = "block text-sm text-text-secondary mb-1.5";

  const payoutConnected = !!profile?.paystack_id;

  return (
    <div className="max-w-lg mx-auto px-6 py-8">
      <h1 className="font-display text-xl font-semibold text-white mb-1">
        Settings
      </h1>
      <p className="text-text-muted text-sm mb-8">
        Manage your profile and payout account.
      </p>

      <form onSubmit={handleSave} className="space-y-6">
        <div className="bg-[#111] border border-border-subtle rounded-card p-5 space-y-4">
          <h2 className="text-sm font-medium text-white">Profile</h2>
          <div>
            <label className={labelClass}>Display name</label>
            <input
              className={inputClass}
              value={form.display_name}
              onChange={(e) =>
                setForm((f) => ({ ...f, display_name: e.target.value }))
              }
              placeholder="Nkyinkyim Collective"
            />
          </div>
          <div>
            <label className={labelClass}>Location</label>
            <input
              className={inputClass}
              value={form.location}
              onChange={(e) =>
                setForm((f) => ({ ...f, location: e.target.value }))
              }
              placeholder="Accra, GH"
            />
          </div>
        </div>

        <div className="bg-[#111] border border-border-subtle rounded-card p-5 space-y-4">
          <div>
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-medium text-white">Payout account</h2>
              {payoutConnected && (
                <span className="text-[10px] uppercase tracking-[1px] bg-protected/10 text-protected border border-protected/20 rounded px-1.5 py-0.5">
                  Connected
                </span>
              )}
            </div>
            <p className="text-xs text-text-muted mt-0.5">
              Where your earnings are sent after each show. 90% of every ticket
              goes here.
              {payoutConnected && (
                <>
                  {" "}
                  Already connected — fill these to replace it.
                </>
              )}
            </p>
          </div>
          <div>
            <label className={labelClass}>Bank / Mobile Money</label>
            <select
              className={`${inputClass} appearance-none`}
              value={form.bank_code}
              onChange={(e) =>
                setForm((f) => ({ ...f, bank_code: e.target.value }))
              }
            >
              <option value="">Select bank or Mobile Money</option>
              {GHANA_BANKS.map((b) => (
                <option key={b.code} value={b.code}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>
              Account / Mobile Money number
            </label>
            <input
              className={inputClass}
              value={form.bank_account_number}
              onChange={(e) =>
                setForm((f) => ({ ...f, bank_account_number: e.target.value }))
              }
              placeholder="0241234567"
            />
          </div>
          <div>
            <label className={labelClass}>Account name</label>
            <input
              className={inputClass}
              value={form.account_name}
              onChange={(e) =>
                setForm((f) => ({ ...f, account_name: e.target.value }))
              }
              placeholder="As it appears on the account"
            />
          </div>
        </div>

        {error && (
          <p className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-btn px-3 py-2">
            {error}
          </p>
        )}
        {saved && !error && (
          <p className="text-protected text-sm bg-protected/10 border border-protected/20 rounded-btn px-3 py-2">
            ✓ Settings saved
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-ayo-gold hover:bg-ayo-gold-hover text-stage-black font-semibold rounded-btn py-3 text-sm transition-colors disabled:opacity-50"
        >
          {loading ? "Saving…" : "Save settings"}
        </button>
      </form>
    </div>
  );
}
