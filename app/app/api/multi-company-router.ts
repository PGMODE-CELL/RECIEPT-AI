import { z } from "zod";
import { eq, and, desc, sql } from "drizzle-orm";
import { createRouter, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { companyEntities } from "@db/schema";

export const multiCompanyRouter = createRouter({
  list: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    return db.select().from(companyEntities).where(eq(companyEntities.userId, ctx.user.id)).orderBy(desc(companyEntities.createdAt));
  }),

  getById: authedQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = getDb();
      const rows = await db.select().from(companyEntities)
        .where(and(eq(companyEntities.id, input.id), eq(companyEntities.userId, ctx.user.id)));
      return rows[0] ?? null;
    }),

  create: authedQuery
    .input(z.object({
      name: z.string().min(1),
      code: z.string().min(1),
      currency: z.string().length(3).optional(),
      parentId: z.number().optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const result = await db.insert(companyEntities).values({ ...input, userId: ctx.user.id });
      return { id: Number(result[0].insertId) };
    }),

  update: authedQuery
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      code: z.string().optional(),
      currency: z.string().length(3).optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const { id, ...data } = input;
      await db.update(companyEntities).set(data)
        .where(and(eq(companyEntities.id, id), eq(companyEntities.userId, ctx.user.id)));
      return { success: true };
    }),

  delete: authedQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      await db.delete(companyEntities).where(and(eq(companyEntities.id, input.id), eq(companyEntities.userId, ctx.user.id)));
      return { success: true };
    }),

  switchActive: authedQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      await db.update(companyEntities).set({ isActive: false })
        .where(eq(companyEntities.userId, ctx.user.id));
      await db.update(companyEntities).set({ isActive: true })
        .where(and(eq(companyEntities.id, input.id), eq(companyEntities.userId, ctx.user.id)));
      return { success: true };
    }),
});
