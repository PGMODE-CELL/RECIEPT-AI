import { z } from "zod";
import { eq, and, sql } from "drizzle-orm";
import { createRouter, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { accounts, transactions, journalEntryLines } from "@db/schema";

export const accountRouter = createRouter({
  list: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    return db
      .select()
      .from(accounts)
      .where(eq(accounts.userId, ctx.user.id))
      .orderBy(accounts.code);
  }),

  getById: authedQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = getDb();
      const rows = await db
        .select()
        .from(accounts)
        .where(and(eq(accounts.id, input.id), eq(accounts.userId, ctx.user.id)));
      return rows[0] ?? null;
    }),

  create: authedQuery
    .input(z.object({
      code: z.string().min(1),
      name: z.string().min(1),
      type: z.enum(["asset", "liability", "equity", "income", "expense"]),
      subType: z.string().optional(),
      parentId: z.number().optional(),
      isBankAccount: z.boolean().optional(),
      bankName: z.string().optional(),
      bankAccountNumber: z.string().optional(),
      currency: z.string().default("USD"),
      openingBalance: z.string().default("0.00"),
      description: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const result = await db.insert(accounts).values({
        ...input,
        userId: ctx.user.id,
        currentBalance: input.openingBalance,
      });
      return { id: Number(result[0].insertId) };
    }),

  update: authedQuery
    .input(z.object({
      id: z.number(),
      code: z.string().optional(),
      name: z.string().optional(),
      type: z.enum(["asset", "liability", "equity", "income", "expense"]).optional(),
      subType: z.string().optional(),
      isBankAccount: z.boolean().optional(),
      bankName: z.string().optional(),
      bankAccountNumber: z.string().optional(),
      currency: z.string().optional(),
      openingBalance: z.string().optional(),
      isActive: z.boolean().optional(),
      description: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const { id, ...data } = input;
      await db
        .update(accounts)
        .set(data)
        .where(and(eq(accounts.id, id), eq(accounts.userId, ctx.user.id)));
      return { success: true };
    }),

  delete: authedQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      // Check if account has transactions
      const txnCount = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(transactions)
        .where(and(eq(transactions.accountId, input.id), eq(transactions.userId, ctx.user.id)));
      const jeCount = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(journalEntryLines)
        .where(eq(journalEntryLines.accountId, input.id));

      if ((txnCount[0]?.count ?? 0) > 0 || (jeCount[0]?.count ?? 0) > 0) {
        throw new Error("Cannot delete account with transactions. Deactivate it instead.");
      }
      await db
        .delete(accounts)
        .where(and(eq(accounts.id, input.id), eq(accounts.userId, ctx.user.id)));
      return { success: true };
    }),

  // Get account ledger
  ledger: authedQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = getDb();
      return db
        .select()
        .from(transactions)
        .where(and(eq(transactions.accountId, input.id), eq(transactions.userId, ctx.user.id)))
        .orderBy(transactions.date);
    }),
});
