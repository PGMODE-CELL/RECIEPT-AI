import { z } from "zod";
import { eq, and, desc, sql } from "drizzle-orm";
import { createRouter, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { bankReconciliations, transactions } from "@db/schema";

export const reconciliationRouter = createRouter({
  list: authedQuery
    .input(z.object({ accountId: z.number().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const db = getDb();
      const conditions = [eq(bankReconciliations.userId, ctx.user.id)];
      if (input?.accountId) conditions.push(eq(bankReconciliations.accountId, input.accountId));
      return db.select().from(bankReconciliations)
        .where(and(...conditions))
        .orderBy(desc(bankReconciliations.createdAt));
    }),

  create: authedQuery
    .input(z.object({
      accountId: z.number(),
      statementDate: z.string(),
      statementBalance: z.string(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      // Calculate ending balance from transactions
      const txnResult = await db.select({
        total: sql<string>`COALESCE(SUM(${transactions.debit}) - SUM(${transactions.credit}), 0)`,
      }).from(transactions).where(eq(transactions.accountId, input.accountId));

      const result = await db.insert(bankReconciliations).values({
        ...input,
        userId: ctx.user.id,
        statementDate: new Date(input.statementDate),
        endingBalance: String(txnResult[0]?.total || "0"),
      });
      return { id: Number(result[0].insertId) };
    }),

  reconcile: authedQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      await db.update(bankReconciliations).set({
        status: "reconciled",
        reconciledAt: new Date(),
      }).where(and(eq(bankReconciliations.id, input.id), eq(bankReconciliations.userId, ctx.user.id)));
      return { success: true };
    }),

  delete: authedQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      await db.delete(bankReconciliations)
        .where(and(eq(bankReconciliations.id, input.id), eq(bankReconciliations.userId, ctx.user.id)));
      return { success: true };
    }),

  getUnreconciled: authedQuery
    .input(z.object({ accountId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = getDb();
      const txns = await db.select().from(transactions)
        .where(and(
          eq(transactions.accountId, input.accountId),
          eq(transactions.isReconciled, false),
        ))
        .orderBy(transactions.date);
      return txns;
    }),
});
