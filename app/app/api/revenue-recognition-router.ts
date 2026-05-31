import { z } from "zod";
import { eq, and, desc, sql } from "drizzle-orm";
import { createRouter, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { revenueSchedules } from "@db/schema";

export const revenueRecognitionRouter = createRouter({
  list: authedQuery
    .input(z.object({ status: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const db = getDb();
      const conditions = [eq(revenueSchedules.userId, ctx.user.id)];
      if (input?.status) conditions.push(eq(revenueSchedules.status, input.status as any));
      return db.select().from(revenueSchedules).where(and(...conditions)).orderBy(desc(revenueSchedules.createdAt));
    }),

  getById: authedQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = getDb();
      const rows = await db.select().from(revenueSchedules)
        .where(and(eq(revenueSchedules.id, input.id), eq(revenueSchedules.userId, ctx.user.id)));
      return rows[0] ?? null;
    }),

  create: authedQuery
    .input(z.object({
      invoiceId: z.number().optional(),
      contactId: z.number(),
      totalAmount: z.string(),
      method: z.enum(["straight_line", "percentage_completion", "milestone", "custom"]).optional(),
      startDate: z.string(),
      endDate: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const result = await db.insert(revenueSchedules).values({
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
      totalAmount: z.string().optional(),
      method: z.enum(["straight_line", "percentage_completion", "milestone", "custom"]).optional(),
      status: z.enum(["active", "completed", "cancelled"]).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const { id, ...data } = input;
      await db.update(revenueSchedules).set(data)
        .where(and(eq(revenueSchedules.id, id), eq(revenueSchedules.userId, ctx.user.id)));
      return { success: true };
    }),

  delete: authedQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      await db.delete(revenueSchedules).where(and(eq(revenueSchedules.id, input.id), eq(revenueSchedules.userId, ctx.user.id)));
      return { success: true };
    }),

  recognizeRevenue: authedQuery
    .input(z.object({ id: z.number(), amount: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const rows = await db.select().from(revenueSchedules)
        .where(and(eq(revenueSchedules.id, input.id), eq(revenueSchedules.userId, ctx.user.id)));
      if (!rows[0]) throw new Error("Schedule not found");
      const schedule = rows[0];
      const current = parseFloat(schedule.recognized || "0");
      const recognize = parseFloat(input.amount);
      const total = parseFloat(schedule.totalAmount);
      const newRecognized = Math.min(current + recognize, total);
      await db.update(revenueSchedules).set({
        recognized: newRecognized.toFixed(2),
        status: newRecognized >= total ? "completed" : "active",
      }).where(eq(revenueSchedules.id, input.id));
      return { recognized: newRecognized.toFixed(2) };
    }),
});
