import { z } from "zod";
import { eq, and, desc, sql, gte, lte } from "drizzle-orm";
import { createRouter, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { transactions, accounts } from "@db/schema";

export const transactionRouter = createRouter({
  list: authedQuery
    .input(z.object({
      accountId: z.number().optional(),
      type: z.string().optional(),
      from: z.string().optional(),
      to: z.string().optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      const db = getDb();
      let conditions = [eq(transactions.userId, ctx.user.id)];
      if (input?.accountId) conditions.push(eq(transactions.accountId, input.accountId));
      if (input?.type) conditions.push(eq(transactions.type, input.type as any));
      if (input?.from) conditions.push(gte(transactions.date, new Date(input.from)));
      if (input?.to) conditions.push(lte(transactions.date, new Date(input.to)));

      return db
        .select({
          id: transactions.id,
          date: transactions.date,
          description: transactions.description,
          type: transactions.type,
          reference: transactions.reference,
          debit: transactions.debit,
          credit: transactions.credit,
          runningBalance: transactions.runningBalance,
          isReconciled: transactions.isReconciled,
          accountName: accounts.name,
          createdAt: transactions.createdAt,
        })
        .from(transactions)
        .leftJoin(accounts, eq(transactions.accountId, accounts.id))
        .where(and(...conditions))
        .orderBy(desc(transactions.date));
    }),

  create: authedQuery
    .input(z.object({
      accountId: z.number(),
      date: z.string(),
      description: z.string().min(1),
      type: z.enum(["income", "expense", "transfer", "deposit", "withdrawal"]),
      reference: z.string().optional(),
      amount: z.string(),
      direction: z.enum(["debit", "credit"]),
      currency: z.string().default("USD"),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const { direction, amount, ...data } = input;

      const result = await db.insert(transactions).values({
        ...data,
        userId: ctx.user.id,
        date: new Date(data.date),
        debit: direction === "debit" ? amount : "0.00",
        credit: direction === "credit" ? amount : "0.00",
        sourceType: "manual",
      });

      // Update account balance
      const change = direction === "debit" ? amount : `-${amount}`;
      await db
        .update(accounts)
        .set({ currentBalance: sql`${accounts.currentBalance} + ${change}` })
        .where(and(eq(accounts.id, data.accountId), eq(accounts.userId, ctx.user.id)));

      return { id: Number(result[0].insertId) };
    }),

  delete: authedQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      await db.delete(transactions)
        .where(and(eq(transactions.id, input.id), eq(transactions.userId, ctx.user.id)));
      return { success: true };
    }),
});
