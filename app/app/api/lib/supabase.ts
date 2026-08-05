import { createServerClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;

/**
 * Create a Supabase client for server-side use (Hono routes).
 * Reads the session from the request cookies and writes any refreshed
 * tokens back through the `setAll` callback.
 */
export function createSupabaseClient(request: Request) {
  let supabaseResponse = new Response(null, {
    headers: request.headers,
  });

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        const cookieHeader = request.headers.get("cookie") || "";
        return parseCookies(cookieHeader);
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          const cookieStr = serializeCookie(name, value, options);
          supabaseResponse.headers.append("set-cookie", cookieStr);
        });
      },
    },
  });

  return { supabase, supabaseResponse };
}

/**
 * Create a Supabase client using the service-role / secret key for
 * admin-level operations (bypasses RLS). Only use on the server.
 */
export function createSupabaseAdminClient() {
  const { createClient } = require("@supabase/supabase-js");
  return createClient(supabaseUrl, supabaseSecretKey);
}

function parseCookies(header: string) {
  return header
    .split(";")
    .map((c) => c.trim())
    .filter(Boolean)
    .map((c) => {
      const [name, ...rest] = c.split("=");
      return { name: name.trim(), value: rest.join("=").trim() };
    });
}

function serializeCookie(
  name: string,
  value: string,
  options?: Record<string, unknown>,
) {
  let str = `${name}=${encodeURIComponent(value)}`;
  if (options?.maxAge) str += `; Max-Age=${options.maxAge}`;
  if (options?.path) str += `; Path=${options.path}`;
  if (options?.domain) str += `; Domain=${options.domain}`;
  if (options?.httpOnly) str += "; HttpOnly";
  if (options?.secure) str += "; Secure";
  if (options?.sameSite) str += `; SameSite=${options.sameSite}`;
  return str;
}
