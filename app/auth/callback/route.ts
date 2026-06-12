import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/**
 * OAuth & Magic Link callback handler.
 * Supabase redirects here after email verification or OAuth sign-in.
 * Exchanges the one-time code for a persistent session cookie.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const type = searchParams.get("type");
  
  let next = searchParams.get("next") ?? "/dashboard";
  if (type === "recovery") {
    next = "/reset-password";
  }

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Something went wrong — send back to sign-in with an error flag
  return NextResponse.redirect(`${origin}/signin?error=auth_callback_failed`);
}
