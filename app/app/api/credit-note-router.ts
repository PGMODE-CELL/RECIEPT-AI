import { z } from "zod";
import { eq, and, desc, sql, like } from "drizzle-orm";
import { createRouter, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { creditNotes, creditNoteItems, contacts } from "@db/schema";

export const creditNoteRouter = createRouter({
  list: authedQuery
    .input(z.object({
      status: z.string().optional(),
      search: z.string().optional(),
      page: z.number().optional().default(1),
      limit: z.number().optional().default(50),
    }).optional())
    .query(async ({ ctx, input }) => {
      const db = getDb();
      const conditions = [eq(creditNotes.userId, ctx.user.id)];
      if (input?.status) conditions.push(eq(creditNotes.status, input.status as any));
      if (input?.search) conditions.push(like(creditNotes.creditNoteNumber, `%${input.search}%`));

      const page = input?.page || 1;
      const limit = input?.limit || 50;
      const offset = (page - 1) * limit;

      const [countResult] = await db.select({ count: sql<number>`COUNT(*)` }).from(creditNotes).where(and(...conditions));
      const total = countResult?.count || 0;

      const rows = await db
        .select({
          id: creditNotes.id,
          creditNoteNumber: creditNotes.creditNoteNumber,
          contactId: creditNotes.contactId,
          contactName: contacts.name,
          invoiceId: creditNotes.invoiceId,
          issueDate: creditNotes.issueDate,
          status: creditNotes.status,
          subTotal: creditNotes.subTotal,
          taxTotal: creditNotes.taxTotal,
          total: creditNotes.total,
          amountApplied: creditNotes.amountApplied,
          currency: creditNotes.currency,
          createdAt: creditNotes.createdAt,
        })
        .from(creditNotes)
        .leftJoin(contacts, eq(creditNotes.contactId, contacts.id))
        .where(and(...conditions))
        .orderBy(desc(creditNotes.createdAt))
        .limit(limit)
        .offset(offset);

      return { creditNotes: rows, total, page, limit };
    }),

  getById: authedQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = getDb();
      const cnRows = await db
        .select({
          id: creditNotes.id,
          creditNoteNumber: creditNotes.creditNoteNumber,
          contactId: creditNotes.contactId,
          contactName: contacts.name,
          contactEmail: contacts.email,
          contactAddress: contacts.address,
          invoiceId: creditNotes.invoiceId,
          issueDate: creditNotes.issueDate,
          status: creditNotes.status,
          subTotal: creditNotes.subTotal,
          taxTotal: creditNotes.taxTotal,
          total: creditNotes.total,
          amountApplied: creditNotes.amountApplied,
          reason: creditNotes.reason,
          currency: creditNotes.currency,
          createdAt: creditNotes.createdAt,
        })
        .from(creditNotes)
        .leftJoin(contacts, eq(creditNotes.contactId, contacts.id))
        .where(and(eq(creditNotes.id, input.id), eq(creditNotes.userId, ctx.user.id)));
      if (!cnRows[0]) return null;
      const items = await db.select().from(creditNoteItems).where(eq(creditNoteItems.creditNoteId, input.id));
      return { ...cnRows[0], items };
    }),

  create: authedQuery
    .input(z.object({
      creditNoteNumber: z.string().min(1),
      contactId: z.number(),
      invoiceId: z.number().optional(),
      issueDate: z.string(),
      reason: z.string().optional(),
      currency: z.string().default("USD"),
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
      const { items, ...cnData } = input;
      const subTotal = items.reduce((s, i) => s + parseFloat(i.amount), 0);
      const taxTotal = items.reduce((s, i) => s + parseFloat(i.taxRate || "0") * parseFloat(i.quantity) * parseFloat(i.unitPrice) / 100, 0);
      const total = subTotal + taxTotal;

      const result = await db.insert(creditNotes).values({
        ...cnData,
        userId: ctx.user.id,
        issueDate: new Date(cnData.issueDate),
        subTotal: subTotal.toFixed(2),
        taxTotal: taxTotal.toFixed(2),
        total: total.toFixed(2),
        amountApplied: "0.00",
        status: "draft",
      });
      const creditNoteId = Number(result[0].insertId);

      if (items.length > 0) {
        await db.insert(creditNoteItems).values(items.map((item) => ({
          creditNoteId,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          taxRate: item.taxRate || "0.00",
          amount: item.amount,
        })));
      }
      return { id: creditNoteId };
    }),

  update: authedQuery
    .input(z.object({
      id: z.number(),
      creditNoteNumber: z.string().optional(),
      contactId: z.number().optional(),
      invoiceId: z.number().optional(),
      issueDate: z.string().optional(),
      reason: z.string().optional(),
      currency: z.string().optional(),
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
      if (updateData.issueDate) updateFields.issueDate = new Date(updateData.issueDate);

      if (items && items.length > 0) {
        const subTotal = items.reduce((s, i) => s + parseFloat(i.amount), 0);
        const taxTotal = items.reduce((s, i) => s + parseFloat(i.taxRate || "0") * parseFloat(i.quantity) * parseFloat(i.unitPrice) / 100, 0);
        const total = subTotal + taxTotal;

        updateFields.subTotal = subTotal.toFixed(2);
        updateFields.taxTotal = taxTotal.toFixed(2);
        updateFields.total = total.toFixed(2);

        await db.delete(creditNoteItems).where(eq(creditNoteItems.creditNoteId, id));
        await db.insert(creditNoteItems).values(items.map((item) => ({
          creditNoteId: id,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          taxRate: item.taxRate || "0.00",
          amount: item.amount,
        })));
      }

      await db.update(creditNotes).set(updateFields).where(and(eq(creditNotes.id, id), eq(creditNotes.userId, ctx.user.id)));
      return { success: true };
    }),

  delete: authedQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      await db.delete(creditNoteItems).where(eq(creditNoteItems.creditNoteId, input.id));
      await db.delete(creditNotes).where(and(eq(creditNotes.id, input.id), eq(creditNotes.userId, ctx.user.id)));
      return { success: true };
    }),

  nextNumber: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    const result = await db
      .select({ maxNum: sql<number>`COALESCE(MAX(CAST(SUBSTRING(${creditNotes.creditNoteNumber}, 4) AS UNSIGNED)), 0)` })
      .from(creditNotes).where(eq(creditNotes.userId, ctx.user.id));
    return `CN-${String((result[0]?.maxNum ?? 0) + 1).padStart(4, "0")}`;
  }),
});
