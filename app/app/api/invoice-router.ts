import { z } from "zod";
import { eq, and, desc, sql, like } from "drizzle-orm";
import { createRouter, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { invoices, invoiceItems, contacts, accounts, transactions } from "@db/schema";

export const invoiceRouter = createRouter({
  list: authedQuery
    .input(z.object({
      status: z.string().optional(),
      search: z.string().optional(),
      page: z.number().optional().default(1),
      limit: z.number().optional().default(50),
    }).optional())
    .query(async ({ ctx, input }) => {
      const db = getDb();
      const conditions = [eq(invoices.userId, ctx.user.id)];
      if (input?.status) conditions.push(eq(invoices.status, input.status as any));
      if (input?.search) conditions.push(like(invoices.invoiceNumber, `%${input.search}%`));

      const page = input?.page || 1;
      const limit = input?.limit || 50;
      const offset = (page - 1) * limit;

      const [countResult] = await db.select({ count: sql<number>`COUNT(*)` }).from(invoices).where(and(...conditions));
      const total = countResult?.count || 0;

      const rows = await db
        .select({
          id: invoices.id,
          invoiceNumber: invoices.invoiceNumber,
          contactId: invoices.contactId,
          contactName: contacts.name,
          issueDate: invoices.issueDate,
          dueDate: invoices.dueDate,
          status: invoices.status,
          total: invoices.total,
          amountPaid: invoices.amountPaid,
          amountDue: invoices.amountDue,
          currency: invoices.currency,
          createdAt: invoices.createdAt,
        })
        .from(invoices)
        .leftJoin(contacts, eq(invoices.contactId, contacts.id))
        .where(and(...conditions))
        .orderBy(desc(invoices.createdAt))
        .limit(limit)
        .offset(offset);

      return { invoices: rows, total, page, limit };
    }),

  getById: authedQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = getDb();
      const invRows = await db
        .select({
          id: invoices.id,
          invoiceNumber: invoices.invoiceNumber,
          contactId: invoices.contactId,
          contactName: contacts.name,
          contactEmail: contacts.email,
          contactAddress: contacts.address,
          issueDate: invoices.issueDate,
          dueDate: invoices.dueDate,
          status: invoices.status,
          subTotal: invoices.subTotal,
          taxTotal: invoices.taxTotal,
          discountTotal: invoices.discountTotal,
          total: invoices.total,
          amountPaid: invoices.amountPaid,
          amountDue: invoices.amountDue,
          currency: invoices.currency,
          notes: invoices.notes,
          terms: invoices.terms,
          createdAt: invoices.createdAt,
        })
        .from(invoices)
        .leftJoin(contacts, eq(invoices.contactId, contacts.id))
        .where(and(eq(invoices.id, input.id), eq(invoices.userId, ctx.user.id)));
      if (!invRows[0]) return null;
      const items = await db.select().from(invoiceItems).where(eq(invoiceItems.invoiceId, input.id));
      return { ...invRows[0], items };
    }),

  create: authedQuery
    .input(z.object({
      invoiceNumber: z.string().min(1),
      contactId: z.number(),
      issueDate: z.string(),
      dueDate: z.string(),
      currency: z.string().default("USD"),
      notes: z.string().optional(),
      terms: z.string().optional(),
      items: z.array(z.object({
        productId: z.number().optional(),
        description: z.string().min(1),
        quantity: z.string(),
        unitPrice: z.string(),
        discount: z.string().optional(),
        taxRate: z.string().optional(),
        taxAmount: z.string().optional(),
        amount: z.string(),
      })).min(1),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const { items, ...invData } = input;
      const subTotal = items.reduce((sum, item) => sum + parseFloat(item.amount), 0);
      const taxTotal = items.reduce((sum, item) => sum + parseFloat(item.taxAmount || "0"), 0);
      const discountTotal = items.reduce((sum, item) => sum + parseFloat(item.discount || "0"), 0);
      const total = subTotal + taxTotal - discountTotal;

      const result = await db.insert(invoices).values({
        ...invData,
        userId: ctx.user.id,
        issueDate: new Date(invData.issueDate),
        dueDate: new Date(invData.dueDate),
        subTotal: subTotal.toFixed(2),
        taxTotal: taxTotal.toFixed(2),
        discountTotal: discountTotal.toFixed(2),
        total: total.toFixed(2),
        amountDue: total.toFixed(2),
        amountPaid: "0.00",
        status: "draft",
      });
      const invoiceId = Number(result[0].insertId);

      if (items.length > 0) {
        await db.insert(invoiceItems).values(items.map((item) => ({
          invoiceId,
          productId: item.productId ?? null,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discount: item.discount || "0.00",
          taxRate: item.taxRate || "0.00",
          taxAmount: item.taxAmount || "0.00",
          amount: item.amount,
        })));
      }
      return { id: invoiceId };
    }),

  update: authedQuery
    .input(z.object({
      id: z.number(),
      invoiceNumber: z.string().optional(),
      contactId: z.number().optional(),
      issueDate: z.string().optional(),
      dueDate: z.string().optional(),
      currency: z.string().optional(),
      notes: z.string().optional(),
      terms: z.string().optional(),
      items: z.array(z.object({
        productId: z.number().optional(),
        description: z.string().min(1),
        quantity: z.string(),
        unitPrice: z.string(),
        discount: z.string().optional(),
        taxRate: z.string().optional(),
        taxAmount: z.string().optional(),
        amount: z.string(),
      })).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const { id, items, ...updateData } = input;

      const updateFields: any = { ...updateData };
      if (updateData.issueDate) updateFields.issueDate = new Date(updateData.issueDate);
      if (updateData.dueDate) updateFields.dueDate = new Date(updateData.dueDate);

      if (items && items.length > 0) {
        const subTotal = items.reduce((sum, item) => sum + parseFloat(item.amount), 0);
        const taxTotal = items.reduce((sum, item) => sum + parseFloat(item.taxAmount || "0"), 0);
        const discountTotal = items.reduce((sum, item) => sum + parseFloat(item.discount || "0"), 0);
        const total = subTotal + taxTotal - discountTotal;

        updateFields.subTotal = subTotal.toFixed(2);
        updateFields.taxTotal = taxTotal.toFixed(2);
        updateFields.discountTotal = discountTotal.toFixed(2);
        updateFields.total = total.toFixed(2);

        const current = await db.select().from(invoices).where(eq(invoices.id, id));
        const amountPaid = parseFloat(current[0]?.amountPaid || "0");
        updateFields.amountDue = Math.max(0, total - amountPaid).toFixed(2);

        await db.delete(invoiceItems).where(eq(invoiceItems.invoiceId, id));
        await db.insert(invoiceItems).values(items.map((item) => ({
          invoiceId: id,
          productId: item.productId ?? null,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discount: item.discount || "0.00",
          taxRate: item.taxRate || "0.00",
          taxAmount: item.taxAmount || "0.00",
          amount: item.amount,
        })));
      }

      await db.update(invoices).set(updateFields).where(and(eq(invoices.id, id), eq(invoices.userId, ctx.user.id)));
      return { success: true };
    }),

  updateStatus: authedQuery
    .input(z.object({ id: z.number(), status: z.enum(["draft", "sent", "viewed", "paid", "partial", "overdue", "cancelled"]) }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      await db.update(invoices).set({ status: input.status }).where(and(eq(invoices.id, input.id), eq(invoices.userId, ctx.user.id)));
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
      const invRows = await db.select().from(invoices).where(and(eq(invoices.id, id), eq(invoices.userId, ctx.user.id)));
      if (!invRows[0]) throw new Error("Invoice not found");
      const inv = invRows[0];
      const newPaid = parseFloat(inv.amountPaid || "0") + parseFloat(amount);
      const newDue = parseFloat(inv.total || "0") - newPaid;
      const status = newDue <= 0 ? "paid" : "partial";

      await db.update(invoices).set({ amountPaid: newPaid.toFixed(2), amountDue: Math.max(0, newDue).toFixed(2), status }).where(eq(invoices.id, id));
      await db.insert(transactions).values({
        userId: ctx.user.id, accountId, date: new Date(date),
        description: `Payment for Invoice #${inv.invoiceNumber}`,
        type: "invoice_payment", reference: reference || `INV-${id}`,
        debit: amount, credit: "0.00", sourceType: "invoice", sourceId: id,
        contactId: inv.contactId, currency: inv.currency,
      });
      await db.update(accounts).set({ currentBalance: sql`${accounts.currentBalance} + ${amount}` }).where(eq(accounts.id, accountId));
      return { success: true };
    }),

  delete: authedQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      await db.delete(invoiceItems).where(eq(invoiceItems.invoiceId, input.id));
      await db.delete(invoices).where(and(eq(invoices.id, input.id), eq(invoices.userId, ctx.user.id)));
      return { success: true };
    }),

  nextNumber: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    const result = await db.select({ maxNum: sql<number>`COALESCE(MAX(CAST(SUBSTRING(${invoices.invoiceNumber}, 5) AS UNSIGNED)), 0)` }).from(invoices).where(eq(invoices.userId, ctx.user.id));
    return `INV-${String((result[0]?.maxNum ?? 0) + 1).padStart(4, "0")}`;
  }),
});
