import { z } from "zod";
import { eq, and, desc, sql } from "drizzle-orm";
import { createRouter, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { journalEntries, journalEntryLines, accounts } from "@db/schema";

export const journalEntryRouter = createRouter({
  list: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    return db
      .select({
        id: journalEntries.id,
        entryNumber: journalEntries.entryNumber,
        date: journalEntries.date,
        reference: journalEntries.reference,
        description: journalEntries.description,
        isPosted: journalEntries.isPosted,
        totalDebits: journalEntries.totalDebits,
        totalCredits: journalEntries.totalCredits,
        createdAt: journalEntries.createdAt,
      })
      .from(journalEntries)
      .where(eq(journalEntries.userId, ctx.user.id))
      .orderBy(desc(journalEntries.date));
  }),

  getById: authedQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = getDb();
      const rows = await db
        .select()
        .from(journalEntries)
        .where(and(eq(journalEntries.id, input.id), eq(journalEntries.userId, ctx.user.id)));
      if (!rows[0]) return null;

      const lines = await db
        .select({
          id: journalEntryLines.id,
          accountId: journalEntryLines.accountId,
          accountName: accounts.name,
          accountCode: accounts.code,
          description: journalEntryLines.description,
          debit: journalEntryLines.debit,
          credit: journalEntryLines.credit,
        })
        .from(journalEntryLines)
        .leftJoin(accounts, eq(journalEntryLines.accountId, accounts.id))
        .where(eq(journalEntryLines.journalEntryId, input.id));

      return { ...rows[0], lines };
    }),

  create: authedQuery
    .input(z.object({
      entryNumber: z.string().min(1),
      date: z.string(),
      reference: z.string().optional(),
      description: z.string().min(1),
      lines: z.array(z.object({
        accountId: z.number(),
        description: z.string().optional(),
        debit: z.string().default("0"),
        credit: z.string().default("0"),
      })).min(2),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const { lines, ...entryData } = input;

      const totalDebits = lines.reduce((s, l) => s + parseFloat(l.debit || "0"), 0);
      const totalCredits = lines.reduce((s, l) => s + parseFloat(l.credit || "0"), 0);

      if (Math.abs(totalDebits - totalCredits) > 0.01) {
        throw new Error("Debits and credits must be equal");
      }

      const result = await db.insert(journalEntries).values({
        ...entryData,
        userId: ctx.user.id,
        date: new Date(entryData.date),
        totalDebits: totalDebits.toFixed(2),
        totalCredits: totalCredits.toFixed(2),
        isPosted: true,
      });
      const entryId = Number(result[0].insertId);

      if (lines.length > 0) {
        await db.insert(journalEntryLines).values(
          lines.map((line) => ({
            journalEntryId: entryId,
            accountId: line.accountId,
            description: line.description || null,
            debit: line.debit || "0.00",
            credit: line.credit || "0.00",
          }))
        );

        // Update account balances
        for (const line of lines) {
          const debit = parseFloat(line.debit || "0");
          const credit = parseFloat(line.credit || "0");
          const change = debit - credit;
          if (change !== 0) {
            await db
              .update(accounts)
              .set({ currentBalance: sql`${accounts.currentBalance} + ${change}` })
              .where(eq(accounts.id, line.accountId));
          }
        }
      }

      return { id: entryId };
    }),

  delete: authedQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();

      // Reverse account balance changes
      const lines = await db
        .select()
        .from(journalEntryLines)
        .where(eq(journalEntryLines.journalEntryId, input.id));

      for (const line of lines) {
        const debit = parseFloat(line.debit || "0");
        const credit = parseFloat(line.credit || "0");
        const change = -(debit - credit);
        if (change !== 0) {
          await db
            .update(accounts)
            .set({ currentBalance: sql`${accounts.currentBalance} + ${change}` })
            .where(eq(accounts.id, line.accountId));
        }
      }

      await db.delete(journalEntryLines).where(eq(journalEntryLines.journalEntryId, input.id));
      await db.delete(journalEntries).where(and(eq(journalEntries.id, input.id), eq(journalEntries.userId, ctx.user.id)));
      return { success: true };
    }),

  nextNumber: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    const result = await db
      .select({ maxNum: sql<number>`COALESCE(MAX(CAST(SUBSTRING(${journalEntries.entryNumber}, 4) AS UNSIGNED)), 0)` })
      .from(journalEntries)
      .where(eq(journalEntries.userId, ctx.user.id));
    return `JE-${String((result[0]?.maxNum ?? 0) + 1).padStart(4, "0")}`;
  }),
});
