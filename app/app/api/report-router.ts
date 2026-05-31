import { z } from "zod";
import { eq, and, sql, gte, lte } from "drizzle-orm";
import { createRouter, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import {
  invoices, bills, transactions, accounts, journalEntryLines, contacts,
} from "@db/schema";

export const reportRouter = createRouter({
  profitLoss: authedQuery
    .input(z.object({ from: z.string(), to: z.string() }))
    .query(async ({ ctx, input }) => {
      const db = getDb();
      const { from, to } = input;

      const income = await db.select({
        name: accounts.name, code: accounts.code,
        amount: sql<number>`COALESCE(SUM(${journalEntryLines.credit} - ${journalEntryLines.debit}), 0)`,
      }).from(accounts).leftJoin(
        journalEntryLines,
        and(eq(journalEntryLines.accountId, accounts.id), sql`${journalEntryLines.createdAt} >= ${from} AND ${journalEntryLines.createdAt} <= ${to}`)
      ).where(and(eq(accounts.userId, ctx.user.id), eq(accounts.type, "income"))).groupBy(accounts.id);

      const expenses = await db.select({
        name: accounts.name, code: accounts.code,
        amount: sql<number>`COALESCE(SUM(${journalEntryLines.debit} - ${journalEntryLines.credit}), 0)`,
      }).from(accounts).leftJoin(
        journalEntryLines,
        and(eq(journalEntryLines.accountId, accounts.id), sql`${journalEntryLines.createdAt} >= ${from} AND ${journalEntryLines.createdAt} <= ${to}`)
      ).where(and(eq(accounts.userId, ctx.user.id), eq(accounts.type, "expense"))).groupBy(accounts.id);

      const totalIncome = income.reduce((s, i) => s + Number(i.amount), 0);
      const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount), 0);

      const invTotal = await db.select({ total: sql<number>`COALESCE(SUM(${invoices.total}), 0)` }).from(invoices)
        .where(and(eq(invoices.userId, ctx.user.id), gte(invoices.issueDate, new Date(from)), lte(invoices.issueDate, new Date(to)), sql`${invoices.status} IN ('paid', 'partial', 'sent')`));

      const billTotal = await db.select({ total: sql<number>`COALESCE(SUM(${bills.total}), 0)` }).from(bills)
        .where(and(eq(bills.userId, ctx.user.id), gte(bills.billDate, new Date(from)), lte(bills.billDate, new Date(to))));

      return {
        period: { from, to },
        income: totalIncome || Number(invTotal[0]?.total ?? 0),
        expenses: totalExpenses || Number(billTotal[0]?.total ?? 0),
        netProfit: (totalIncome || Number(invTotal[0]?.total ?? 0)) - (totalExpenses || Number(billTotal[0]?.total ?? 0)),
        incomeAccounts: income,
        expenseAccounts: expenses,
      };
    }),

  balanceSheet: authedQuery
    .input(z.object({ asOf: z.string() }))
    .query(async ({ ctx, input }) => {
      const db = getDb();
      const { asOf } = input;
      const assets = await db.select({ name: accounts.name, code: accounts.code, balance: accounts.currentBalance, type: accounts.type })
        .from(accounts).where(and(eq(accounts.userId, ctx.user.id), eq(accounts.type, "asset"), eq(accounts.isActive, true)));
      const liabilities = await db.select({ name: accounts.name, code: accounts.code, balance: accounts.currentBalance, type: accounts.type })
        .from(accounts).where(and(eq(accounts.userId, ctx.user.id), eq(accounts.type, "liability"), eq(accounts.isActive, true)));
      const equity = await db.select({ name: accounts.name, code: accounts.code, balance: accounts.currentBalance, type: accounts.type })
        .from(accounts).where(and(eq(accounts.userId, ctx.user.id), eq(accounts.type, "equity"), eq(accounts.isActive, true)));

      const totalAssets = assets.reduce((s, a) => s + parseFloat(a.balance || "0"), 0);
      const totalLiabilities = liabilities.reduce((s, l) => s + parseFloat(l.balance || "0"), 0);
      const totalEquity = equity.reduce((s, e) => s + parseFloat(e.balance || "0"), 0);

      return { asOf, assets, liabilities, equity, totalAssets, totalLiabilities, totalEquity };
    }),

  cashFlow: authedQuery
    .input(z.object({ from: z.string(), to: z.string() }))
    .query(async ({ ctx, input }) => {
      const db = getDb();
      const { from, to } = input;

      const inflows = await db.select({ type: transactions.type, total: sql<number>`COALESCE(SUM(${transactions.debit}), 0)` })
        .from(transactions).where(and(eq(transactions.userId, ctx.user.id), gte(transactions.date, new Date(from)), lte(transactions.date, new Date(to)), sql`${transactions.debit} > 0`)).groupBy(transactions.type);

      const outflows = await db.select({ type: transactions.type, total: sql<number>`COALESCE(SUM(${transactions.credit}), 0)` })
        .from(transactions).where(and(eq(transactions.userId, ctx.user.id), gte(transactions.date, new Date(from)), lte(transactions.date, new Date(to)), sql`${transactions.credit} > 0`)).groupBy(transactions.type);

      const totalIn = inflows.reduce((s, i) => s + Number(i.total), 0);
      const totalOut = outflows.reduce((s, o) => s + Number(o.total), 0);

      return { period: { from, to }, inflows, outflows, totalIn, totalOut, netFlow: totalIn - totalOut };
    }),

  agedReceivables: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    const now = new Date();
    return db.select({
      id: invoices.id, number: invoices.invoiceNumber,
      contactName: contacts.name, total: invoices.total, amountDue: invoices.amountDue,
      dueDate: invoices.dueDate, daysOverdue: sql<number>`DATEDIFF(${now}, ${invoices.dueDate})`,
    }).from(invoices).leftJoin(contacts, eq(invoices.contactId, contacts.id))
      .where(and(eq(invoices.userId, ctx.user.id), eq(invoices.status, "overdue"))).orderBy(invoices.dueDate);
  }),

  agedPayables: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    const now = new Date();
    return db.select({
      id: bills.id, number: bills.billNumber,
      contactName: contacts.name, total: bills.total, amountDue: bills.amountDue,
      dueDate: bills.dueDate, daysOverdue: sql<number>`DATEDIFF(${now}, ${bills.dueDate})`,
    }).from(bills).leftJoin(contacts, eq(bills.contactId, contacts.id))
      .where(and(eq(bills.userId, ctx.user.id), eq(bills.status, "overdue"))).orderBy(bills.dueDate);
  }),

  taxSummary: authedQuery
    .input(z.object({ from: z.string(), to: z.string() }))
    .query(async ({ ctx, input }) => {
      const db = getDb();
      const { from, to } = input;

      const taxOnInvoices = await db.select({
        totalTax: sql<number>`COALESCE(SUM(${invoices.taxTotal}), 0)`,
        totalRevenue: sql<number>`COALESCE(SUM(${invoices.subTotal}), 0)`,
      }).from(invoices).where(and(eq(invoices.userId, ctx.user.id), gte(invoices.issueDate, new Date(from)), lte(invoices.issueDate, new Date(to))));

      const taxOnBills = await db.select({
        totalTax: sql<number>`COALESCE(SUM(${bills.taxTotal}), 0)`,
        totalExpense: sql<number>`COALESCE(SUM(${bills.subTotal}), 0)`,
      }).from(bills).where(and(eq(bills.userId, ctx.user.id), gte(bills.billDate, new Date(from)), lte(bills.billDate, new Date(to))));

      return {
        period: { from, to },
        outputTax: Number(taxOnInvoices[0]?.totalTax ?? 0),
        inputTax: Number(taxOnBills[0]?.totalTax ?? 0),
        taxPayable: Number(taxOnInvoices[0]?.totalTax ?? 0) - Number(taxOnBills[0]?.totalTax ?? 0),
        totalRevenue: Number(taxOnInvoices[0]?.totalRevenue ?? 0),
        totalPurchases: Number(taxOnBills[0]?.totalExpense ?? 0),
      };
    }),
});
