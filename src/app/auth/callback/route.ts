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
  //     /onboarding hop
  //   - existing users (including fans created by the old auto-profile
  //     trigger) can switch role by signing in via ?role=artist|fan
  // Magic links are bound to the recipient's email, so only the account
  // owner can trigger this. /onboarding stays as a fallback for sessions
  // that arrive without a role param.
  let role: string | null = null;
  if (pickedRole) {
    const { data: upserted, error: upsertErr } = await service
      .from("profiles")
      .upsert(
        {
          id: user.id,
          role: pickedRole,
          display_name: user.email ?? null,
        },
        { onConflict: "id" },
      )
      .select("role")
      .single();
    if (upsertErr) {
      console.error("[auth/callback] profile upsert error:", upsertErr);
      return NextResponse.redirect(`${origin}/auth/error`);
    }
    role = upserted?.role ?? null;
  } else {
    const { data: existing } = await service
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    role = existing?.role ?? null;
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
    return NextResponse.redirect(`${origin}/dashboard`);
  }

  return NextResponse.redirect(`${origin}/`);
}
