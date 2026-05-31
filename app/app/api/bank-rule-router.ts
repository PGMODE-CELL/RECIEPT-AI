import { z } from "zod";
import { eq, and, desc } from "drizzle-orm";
import { createRouter, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { bankRules } from "@db/schema";

export const bankRuleRouter = createRouter({
  list: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    return db.select().from(bankRules).where(eq(bankRules.userId, ctx.user.id)).orderBy(desc(bankRules.createdAt));
  }),

  getById: authedQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = getDb();
      const rows = await db.select().from(bankRules)
        .where(and(eq(bankRules.id, input.id), eq(bankRules.userId, ctx.user.id)));
      return rows[0] ?? null;
    }),

  create: authedQuery
    .input(z.object({
      name: z.string().min(1),
      matchType: z.enum(["contains", "exact", "regex", "amount"]),
      matchValue: z.string().min(1),
      actionType: z.enum(["categorize", "assign_account", "skip"]),
      actionValue: z.string().optional(),
      accountId: z.number().optional(),
      priority: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const result = await db.insert(bankRules).values({ ...input, userId: ctx.user.id });
      return { id: Number(result[0].insertId) };
    }),

  update: authedQuery
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      matchType: z.enum(["contains", "exact", "regex", "amount"]).optional(),
      matchValue: z.string().optional(),
      actionType: z.enum(["categorize", "assign_account", "skip"]).optional(),
      actionValue: z.string().optional(),
      accountId: z.number().optional(),
      priority: z.number().optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const { id, ...data } = input;
      await db.update(bankRules).set(data)
        .where(and(eq(bankRules.id, id), eq(bankRules.userId, ctx.user.id)));
      return { success: true };
    }),

  delete: authedQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      await db.delete(bankRules).where(and(eq(bankRules.id, input.id), eq(bankRules.userId, ctx.user.id)));
      return { success: true };
    }),

  applyToTransactions: authedQuery
    .input(z.object({ ruleId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const rows = await db.select().from(bankRules)
        .where(and(eq(bankRules.id, input.ruleId), eq(bankRules.userId, ctx.user.id)));
      if (!rows[0]) throw new Error("Rule not found");
      const rule = rows[0];
      return { success: true, appliedRule: rule.name, matchType: rule.matchType, actionType: rule.actionType };
    }),
});
