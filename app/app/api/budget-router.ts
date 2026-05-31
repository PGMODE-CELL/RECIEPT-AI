import { z } from "zod";
import { eq, and, desc, sql, gte, lte } from "drizzle-orm";
import { createRouter, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { budgets, accounts } from "@db/schema";

export const budgetRouter = createRouter({
  list: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    return db.select({
      id: budgets.id,
      name: budgets.name,
      accountId: budgets.accountId,
      accountName: accounts.name,
      period: budgets.period,
      amount: budgets.amount,
      spent: budgets.spent,
      startDate: budgets.startDate,
      endDate: budgets.endDate,
      isActive: budgets.isActive,
      createdAt: budgets.createdAt,
    }).from(budgets)
      .leftJoin(accounts, eq(budgets.accountId, accounts.id))
      .where(eq(budgets.userId, ctx.user.id))
      .orderBy(desc(budgets.createdAt));
  }),

  getById: authedQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = getDb();
      const rows = await db.select().from(budgets)
        .where(and(eq(budgets.id, input.id), eq(budgets.userId, ctx.user.id)));
      return rows[0] ?? null;
    }),

  create: authedQuery
    .input(z.object({
      name: z.string().min(1),
      accountId: z.number(),
      period: z.enum(["monthly", "quarterly", "yearly"]).default("monthly"),
      amount: z.string(),
      startDate: z.string(),
      endDate: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const result = await db.insert(budgets).values({
        ...input,
        userId: ctx.user.id,
        startDate: new Date(input.startDate),
        endDate: new Date(input.endDate),
        spent: "0.00",
      });
      return { id: Number(result[0].insertId) };
    }),

  update: authedQuery
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      amount: z.string().optional(),
      spent: z.string().optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const { id, ...data } = input;
      await db.update(budgets).set(data)
        .where(and(eq(budgets.id, id), eq(budgets.userId, ctx.user.id)));
      return { success: true };
    }),

  delete: authedQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      await db.delete(budgets).where(and(eq(budgets.id, input.id), eq(budgets.userId, ctx.user.id)));
      return { success: true };
    }),

  getSummary: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    const active = await db.select({
      totalBudget: sql<number>`COALESCE(SUM(${budgets.amount}), 0)`,
      totalSpent: sql<number>`COALESCE(SUM(${budgets.spent}), 0)`,
      count: sql<number>`COUNT(*)`,
    }).from(budgets).where(and(eq(budgets.userId, ctx.user.id), eq(budgets.isActive, true)));
    return active[0] || { totalBudget: 0, totalSpent: 0, count: 0 };
  }),
});
