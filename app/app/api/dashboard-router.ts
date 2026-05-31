import { eq, and, sql, desc, gte } from "drizzle-orm";
import { createRouter, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import {
  invoices, bills, accounts, contacts, products, receipts, projects, employees
} from "@db/schema";

export const dashboardRouter = createRouter({
  stats: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    const userId = ctx.user.id;

    const invoiceAgg = await db
      .select({
        totalRevenue: sql<number>`COALESCE(SUM(${invoices.total}), 0)`,
        outstanding: sql<number>`COALESCE(SUM(${invoices.amountDue}), 0)`,
        overdue: sql<number>`COALESCE(SUM(CASE WHEN ${invoices.status} = 'overdue' THEN ${invoices.amountDue} ELSE 0 END), 0)`,
        count: sql<number>`COUNT(*)`,
      })
      .from(invoices)
      .where(eq(invoices.userId, userId));

    const billAgg = await db
      .select({
        totalBills: sql<number>`COALESCE(SUM(${bills.total}), 0)`,
        billsDue: sql<number>`COALESCE(SUM(${bills.amountDue}), 0)`,
        count: sql<number>`COUNT(*)`,
      })
      .from(bills)
      .where(eq(bills.userId, userId));

    const bankBal = await db
      .select({ total: sql<number>`COALESCE(SUM(${accounts.currentBalance}), 0)` })
      .from(accounts)
      .where(and(eq(accounts.userId, userId), eq(accounts.isBankAccount, true)));

    const contactCount = await db.select({ count: sql<number>`COUNT(*)` }).from(contacts).where(eq(contacts.userId, userId));
    const productCount = await db.select({ count: sql<number>`COUNT(*)` }).from(products).where(eq(products.userId, userId));
    const pendingReceipts = await db.select({ count: sql<number>`COUNT(*)` }).from(receipts).where(and(eq(receipts.userId, userId), eq(receipts.status, "pending")));
    const activeProjects = await db.select({ count: sql<number>`COUNT(*)` }).from(projects).where(and(eq(projects.userId, userId), eq(projects.status, "active")));
    const employeeCount = await db.select({ count: sql<number>`COUNT(*)` }).from(employees).where(eq(employees.userId, userId));

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const monthlyRevenue = await db
      .select({
        month: sql<string>`DATE_FORMAT(${invoices.issueDate}, '%Y-%m')`,
        amount: sql<number>`SUM(${invoices.total})`,
      })
      .from(invoices)
      .where(and(eq(invoices.userId, userId), gte(invoices.issueDate, sixMonthsAgo), sql`${invoices.status} IN ('paid', 'partial', 'sent')`))
      .groupBy(sql`DATE_FORMAT(${invoices.issueDate}, '%Y-%m')`)
      .orderBy(sql`DATE_FORMAT(${invoices.issueDate}, '%Y-%m')`);

    return {
      revenue: Number(invoiceAgg[0]?.totalRevenue ?? 0),
      outstanding: Number(invoiceAgg[0]?.outstanding ?? 0),
      overdue: Number(invoiceAgg[0]?.overdue ?? 0),
      totalBills: Number(billAgg[0]?.totalBills ?? 0),
      billsDue: Number(billAgg[0]?.billsDue ?? 0),
      bankBalance: Number(bankBal[0]?.total ?? 0),
      invoiceCount: Number(invoiceAgg[0]?.count ?? 0),
      billCount: Number(billAgg[0]?.count ?? 0),
      contactCount: Number(contactCount[0]?.count ?? 0),
      productCount: Number(productCount[0]?.count ?? 0),
      pendingReceipts: Number(pendingReceipts[0]?.count ?? 0),
      activeProjects: Number(activeProjects[0]?.count ?? 0),
      employeeCount: Number(employeeCount[0]?.count ?? 0),
      monthlyRevenue,
    };
  }),

  recentActivity: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    const userId = ctx.user.id;

    const recentInvoices = await db
      .select({
        id: invoices.id, type: sql<string>`'invoice'`,
        number: invoices.invoiceNumber, amount: invoices.total,
        status: invoices.status, person: contacts.name, date: invoices.createdAt,
      })
      .from(invoices).leftJoin(contacts, eq(invoices.contactId, contacts.id))
      .where(eq(invoices.userId, userId)).orderBy(desc(invoices.createdAt)).limit(5);

    const recentBills = await db
      .select({
        id: bills.id, type: sql<string>`'bill'`,
        number: bills.billNumber, amount: bills.total,
        status: bills.status, person: contacts.name, date: bills.createdAt,
      })
      .from(bills).leftJoin(contacts, eq(bills.contactId, contacts.id))
      .where(eq(bills.userId, userId)).orderBy(desc(bills.createdAt)).limit(5);

    return [...recentInvoices, ...recentBills]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 10);
  }),
});
