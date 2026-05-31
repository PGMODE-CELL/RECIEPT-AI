import { z } from "zod";
import { eq, and, desc } from "drizzle-orm";
import { createRouter, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { fiscalPeriods } from "@db/schema";

export const fiscalPeriodRouter = createRouter({
  list: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    return db.select().from(fiscalPeriods).where(eq(fiscalPeriods.userId, ctx.user.id)).orderBy(desc(fiscalPeriods.startDate));
  }),

  getById: authedQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = getDb();
      const rows = await db.select().from(fiscalPeriods)
        .where(and(eq(fiscalPeriods.id, input.id), eq(fiscalPeriods.userId, ctx.user.id)));
      return rows[0] ?? null;
    }),

  create: authedQuery
    .input(z.object({
      name: z.string().min(1),
      startDate: z.string(),
      endDate: z.string(),
      status: z.enum(["future", "open", "closed"]).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const result = await db.insert(fiscalPeriods).values({
        ...input,
        userId: ctx.user.id,
        startDate: new Date(input.startDate),
        endDate: new Date(input.endDate),
      });
      return { id: Number(result[0].insertId) };
    }),

  update: authedQuery
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      status: z.enum(["future", "open", "closed"]).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const { id, ...data } = input;
      const updateData: any = { ...data };
      if (data.startDate) updateData.startDate = new Date(data.startDate);
      if (data.endDate) updateData.endDate = new Date(data.endDate);
      await db.update(fiscalPeriods).set(updateData)
        .where(and(eq(fiscalPeriods.id, id), eq(fiscalPeriods.userId, ctx.user.id)));
      return { success: true };
    }),

  delete: authedQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      await db.delete(fiscalPeriods).where(and(eq(fiscalPeriods.id, input.id), eq(fiscalPeriods.userId, ctx.user.id)));
      return { success: true };
    }),

  closePeriod: authedQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      await db.update(fiscalPeriods).set({ status: "closed" })
        .where(and(eq(fiscalPeriods.id, input.id), eq(fiscalPeriods.userId, ctx.user.id)));
      return { success: true };
    }),
});
