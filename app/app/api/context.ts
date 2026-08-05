import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import type { User } from "@db/schema";
import { authenticateRequest } from "./kimi/auth";
import { createSupabaseClient } from "./lib/supabase";

export type TrpcContext = {
  req: Request;
  resHeaders: Headers;
  user?: User;
  supabaseUser?: {
    id: string;
    email?: string;
    role?: string;
  };
};

export async function createContext(
  opts: FetchCreateContextFnOptions,
): Promise<TrpcContext> {
  const ctx: TrpcContext = { req: opts.req, resHeaders: opts.resHeaders };

  // Try Supabase auth first
  try {
    const { supabase } = createSupabaseClient(opts.req);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      ctx.supabaseUser = {
        id: user.id,
        email: user.email,
        role: user.role,
      };
    }
  } catch {
    // Supabase auth not configured or failed
  }

  // Fall back to Kimi auth
  if (!ctx.supabaseUser) {
    try {
      ctx.user = await authenticateRequest(opts.req.headers);
    } catch {
      // Authentication is optional here
    }
  }

  return ctx;
}
