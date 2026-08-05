import type { Context } from "hono";
import { createSupabaseClient } from "../lib/supabase";

/**
 * Hono handler for Supabase OAuth callback.
 * Exchange the auth code for a session and redirect to the frontend.
 *
 * Route: GET /auth/callback?code=...&state=...
 */
export async function supabaseAuthCallback(c: Context) {
  const code = c.req.query("code");
  const next = c.req.query("next") ?? "/";

  if (!code) {
    return c.redirect("/auth/error?message=No+code+provided", 302);
  }

  try {
    const { supabase, supabaseResponse } = createSupabaseClient(c.req.raw);
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error("[Supabase Auth] Exchange failed:", error.message);
      return c.redirect(`/auth/error?message=${encodeURIComponent(error.message)}`, 302);
    }

    // Forward any set-cookie headers from Supabase to the client
    const headers = new Headers(supabaseResponse.headers);
    headers.set("location", next);

    return new Response(null, { status: 302, headers });
  } catch (err) {
    console.error("[Supabase Auth] Callback error:", err);
    return c.redirect("/auth/error?message=Authentication+failed", 302);
  }
}

/**
 * Hono handler for signing out via Supabase.
 * Route: POST /auth/signout
 */
export async function supabaseSignOut(c: Context) {
  try {
    const { supabase, supabaseResponse } = createSupabaseClient(c.req.raw);
    await supabase.auth.signOut();

    const headers = new Headers(supabaseResponse.headers);
    headers.set("location", "/");

    return new Response(null, { status: 302, headers });
  } catch (err) {
    console.error("[Supabase Auth] Signout error:", err);
    return c.redirect("/", 302);
  }
}
