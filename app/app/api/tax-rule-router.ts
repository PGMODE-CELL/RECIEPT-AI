import { z } from "zod";
import { eq, and, desc } from "drizzle-orm";
import { createRouter, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { taxRules } from "@db/schema";

export const taxRuleRouter = createRouter({
  list: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    return db.select().from(taxRules).where(eq(taxRules.userId, ctx.user.id)).orderBy(desc(taxRules.createdAt));
  }),

  getById: authedQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = getDb();
      const rows = await db.select().from(taxRules)
        .where(and(eq(taxRules.id, input.id), eq(taxRules.userId, ctx.user.id)));
      return rows[0] ?? null;
    }),

  create: authedQuery
    .input(z.object({
      name: z.string().min(1),
      jurisdiction: z.string().optional(),
      taxType: z.string().min(1),
      rate: z.string(),
      appliesTo: z.string().optional(),
      accountId: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const result = await db.insert(taxRules).values({ ...input, userId: ctx.user.id });
      return { id: Number(result[0].insertId) };
    }),

  update: authedQuery
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      jurisdiction: z.string().optional(),
      taxType: z.string().optional(),
      rate: z.string().optional(),
      appliesTo: z.string().optional(),
      accountId: z.number().optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const { id, ...data } = input;
      await db.update(taxRules).set(data)
        .where(and(eq(taxRules.id, id), eq(taxRules.userId, ctx.user.id)));
      return { success: true };
    }),

  delete: authedQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      await db.delete(taxRules).where(and(eq(taxRules.id, input.id), eq(taxRules.userId, ctx.user.id)));
      return { success: true };
    }),

  applyToTransaction: authedQuery
    .input(z.object({ ruleId: z.number(), amount: z.string() }))
    .query(async ({ ctx, input }) => {
      const db = getDb();
      const rows = await db.select().from(taxRules)
        .where(and(eq(taxRules.id, input.ruleId), eq(taxRules.userId, ctx.user.id)));
      if (!rows[0]) throw new Error("Tax rule not found");
      const rule = rows[0];
      const amount = parseFloat(input.amount);
      const rate = parseFloat(rule.rate) / 100;
      const taxAmount = (amount * rate).toFixed(2);
      return { ruleName: rule.name, taxType: rule.taxType, rate: rule.rate, amount: taxAmount };
    }),
});
