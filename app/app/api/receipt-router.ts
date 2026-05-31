import { z } from "zod";
import { eq, and, desc } from "drizzle-orm";
import { createRouter, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { receipts } from "@db/schema";

export const receiptRouter = createRouter({
  list: authedQuery
    .input(z.object({ status: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const db = getDb();
      if (input?.status) {
        return db.select().from(receipts)
          .where(and(eq(receipts.userId, ctx.user.id), eq(receipts.status, input.status as any)))
          .orderBy(desc(receipts.createdAt));
      }
      return db.select().from(receipts).where(eq(receipts.userId, ctx.user.id)).orderBy(desc(receipts.createdAt));
    }),

  getById: authedQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = getDb();
      const rows = await db.select().from(receipts)
        .where(and(eq(receipts.id, input.id), eq(receipts.userId, ctx.user.id)));
      return rows[0] ?? null;
    }),

  create: authedQuery
    .input(z.object({
      fileName: z.string(),
      fileUrl: z.string(),
      vendorName: z.string().optional(),
      receiptDate: z.string().optional(),
      totalAmount: z.string().optional(),
      taxAmount: z.string().optional(),
      currency: z.string().default("USD"),
      category: z.string().optional(),
      paymentMethod: z.string().optional(),
      items: z.any().optional(),
      ocrText: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const result = await db.insert(receipts).values({
        ...input,
        userId: ctx.user.id,
        receiptDate: input.receiptDate ? new Date(input.receiptDate) : null,
        status: "pending",
      });
      return { id: Number(result[0].insertId) };
    }),

  update: authedQuery
    .input(z.object({
      id: z.number(),
      vendorName: z.string().optional(),
      receiptDate: z.string().optional(),
      totalAmount: z.string().optional(),
      taxAmount: z.string().optional(),
      category: z.string().optional(),
      paymentMethod: z.string().optional(),
      notes: z.string().optional(),
      status: z.enum(["pending", "processed", "error"]).optional(),
      processedToBill: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const { id, ...data } = input;
      const updateData: any = { ...data };
      if (data.receiptDate) updateData.receiptDate = new Date(data.receiptDate);
      await db.update(receipts).set(updateData)
        .where(and(eq(receipts.id, id), eq(receipts.userId, ctx.user.id)));
      return { success: true };
    }),

  delete: authedQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      await db.delete(receipts).where(and(eq(receipts.id, input.id), eq(receipts.userId, ctx.user.id)));
      return { success: true };
    }),
});
