import { z } from "zod";
import { eq, and, desc, sql } from "drizzle-orm";
import { createRouter, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { inventoryValuations } from "@db/schema";

export const inventoryValuationRouter = createRouter({
  list: authedQuery
    .input(z.object({ productId: z.number().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const db = getDb();
      const conditions = [eq(inventoryValuations.userId, ctx.user.id)];
      if (input?.productId) conditions.push(eq(inventoryValuations.productId, input.productId));
      return db.select().from(inventoryValuations).where(and(...conditions)).orderBy(desc(inventoryValuations.updatedAt));
    }),

  getById: authedQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = getDb();
      const rows = await db.select().from(inventoryValuations)
        .where(and(eq(inventoryValuations.id, input.id), eq(inventoryValuations.userId, ctx.user.id)));
      return rows[0] ?? null;
    }),

  create: authedQuery
    .input(z.object({
      productId: z.number(),
      method: z.enum(["fifo", "lifo", "weighted_average"]).optional(),
      quantity: z.string().optional(),
      unitCost: z.string().optional(),
      totalValue: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const result = await db.insert(inventoryValuations).values({ ...input, userId: ctx.user.id });
      return { id: Number(result[0].insertId) };
    }),

  update: authedQuery
    .input(z.object({
      id: z.number(),
      method: z.enum(["fifo", "lifo", "weighted_average"]).optional(),
      quantity: z.string().optional(),
      unitCost: z.string().optional(),
      totalValue: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const { id, ...data } = input;
      await db.update(inventoryValuations).set({ ...data, updatedAt: new Date() })
        .where(and(eq(inventoryValuations.id, id), eq(inventoryValuations.userId, ctx.user.id)));
      return { success: true };
    }),

  delete: authedQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      await db.delete(inventoryValuations).where(and(eq(inventoryValuations.id, input.id), eq(inventoryValuations.userId, ctx.user.id)));
      return { success: true };
    }),

  calculateValues: authedQuery
    .input(z.object({ productId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = getDb();
      const rows = await db.select().from(inventoryValuations)
        .where(and(eq(inventoryValuations.productId, input.productId), eq(inventoryValuations.userId, ctx.user.id)));
      let totalQty = 0;
      let totalVal = 0;
      for (const row of rows) {
        totalQty += parseFloat(row.quantity || "0");
        totalVal += parseFloat(row.totalValue || "0");
      }
      return {
        totalQuantity: totalQty.toFixed(2),
        totalValue: totalVal.toFixed(2),
        averageCost: totalQty > 0 ? (totalVal / totalQty).toFixed(2) : "0.00",
      };
    }),
});
