import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANT: Do not run any logic between createServerClient and getUser()
  // We use a Promise.race with a 2.5 second timeout to prevent the middleware from crashing
  // if Supabase is asleep or taking too long (Vercel Edge functions have strict timeouts).
  const timeoutPromise = new Promise<{ data: { user: any } }>((resolve) =>
    setTimeout(() => resolve({ data: { user: null } }), 2500)
  );

  const { data: { user } } = await Promise.race([
    supabase.auth.getUser(),
    timeoutPromise
  ]);

  const { pathname } = request.nextUrl;

  // Routes that require authentication
  const isProtected = pathname.startsWith("/dashboard") || pathname.startsWith("/onboarding");

  // Auth pages (redirect away if already logged in)
  const isAuthRoute =
    pathname.startsWith("/signin") ||
    pathname.startsWith("/signup") ||
    pathname.startsWith("/forgot-password") ||
    pathname.startsWith("/verify-email");

  // Unauthenticated user trying to access protected route → send to sign in
  if (isProtected && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/signin";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  // Authenticated user trying to access auth pages → send to dashboard or onboarding
  if (isAuthRoute && user) {
    const url = request.nextUrl.clone();
    url.pathname = user.user_metadata?.onboarded ? "/dashboard" : "/onboarding";
    return NextResponse.redirect(url);
  }

  // Onboarding routing check
  if (user) {
    if (pathname.startsWith("/dashboard") && !user.user_metadata?.onboarded) {
      const url = request.nextUrl.clone();
      url.pathname = "/onboarding";
      return NextResponse.redirect(url);
    }
    if (pathname.startsWith("/onboarding") && user.user_metadata?.onboarded) {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     * - public files (svg, png, jpg, jpeg, gif, webp, css, js, woff, woff2, ttf, eot, ico)
     */
    "/((?!_next/static|_next/image|favicon\\.ico|sitemap\\.xml|robots\\.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|css|js|woff|woff2|ttf|eot|ico)$).*)",
  ],
};
