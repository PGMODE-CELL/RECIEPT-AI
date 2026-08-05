import { ErrorMessages } from "@contracts/constants";
import { initTRPC, TRPCError } from "@trpc/server";
import { ZodError } from "zod";
import superjson from "superjson";
import type { TrpcContext } from "./context";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError: error.code === "BAD_REQUEST" && error.cause instanceof ZodError
          ? error.cause.issues
          : null,
      },
    };
  },
});

export const createRouter = t.router;
export const publicQuery = t.procedure;

const requireAuth = t.middleware(async (opts) => {
  const { ctx, next } = opts;

  if (!ctx.user && !ctx.supabaseUser) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: ErrorMessages.unauthenticated,
    });
  }

  return next({ ctx: { ...ctx, user: ctx.user } });
});

const requireSupabaseAuth = t.middleware(async (opts) => {
  const { ctx, next } = opts;

  if (!ctx.supabaseUser) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Supabase authentication required",
    });
  }

  return next({ ctx });
});

function requireRole(role: string) {
  return t.middleware(async (opts) => {
    const { ctx, next } = opts;

    if (!ctx.user || ctx.user.role !== role) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: ErrorMessages.insufficientRole,
      });
    }

    return next({ ctx: { ...ctx, user: ctx.user } });
  });
}

export const authedQuery = t.procedure.use(requireAuth);
export const authedMutation = t.procedure.use(requireAuth);
export const adminQuery = authedQuery.use(requireRole("admin"));
export const adminMutation = authedMutation.use(requireRole("admin"));

// Supabase-specific middleware
export const supabaseQuery = t.procedure.use(requireSupabaseAuth);
export const supabaseMutation = t.procedure.use(requireSupabaseAuth);
