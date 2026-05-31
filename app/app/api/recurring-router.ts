import { z } from "zod";
import { eq, and, desc, sql } from "drizzle-orm";
import { createRouter, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { recurringTemplates } from "@db/schema";

export const recurringRouter = createRouter({
  list: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    return db.select().from(recurringTemplates)
      .where(eq(recurringTemplates.userId, ctx.user.id))
      .orderBy(desc(recurringTemplates.createdAt));
  }),

  getById: authedQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = getDb();
      const rows = await db.select().from(recurringTemplates)
        .where(and(eq(recurringTemplates.id, input.id), eq(recurringTemplates.userId, ctx.user.id)));
      return rows[0] ?? null;
    }),

  create: authedQuery
    .input(z.object({
      type: z.enum(["invoice", "bill"]),
      name: z.string().min(1),
      contactId: z.number(),
      frequency: z.enum(["weekly", "biweekly", "monthly", "quarterly", "yearly"]).default("monthly"),
      nextDate: z.string(),
      endDate: z.string().optional(),
      totalAmount: z.string().optional(),
      templateData: z.any().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const result = await db.insert(recurringTemplates).values({
        ...input,
        userId: ctx.user.id,
        nextDate: new Date(input.nextDate),
        endDate: input.endDate ? new Date(input.endDate) : null,
      });
      return { id: Number(result[0].insertId) };
    }),

  update: authedQuery
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      frequency: z.enum(["weekly", "biweekly", "monthly", "quarterly", "yearly"]).optional(),
      nextDate: z.string().optional(),
      endDate: z.string().optional(),
      status: z.enum(["active", "paused", "completed"]).optional(),
      totalAmount: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const { id, ...data } = input;
      const updateData: any = { ...data };
      if (data.nextDate) updateData.nextDate = new Date(data.nextDate);
      if (data.endDate) updateData.endDate = new Date(data.endDate);
      await db.update(recurringTemplates).set(updateData)
        .where(and(eq(recurringTemplates.id, id), eq(recurringTemplates.userId, ctx.user.id)));
      return { success: true };
    }),

  delete: authedQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      await db.delete(recurringTemplates).where(and(eq(recurringTemplates.id, input.id), eq(recurringTemplates.userId, ctx.user.id)));
      return { success: true };
    }),

  getSummary: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    const active = await db.select({ count: sql`COUNT(*)` }).from(recurringTemplates)
      .where(and(eq(recurringTemplates.userId, ctx.user.id), eq(recurringTemplates.status, "active")));
    return { activeCount: Number(active[0]?.count || 0) };
  }),
});
