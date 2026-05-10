import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

type Role = "artist" | "fan";

function safeNext(value: string | null): string | null {
  if (!value) return null;
  if (!value.startsWith("/")) return null;
  if (value.startsWith("//") || value.startsWith("/\\")) return null;
  return value;
}

function parseRole(value: string | null): Role | null {
  if (value === "artist" || value === "fan") return value;
  return null;
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeNext(searchParams.get("next"));
  const pickedRole = parseRole(searchParams.get("role"));

  if (!code) {
    return NextResponse.redirect(`${origin}/auth/error`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    console.error("[auth/callback] exchange error:", error.message);
    return NextResponse.redirect(`${origin}/auth/error`);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(`${origin}/auth/error`);
  }

  const service = createServiceClient();

  // Sign-in carries the role the user just picked. Upsert it so:
  //   - first-time users get a profile created without a separate
  //     /onboarding hop for the role pick
  //   - existing users (including fans created by the old auto-profile
  //     trigger) can switch role by signing in via ?role=artist|fan
  // We deliberately do NOT seed display_name from email — keeping it
  // null lets /dashboard/onboarding detect new artists and walk them
  // through the artist-specific multistep.
  let role: string | null = null;
  let displayName: string | null = null;
  if (pickedRole) {
    const { data: upserted, error: upsertErr } = await service
      .from("profiles")
      .upsert(
        {
          id: user.id,
          role: pickedRole,
        },
        { onConflict: "id" },
      )
      .select("role, display_name")
      .single();
    if (upsertErr) {
      console.error("[auth/callback] profile upsert error:", upsertErr);
      return NextResponse.redirect(`${origin}/auth/error`);
    }
    role = upserted?.role ?? null;
    displayName = upserted?.display_name ?? null;
  } else {
    const { data: existing } = await service
      .from("profiles")
      .select("role, display_name")
      .eq("id", user.id)
      .single();
    role = existing?.role ?? null;
    displayName = existing?.display_name ?? null;
  }

  if (!role) {
    const target = next
      ? `/onboarding?next=${encodeURIComponent(next)}`
      : "/onboarding";
    return NextResponse.redirect(`${origin}${target}`);
  }

  if (next) {
    return NextResponse.redirect(`${origin}${next}`);
  }

  if (role === "artist") {
    // Artists without a display_name haven't completed the onboarding
    // wizard yet; route them through it before dropping them in /dashboard.
    if (!displayName) {
      return NextResponse.redirect(`${origin}/dashboard/onboarding`);
    }
    return NextResponse.redirect(`${origin}/dashboard`);
  }
  if (role === "fan") {
    return NextResponse.redirect(`${origin}/fan`);
  }

  return NextResponse.redirect(`${origin}/`);
}
