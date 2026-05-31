import { z } from "zod";
import { eq, and, desc } from "drizzle-orm";
import { createRouter, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { projects, tasks } from "@db/schema";

export const projectRouter = createRouter({
  list: authedQuery
    .input(z.object({ status: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const db = getDb();
      if (input?.status) {
        return db.select().from(projects)
          .where(and(eq(projects.userId, ctx.user.id), eq(projects.status, input.status as any)))
          .orderBy(desc(projects.createdAt));
      }
      return db.select().from(projects).where(eq(projects.userId, ctx.user.id)).orderBy(desc(projects.createdAt));
    }),

  getById: authedQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = getDb();
      const projRows = await db.select().from(projects)
        .where(and(eq(projects.id, input.id), eq(projects.userId, ctx.user.id)));
      if (!projRows[0]) return null;
      const taskList = await db.select().from(tasks).where(eq(tasks.projectId, input.id));
      return { ...projRows[0], tasks: taskList };
    }),

  create: authedQuery
    .input(z.object({
      name: z.string().min(1),
      description: z.string().optional(),
      status: z.enum(["active", "completed", "on_hold", "cancelled"]).default("active"),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      budget: z.string().optional(),
      contactId: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const result = await db.insert(projects).values({
        ...input,
        userId: ctx.user.id,
        startDate: input.startDate ? new Date(input.startDate) : null,
        endDate: input.endDate ? new Date(input.endDate) : null,
        budget: input.budget || "0.00",
      });
      return { id: Number(result[0].insertId) };
    }),

  update: authedQuery
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      description: z.string().optional(),
      status: z.enum(["active", "completed", "on_hold", "cancelled"]).optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      budget: z.string().optional(),
      actualCost: z.string().optional(),
      contactId: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const { id, ...data } = input;
      const updateData: any = { ...data };
      if (data.startDate) updateData.startDate = new Date(data.startDate);
      if (data.endDate) updateData.endDate = new Date(data.endDate);
      await db.update(projects).set(updateData)
        .where(and(eq(projects.id, id), eq(projects.userId, ctx.user.id)));
      return { success: true };
    }),

  delete: authedQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      await db.delete(tasks).where(eq(tasks.projectId, input.id));
      await db.delete(projects).where(and(eq(projects.id, input.id), eq(projects.userId, ctx.user.id)));
      return { success: true };
    }),

  createTask: authedQuery
    .input(z.object({
      projectId: z.number(),
      title: z.string().min(1),
      description: z.string().optional(),
      status: z.enum(["todo", "in_progress", "review", "done"]).default("todo"),
      priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
      dueDate: z.string().optional(),
      estimatedHours: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const result = await db.insert(tasks).values({
        ...input,
        userId: ctx.user.id,
        dueDate: input.dueDate ? new Date(input.dueDate) : null,
      });
      return { id: Number(result[0].insertId) };
    }),

  updateTask: authedQuery
    .input(z.object({
      id: z.number(),
      title: z.string().optional(),
      description: z.string().optional(),
      status: z.enum(["todo", "in_progress", "review", "done"]).optional(),
      priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
      dueDate: z.string().optional(),
      estimatedHours: z.string().optional(),
      actualHours: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const { id, ...data } = input;
      const updateData: any = { ...data };
      if (data.dueDate) updateData.dueDate = new Date(data.dueDate);
      await db.update(tasks).set(updateData).where(and(eq(tasks.id, id), eq(tasks.userId, ctx.user.id)));
      return { success: true };
    }),

  deleteTask: authedQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      await db.delete(tasks).where(and(eq(tasks.id, input.id), eq(tasks.userId, ctx.user.id)));
      return { success: true };
    }),
});
