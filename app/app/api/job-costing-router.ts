import { z } from "zod";
import { eq, and, desc, sql } from "drizzle-orm";
import { createRouter, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { jobs } from "@db/schema";

export const jobCostingRouter = createRouter({
  list: authedQuery
    .input(z.object({ status: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const db = getDb();
      const conditions = [eq(jobs.userId, ctx.user.id)];
      if (input?.status) conditions.push(eq(jobs.status, input.status as any));
      return db.select().from(jobs).where(and(...conditions)).orderBy(desc(jobs.createdAt));
    }),

  getById: authedQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = getDb();
      const rows = await db.select().from(jobs)
        .where(and(eq(jobs.id, input.id), eq(jobs.userId, ctx.user.id)));
      return rows[0] ?? null;
    }),

  create: authedQuery
    .input(z.object({
      name: z.string().min(1),
      projectId: z.number().optional(),
      code: z.string().optional(),
      estimatedCost: z.string().optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const result = await db.insert(jobs).values({
        ...input,
        userId: ctx.user.id,
        startDate: input.startDate ? new Date(input.startDate) : undefined,
        endDate: input.endDate ? new Date(input.endDate) : undefined,
      });
      return { id: Number(result[0].insertId) };
    }),

  update: authedQuery
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      estimatedCost: z.string().optional(),
      actualCost: z.string().optional(),
      status: z.enum(["open", "in_progress", "completed", "closed"]).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const { id, ...data } = input;
      await db.update(jobs).set(data)
        .where(and(eq(jobs.id, id), eq(jobs.userId, ctx.user.id)));
      return { success: true };
    }),

  delete: authedQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      await db.delete(jobs).where(and(eq(jobs.id, input.id), eq(jobs.userId, ctx.user.id)));
      return { success: true };
    }),

  calculateWip: authedQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const rows = await db.select().from(jobs)
        .where(and(eq(jobs.id, input.id), eq(jobs.userId, ctx.user.id)));
      if (!rows[0]) throw new Error("Job not found");
      const job = rows[0];
      const estimated = parseFloat(job.estimatedCost || "0");
      const actual = parseFloat(job.actualCost || "0");
      const wip = estimated > 0 ? ((actual / estimated) * 100).toFixed(2) : "0.00";
      await db.update(jobs).set({ wipAmount: wip }).where(eq(jobs.id, input.id));
      return { wipPercentage: wip };
    }),

  addCostEntry: authedQuery
    .input(z.object({ id: z.number(), cost: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const rows = await db.select().from(jobs)
        .where(and(eq(jobs.id, input.id), eq(jobs.userId, ctx.user.id)));
      if (!rows[0]) throw new Error("Job not found");
      const current = parseFloat(rows[0].actualCost || "0");
      const added = parseFloat(input.cost);
      const newTotal = (current + added).toFixed(2);
      await db.update(jobs).set({ actualCost: newTotal }).where(eq(jobs.id, input.id));
      return { actualCost: newTotal };
    }),
});
