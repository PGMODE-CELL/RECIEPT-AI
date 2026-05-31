import { z } from "zod";
import { eq, and, like } from "drizzle-orm";
import { createRouter, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { products } from "@db/schema";

export const productRouter = createRouter({
  list: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    return db.select().from(products).where(eq(products.userId, ctx.user.id)).orderBy(products.name);
  }),

  search: authedQuery
    .input(z.object({ q: z.string() }))
    .query(async ({ ctx, input }) => {
      const db = getDb();
      return db
        .select()
        .from(products)
        .where(and(eq(products.userId, ctx.user.id), like(products.name, `%${input.q}%`)))
        .limit(20);
    }),

  getById: authedQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = getDb();
      const rows = await db.select().from(products).where(and(eq(products.id, input.id), eq(products.userId, ctx.user.id)));
      return rows[0] ?? null;
    }),

  create: authedQuery
    .input(z.object({
      sku: z.string().optional(),
      name: z.string().min(1),
      description: z.string().optional(),
      type: z.enum(["product", "service"]).default("product"),
      category: z.string().optional(),
      unit: z.string().default("pcs"),
      costPrice: z.string().default("0.00"),
      salePrice: z.string().default("0.00"),
      taxRate: z.string().default("0.00"),
      quantityOnHand: z.string().default("0.00"),
      reorderLevel: z.string().default("0.00"),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const result = await db.insert(products).values({ ...input, userId: ctx.user.id });
      return { id: Number(result[0].insertId) };
    }),

  update: authedQuery
    .input(z.object({
      id: z.number(),
      sku: z.string().optional(),
      name: z.string().optional(),
      description: z.string().optional(),
      type: z.enum(["product", "service"]).optional(),
      category: z.string().optional(),
      unit: z.string().optional(),
      costPrice: z.string().optional(),
      salePrice: z.string().optional(),
      taxRate: z.string().optional(),
      quantityOnHand: z.string().optional(),
      reorderLevel: z.string().optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const { id, ...data } = input;
      await db.update(products).set(data).where(and(eq(products.id, id), eq(products.userId, ctx.user.id)));
      return { success: true };
    }),

  delete: authedQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      await db.delete(products).where(and(eq(products.id, input.id), eq(products.userId, ctx.user.id)));
      return { success: true };
    }),
});
