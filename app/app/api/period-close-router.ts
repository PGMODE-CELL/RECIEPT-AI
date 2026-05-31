import { z } from "zod";
import { eq, and, desc } from "drizzle-orm";
import { createRouter, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { periodCloses } from "@db/schema";

export const periodCloseRouter = createRouter({
  list: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    return db.select().from(periodCloses).where(eq(periodCloses.userId, ctx.user.id)).orderBy(desc(periodCloses.createdAt));
  }),

  getById: authedQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = getDb();
      const rows = await db.select().from(periodCloses)
        .where(and(eq(periodCloses.id, input.id), eq(periodCloses.userId, ctx.user.id)));
      return rows[0] ?? null;
    }),

  create: authedQuery
    .input(z.object({
      periodStart: z.string(),
      periodEnd: z.string(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const result = await db.insert(periodCloses).values({
        ...input,
        userId: ctx.user.id,
        periodStart: new Date(input.periodStart),
        periodEnd: new Date(input.periodEnd),
      });
      return { id: Number(result[0].insertId) };
    }),

  update: authedQuery
    .input(z.object({
      id: z.number(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const { id, ...data } = input;
      await db.update(periodCloses).set(data)
        .where(and(eq(periodCloses.id, id), eq(periodCloses.userId, ctx.user.id)));
      return { success: true };
    }),

  delete: authedQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      await db.delete(periodCloses).where(and(eq(periodCloses.id, input.id), eq(periodCloses.userId, ctx.user.id)));
      return { success: true };
    }),

  closePeriod: authedQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      await db.update(periodCloses).set({
        status: "closed",
        closedBy: ctx.user.id,
        closedAt: new Date(),
      }).where(and(eq(periodCloses.id, input.id), eq(periodCloses.userId, ctx.user.id)));
      return { success: true };
    }),

  reopenPeriod: authedQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      await db.update(periodCloses).set({
        status: "reopened",
        closedBy: null,
        closedAt: null,
      }).where(and(eq(periodCloses.id, input.id), eq(periodCloses.userId, ctx.user.id)));
      return { success: true };
    }),
});
