import { z } from "zod";
import { eq, and, desc } from "drizzle-orm";
import { createRouter, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { inventoryLots } from "@db/schema";

export const inventoryLotRouter = createRouter({
  list: authedQuery
    .input(z.object({ productId: z.number().optional(), status: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const db = getDb();
      const conditions = [eq(inventoryLots.userId, ctx.user.id)];
      if (input?.productId) conditions.push(eq(inventoryLots.productId, input.productId));
      if (input?.status) conditions.push(eq(inventoryLots.status, input.status as any));
      return db.select().from(inventoryLots).where(and(...conditions)).orderBy(desc(inventoryLots.createdAt));
    }),

  getById: authedQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = getDb();
      const rows = await db.select().from(inventoryLots)
        .where(and(eq(inventoryLots.id, input.id), eq(inventoryLots.userId, ctx.user.id)));
      return rows[0] ?? null;
    }),

  create: authedQuery
    .input(z.object({
      productId: z.number(),
      lotNumber: z.string().min(1),
      serialNumber: z.string().optional(),
      quantity: z.string().optional(),
      unitCost: z.string().optional(),
      manufacturingDate: z.string().optional(),
      expiryDate: z.string().optional(),
      location: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const result = await db.insert(inventoryLots).values({
        ...input,
        userId: ctx.user.id,
        manufacturingDate: input.manufacturingDate ? new Date(input.manufacturingDate) : undefined,
        expiryDate: input.expiryDate ? new Date(input.expiryDate) : undefined,
      });
      return { id: Number(result[0].insertId) };
    }),

  update: authedQuery
    .input(z.object({
      id: z.number(),
      serialNumber: z.string().optional(),
      quantity: z.string().optional(),
      unitCost: z.string().optional(),
      status: z.enum(["available", "reserved", "sold", "expired"]).optional(),
      location: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const { id, ...data } = input;
      await db.update(inventoryLots).set(data)
        .where(and(eq(inventoryLots.id, id), eq(inventoryLots.userId, ctx.user.id)));
      return { success: true };
    }),

  delete: authedQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      await db.delete(inventoryLots).where(and(eq(inventoryLots.id, input.id), eq(inventoryLots.userId, ctx.user.id)));
      return { success: true };
    }),

  batchUpdate: authedQuery
    .input(z.object({
      ids: z.array(z.number()),
      status: z.enum(["available", "reserved", "sold", "expired"]),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      for (const id of input.ids) {
        await db.update(inventoryLots).set({ status: input.status })
          .where(and(eq(inventoryLots.id, id), eq(inventoryLots.userId, ctx.user.id)));
      }
      return { success: true, updated: input.ids.length };
    }),
});
