import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/types/database";

export async function updateSession(request: NextRequest) {
  // Supabase email-confirmation links land on whatever Site URL the
  // project has configured, which isn't always /auth/callback (preview
  // deployments, mismatched redirect-URL allow-list, etc). Catch any
  // `?code=` on any path and forward it to /auth/callback so the
  // exchange + role-based routing runs server-side.
  const incomingCode = request.nextUrl.searchParams.get("code");
  if (incomingCode && request.nextUrl.pathname !== "/auth/callback") {
    const forwardUrl = request.nextUrl.clone();
    forwardUrl.pathname = "/auth/callback";
    forwardUrl.search = "";
    forwardUrl.searchParams.set("code", incomingCode);
    const incomingRole = request.nextUrl.searchParams.get("role");
    if (incomingRole === "artist" || incomingRole === "fan") {
      forwardUrl.searchParams.set("role", incomingRole);
    }
    // Preserve the original path as `next` so the user lands where the
    // email link pointed (skip "/" since callback's role-default already
    // sends artists to /dashboard and fans to /).
    if (request.nextUrl.pathname !== "/") {
      forwardUrl.searchParams.set("next", request.nextUrl.pathname);
    }
    return NextResponse.redirect(forwardUrl);
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Already-authed users hitting the sign-in page should be sent on.
  if (user && request.nextUrl.pathname === "/auth/signin") {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
