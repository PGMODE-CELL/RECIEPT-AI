import type { Context, MiddlewareHandler } from "hono";
import { createSupabaseClient } from "./supabase";

/**
 * Hono middleware that attaches a Supabase client (with auth session)
 * to `c.set("supabase", ...)`.
 *
 * Usage in a route:
 *   app.use("*", supabaseMiddleware);
 *   app.get("/data", (c) => {
 *     const supabase = c.get("supabase");
 *     const { data } = await supabase.from("todos").select();
 *     return c.json(data);
 *   });
 */
export const supabaseMiddleware: MiddlewareHandler = async (c, next) => {
  const { supabase } = createSupabaseClient(c.req.raw);
  c.set("supabase", supabase);
  await next();
};

/**
 * Get the Supabase client attached by supabaseMiddleware.
 */
export function getSupabase(c: Context) {
  return c.get("supabase") as ReturnType<typeof createSupabaseClient>["supabase"];
}
