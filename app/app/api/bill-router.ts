import { z } from "zod";
import { eq, and, desc, sql, like } from "drizzle-orm";
import { createRouter, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { bills, billItems, accounts, transactions, contacts } from "@db/schema";

export const billRouter = createRouter({
  list: authedQuery
    .input(z.object({
      status: z.string().optional(),
      search: z.string().optional(),
      page: z.number().optional().default(1),
      limit: z.number().optional().default(50),
    }).optional())
    .query(async ({ ctx, input }) => {
      const db = getDb();
      const conditions = [eq(bills.userId, ctx.user.id)];
      if (input?.status) conditions.push(eq(bills.status, input.status as any));
      if (input?.search) conditions.push(like(bills.billNumber, `%${input.search}%`));

      const page = input?.page || 1;
      const limit = input?.limit || 50;
      const offset = (page - 1) * limit;

      const [countResult] = await db.select({ count: sql<number>`COUNT(*)` }).from(bills).where(and(...conditions));
      const total = countResult?.count || 0;

      const rows = await db
        .select({
          id: bills.id,
          billNumber: bills.billNumber,
          contactId: bills.contactId,
          contactName: contacts.name,
          billDate: bills.billDate,
          dueDate: bills.dueDate,
          status: bills.status,
          subTotal: bills.subTotal,
          taxTotal: bills.taxTotal,
          total: bills.total,
          amountPaid: bills.amountPaid,
          amountDue: bills.amountDue,
          currency: bills.currency,
          notes: bills.notes,
          createdAt: bills.createdAt,
        })
        .from(bills)
        .leftJoin(contacts, eq(bills.contactId, contacts.id))
        .where(and(...conditions))
        .orderBy(desc(bills.createdAt))
        .limit(limit)
        .offset(offset);

      return { bills: rows, total, page, limit };
    }),

  getById: authedQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = getDb();
      const billRows = await db
        .select({
          id: bills.id,
          billNumber: bills.billNumber,
          contactId: bills.contactId,
          contactName: contacts.name,
          contactEmail: contacts.email,
          contactAddress: contacts.address,
          billDate: bills.billDate,
          dueDate: bills.dueDate,
          status: bills.status,
          subTotal: bills.subTotal,
          taxTotal: bills.taxTotal,
          total: bills.total,
          amountPaid: bills.amountPaid,
          amountDue: bills.amountDue,
          currency: bills.currency,
          notes: bills.notes,
          createdAt: bills.createdAt,
        })
        .from(bills)
        .leftJoin(contacts, eq(bills.contactId, contacts.id))
        .where(and(eq(bills.id, input.id), eq(bills.userId, ctx.user.id)));
      if (!billRows[0]) return null;
      const items = await db.select().from(billItems).where(eq(billItems.billId, input.id));
      return { ...billRows[0], items };
    }),

  create: authedQuery
    .input(z.object({
      billNumber: z.string().min(1),
      contactId: z.number(),
      billDate: z.string(),
      dueDate: z.string(),
      currency: z.string().default("USD"),
      notes: z.string().optional(),
      items: z.array(z.object({
        description: z.string().min(1),
        quantity: z.string(),
        unitPrice: z.string(),
        taxRate: z.string().optional(),
        amount: z.string(),
      })).min(1),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const { items, ...billData } = input;
      const subTotal = items.reduce((s, i) => s + parseFloat(i.amount), 0);
      const taxTotal = items.reduce((s, i) => s + parseFloat(i.taxRate || "0") * parseFloat(i.quantity) * parseFloat(i.unitPrice) / 100, 0);
      const total = subTotal + taxTotal;

      const result = await db.insert(bills).values({
        ...billData,
        userId: ctx.user.id,
        billDate: new Date(billData.billDate),
        dueDate: new Date(billData.dueDate),
        subTotal: subTotal.toFixed(2),
        taxTotal: taxTotal.toFixed(2),
        total: total.toFixed(2),
        amountDue: total.toFixed(2),
        amountPaid: "0.00",
        status: "draft",
      });
      const billId = Number(result[0].insertId);

      if (items.length > 0) {
        await db.insert(billItems).values(items.map((item) => ({
          ...item, billId, taxRate: item.taxRate || "0.00",
        })));
      }
      return { id: billId };
    }),

  update: authedQuery
    .input(z.object({
      id: z.number(),
      billNumber: z.string().optional(),
      contactId: z.number().optional(),
      billDate: z.string().optional(),
      dueDate: z.string().optional(),
      currency: z.string().optional(),
      notes: z.string().optional(),
      items: z.array(z.object({
        description: z.string().min(1),
        quantity: z.string(),
        unitPrice: z.string(),
        taxRate: z.string().optional(),
        amount: z.string(),
      })).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const { id, items, ...updateData } = input;

      const updateFields: any = { ...updateData };
      if (updateData.billDate) updateFields.billDate = new Date(updateData.billDate);
      if (updateData.dueDate) updateFields.dueDate = new Date(updateData.dueDate);

      if (items && items.length > 0) {
        const subTotal = items.reduce((s, i) => s + parseFloat(i.amount), 0);
        const taxTotal = items.reduce((s, i) => s + parseFloat(i.taxRate || "0") * parseFloat(i.quantity) * parseFloat(i.unitPrice) / 100, 0);
        const total = subTotal + taxTotal;

        updateFields.subTotal = subTotal.toFixed(2);
        updateFields.taxTotal = taxTotal.toFixed(2);
        updateFields.total = total.toFixed(2);

        const current = await db.select().from(bills).where(eq(bills.id, id));
        const amountPaid = parseFloat(current[0]?.amountPaid || "0");
        updateFields.amountDue = Math.max(0, total - amountPaid).toFixed(2);

        await db.delete(billItems).where(eq(billItems.billId, id));
        await db.insert(billItems).values(items.map((item) => ({
          ...item, billId: id, taxRate: item.taxRate || "0.00",
        })));
      }

      await db.update(bills).set(updateFields).where(and(eq(bills.id, id), eq(bills.userId, ctx.user.id)));
      return { success: true };
    }),

  updateStatus: authedQuery
    .input(z.object({ id: z.number(), status: z.enum(["draft", "received", "approved", "partial", "paid", "overdue", "cancelled"]) }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      await db.update(bills).set({ status: input.status }).where(and(eq(bills.id, input.id), eq(bills.userId, ctx.user.id)));
      return { success: true };
    }),

  recordPayment: authedQuery
    .input(z.object({
      id: z.number(),
      amount: z.string(),
      date: z.string(),
      accountId: z.number(),
      reference: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const { id, amount, date, accountId, reference } = input;
      const billRows = await db.select().from(bills)
        .where(and(eq(bills.id, id), eq(bills.userId, ctx.user.id)));
      if (!billRows[0]) throw new Error("Bill not found");
      const bill = billRows[0];

      const newPaid = parseFloat(bill.amountPaid || "0") + parseFloat(amount);
      const newDue = parseFloat(bill.total || "0") - newPaid;
      const status = newDue <= 0 ? "paid" : "partial";

      await db.update(bills).set({
        amountPaid: newPaid.toFixed(2),
        amountDue: Math.max(0, newDue).toFixed(2),
        status,
      }).where(eq(bills.id, id));

      await db.insert(transactions).values({
        userId: ctx.user.id,
        accountId,
        date: new Date(date),
        description: `Payment for Bill #${bill.billNumber}`,
        type: "bill_payment",
        reference: reference || `BILL-${id}`,
        debit: "0.00",
        credit: amount,
        sourceType: "bill",
        sourceId: id,
        contactId: bill.contactId,
        currency: bill.currency,
      });

      await db.update(accounts)
        .set({ currentBalance: sql`${accounts.currentBalance} - ${amount}` })
        .where(eq(accounts.id, accountId));

      return { success: true };
    }),

  delete: authedQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      await db.delete(billItems).where(eq(billItems.billId, input.id));
      await db.delete(bills).where(and(eq(bills.id, input.id), eq(bills.userId, ctx.user.id)));
      return { success: true };
    }),

  nextNumber: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    const result = await db
      .select({ maxNum: sql<number>`COALESCE(MAX(CAST(SUBSTRING(${bills.billNumber}, 6) AS UNSIGNED)), 0)` })
      .from(bills).where(eq(bills.userId, ctx.user.id));
    return `BILL-${String((result[0]?.maxNum ?? 0) + 1).padStart(4, "0")}`;
  }),
});
