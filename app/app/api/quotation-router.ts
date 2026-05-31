import { z } from "zod";
import { eq, and, desc, sql, like } from "drizzle-orm";
import { createRouter, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { quotations, quotationItems, contacts, products, invoices, invoiceItems } from "@db/schema";

export const quotationRouter = createRouter({
  list: authedQuery
    .input(z.object({
      status: z.string().optional(),
      search: z.string().optional(),
      page: z.number().optional().default(1),
      limit: z.number().optional().default(50),
    }).optional())
    .query(async ({ ctx, input }) => {
      const db = getDb();
      const conditions = [eq(quotations.userId, ctx.user.id)];
      if (input?.status) conditions.push(eq(quotations.status, input.status as any));
      if (input?.search) conditions.push(like(quotations.quoteNumber, `%${input.search}%`));

      const page = input?.page || 1;
      const limit = input?.limit || 50;
      const offset = (page - 1) * limit;

      const [countResult] = await db.select({ count: sql<number>`COUNT(*)` }).from(quotations).where(and(...conditions));
      const total = countResult?.count || 0;

      const rows = await db
        .select({
          id: quotations.id,
          quoteNumber: quotations.quoteNumber,
          contactId: quotations.contactId,
          contactName: contacts.name,
          quoteDate: quotations.quoteDate,
          validUntil: quotations.validUntil,
          status: quotations.status,
          subTotal: quotations.subTotal,
          taxTotal: quotations.taxTotal,
          total: quotations.total,
          currency: quotations.currency,
          createdAt: quotations.createdAt,
        })
        .from(quotations)
        .leftJoin(contacts, eq(quotations.contactId, contacts.id))
        .where(and(...conditions))
        .orderBy(desc(quotations.createdAt))
        .limit(limit)
        .offset(offset);

      return { quotations: rows, total, page, limit };
    }),

  getById: authedQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = getDb();
      const quoteRows = await db
        .select({
          id: quotations.id,
          quoteNumber: quotations.quoteNumber,
          contactId: quotations.contactId,
          contactName: contacts.name,
          contactEmail: contacts.email,
          contactAddress: contacts.address,
          quoteDate: quotations.quoteDate,
          validUntil: quotations.validUntil,
          status: quotations.status,
          subTotal: quotations.subTotal,
          taxTotal: quotations.taxTotal,
          total: quotations.total,
          notes: quotations.notes,
          terms: quotations.terms,
          currency: quotations.currency,
          convertedInvoiceId: quotations.convertedInvoiceId,
          createdAt: quotations.createdAt,
        })
        .from(quotations)
        .leftJoin(contacts, eq(quotations.contactId, contacts.id))
        .where(and(eq(quotations.id, input.id), eq(quotations.userId, ctx.user.id)));
      if (!quoteRows[0]) return null;
      const items = await db
        .select({
          id: quotationItems.id,
          quotationId: quotationItems.quotationId,
          productId: quotationItems.productId,
          productName: products.name,
          description: quotationItems.description,
          quantity: quotationItems.quantity,
          unitPrice: quotationItems.unitPrice,
          discount: quotationItems.discount,
          taxRate: quotationItems.taxRate,
          taxAmount: quotationItems.taxAmount,
          amount: quotationItems.amount,
        })
        .from(quotationItems)
        .leftJoin(products, eq(quotationItems.productId, products.id))
        .where(eq(quotationItems.quotationId, input.id));
      return { ...quoteRows[0], items };
    }),

  create: authedQuery
    .input(z.object({
      quoteNumber: z.string().min(1),
      contactId: z.number(),
      quoteDate: z.string(),
      validUntil: z.string().optional(),
      notes: z.string().optional(),
      terms: z.string().optional(),
      currency: z.string().default("USD"),
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
      const { items, ...quoteData } = input;
      const subTotal = items.reduce((s, i) => s + parseFloat(i.amount), 0);
      const taxTotal = items.reduce((s, i) => s + parseFloat(i.taxAmount || "0"), 0);
      const discountTotal = items.reduce((s, i) => s + parseFloat(i.discount || "0"), 0);
      const total = subTotal + taxTotal - discountTotal;

      const result = await db.insert(quotations).values({
        ...quoteData,
        userId: ctx.user.id,
        quoteDate: new Date(quoteData.quoteDate),
        validUntil: quoteData.validUntil ? new Date(quoteData.validUntil) : null,
        subTotal: subTotal.toFixed(2),
        taxTotal: taxTotal.toFixed(2),
        total: total.toFixed(2),
        status: "draft",
      });
      const quotationId = Number(result[0].insertId);

      if (items.length > 0) {
        await db.insert(quotationItems).values(items.map((item) => ({
          quotationId,
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
      return { id: quotationId };
    }),

  update: authedQuery
    .input(z.object({
      id: z.number(),
      quoteNumber: z.string().optional(),
      contactId: z.number().optional(),
      quoteDate: z.string().optional(),
      validUntil: z.string().optional(),
      notes: z.string().optional(),
      terms: z.string().optional(),
      currency: z.string().optional(),
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
      if (updateData.quoteDate) updateFields.quoteDate = new Date(updateData.quoteDate);
      if (updateData.validUntil) updateFields.validUntil = new Date(updateData.validUntil);

      if (items && items.length > 0) {
        const subTotal = items.reduce((s, i) => s + parseFloat(i.amount), 0);
        const taxTotal = items.reduce((s, i) => s + parseFloat(i.taxAmount || "0"), 0);
        const discountTotal = items.reduce((s, i) => s + parseFloat(i.discount || "0"), 0);
        const total = subTotal + taxTotal - discountTotal;

        updateFields.subTotal = subTotal.toFixed(2);
        updateFields.taxTotal = taxTotal.toFixed(2);
        updateFields.total = total.toFixed(2);

        await db.delete(quotationItems).where(eq(quotationItems.quotationId, id));
        await db.insert(quotationItems).values(items.map((item) => ({
          quotationId: id,
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

      await db.update(quotations).set(updateFields).where(and(eq(quotations.id, id), eq(quotations.userId, ctx.user.id)));
      return { success: true };
    }),

  updateStatus: authedQuery
    .input(z.object({ id: z.number(), status: z.enum(["draft", "sent", "accepted", "rejected", "expired", "converted"]) }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      await db.update(quotations).set({ status: input.status }).where(and(eq(quotations.id, input.id), eq(quotations.userId, ctx.user.id)));
      return { success: true };
    }),

  convertToInvoice: authedQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const quoteRows = await db.select().from(quotations)
        .where(and(eq(quotations.id, input.id), eq(quotations.userId, ctx.user.id)));
      if (!quoteRows[0]) throw new Error("Quotation not found");
      const quote = quoteRows[0];

      const invResult = await db.insert(invoices).values({
        userId: ctx.user.id,
        invoiceNumber: `INV-${Date.now()}`,
        contactId: quote.contactId,
        issueDate: quote.quoteDate,
        dueDate: new Date(),
        status: "draft",
        subTotal: quote.subTotal,
        taxTotal: quote.taxTotal,
        total: quote.total,
        amountPaid: "0.00",
        amountDue: quote.total,
        currency: quote.currency,
        notes: quote.notes,
        terms: quote.terms,
      });
      const invoiceId = Number(invResult[0].insertId);

      const quoteItems = await db.select().from(quotationItems).where(eq(quotationItems.quotationId, input.id));
      if (quoteItems.length > 0) {
        await db.insert(invoiceItems).values(quoteItems.map((item) => ({
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

      await db.update(quotations).set({ status: "converted", convertedInvoiceId: invoiceId }).where(eq(quotations.id, input.id));
      return { invoiceId };
    }),

  delete: authedQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      await db.delete(quotationItems).where(eq(quotationItems.quotationId, input.id));
      await db.delete(quotations).where(and(eq(quotations.id, input.id), eq(quotations.userId, ctx.user.id)));
      return { success: true };
    }),

  nextNumber: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    const result = await db
      .select({ maxNum: sql<number>`COALESCE(MAX(CAST(SUBSTRING(${quotations.quoteNumber}, 4) AS UNSIGNED)), 0)` })
      .from(quotations).where(eq(quotations.userId, ctx.user.id));
    return `QUO-${String((result[0]?.maxNum ?? 0) + 1).padStart(4, "0")}`;
  }),
});
