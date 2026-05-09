import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

// Only honour `next` if it's a same-origin relative path. Reject `//evil.com`,
// fully-qualified URLs, and `javascript:` schemes.
function safeNext(value: string | null): string | null {
  if (!value) return null;
  if (!value.startsWith("/")) return null;
  if (value.startsWith("//") || value.startsWith("/\\")) return null;
  return value;
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeNext(searchParams.get("next"));

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

  // Service-role read so RLS changes can't ever lock us out of the routing
  // decision. Public SELECT on profiles would also work today.
  const service = createServiceClient();
  const { data: profile } = await service
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  // First-time user — pick a role before going anywhere else. Forward `next`
  // so we can drop them on their original destination after onboarding.
  if (!profile) {
    const target = next
      ? `/onboarding?next=${encodeURIComponent(next)}`
      : "/onboarding";
    return NextResponse.redirect(`${origin}${target}`);
  }

  // Returning user with a deep-link target (e.g. fan coming back to an event).
  if (next) {
    return NextResponse.redirect(`${origin}${next}`);
  }

  if (profile.role === "artist") {
    return NextResponse.redirect(`${origin}/dashboard`);
  }

  return NextResponse.redirect(`${origin}/`);
}
