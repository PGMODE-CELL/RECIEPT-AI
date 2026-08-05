import type { Context, MiddlewareHandler } from "hono";
import { createSupabaseClient } from "./supabase";

/**
 * Hono middleware that requires a valid Supabase session.
 * Returns 401 if no session is found.
 *
 * Usage:
 *   app.use("/protected/*", supabaseRequireAuth);
 */
export const supabaseRequireAuth: MiddlewareHandler = async (c, next) => {
  const { supabase } = createSupabaseClient(c.req.raw);
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return c.json(
      { error: "Unauthorized", message: "Authentication required" },
      401,
    );
  }

  c.set("supabaseUser", user);
  await next();
};

/**
 * Hono middleware that optionally checks Supabase session.
 * Attaches user if session exists, but doesn't block.
 *
 * Usage:
 *   app.use("*", supabaseOptionalAuth);
 */
export const supabaseOptionalAuth: MiddlewareHandler = async (c, next) => {
  const { supabase } = createSupabaseClient(c.req.raw);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    c.set("supabaseUser", user);
  }

  await next();
};

/**
 * Hono middleware that requires a specific Supabase role.
 *
 * Usage:
 *   app.use("/admin/*", supabaseRequireRole("admin"));
 */
export function supabaseRequireRole(role: string): MiddlewareHandler {
  return async (c, next) => {
    const { supabase } = createSupabaseClient(c.req.raw);
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return c.json(
        { error: "Unauthorized", message: "Authentication required" },
        401,
      );
    }

    const userRole = user.user_metadata?.role ?? user.app_metadata?.role;
    if (userRole !== role) {
      return c.json(
        { error: "Forbidden", message: "Insufficient permissions" },
        403,
      );
    }

    c.set("supabaseUser", user);
    await next();
  };
}

/**
 * Get the Supabase user attached by auth middleware.
 */
export function getSupabaseUser(c: Context) {
  return c.get("supabaseUser") as {
    id: string;
    email?: string;
    role?: string;
    user_metadata?: Record<string, any>;
    app_metadata?: Record<string, any>;
  } | undefined;
}
