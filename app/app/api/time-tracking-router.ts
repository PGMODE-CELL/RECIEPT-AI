import { z } from "zod";
import { eq, and, desc, sql } from "drizzle-orm";
import { createRouter, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { timeEntries, projects, tasks } from "@db/schema";

export const timeTrackingRouter = createRouter({
  list: authedQuery
    .input(z.object({
      projectId: z.number().optional(),
      taskId: z.number().optional(),
      page: z.number().optional().default(1),
      limit: z.number().optional().default(50),
    }).optional())
    .query(async ({ ctx, input }) => {
      const db = getDb();
      const conditions = [eq(timeEntries.userId, ctx.user.id)];
      if (input?.projectId) conditions.push(eq(timeEntries.projectId, input.projectId));
      if (input?.taskId) conditions.push(eq(timeEntries.taskId, input.taskId));

      const page = input?.page || 1;
      const limit = input?.limit || 50;
      const offset = (page - 1) * limit;

      const [countResult] = await db.select({ count: sql<number>`COUNT(*)` }).from(timeEntries).where(and(...conditions));
      const total = countResult?.count || 0;

      const rows = await db
        .select({
          id: timeEntries.id,
          projectId: timeEntries.projectId,
          projectName: projects.name,
          taskId: timeEntries.taskId,
          taskTitle: tasks.title,
          description: timeEntries.description,
          date: timeEntries.date,
          startTime: timeEntries.startTime,
          endTime: timeEntries.endTime,
          hours: timeEntries.hours,
          rate: timeEntries.rate,
          isBillable: timeEntries.isBillable,
          isBilled: timeEntries.isBilled,
          invoiceId: timeEntries.invoiceId,
          createdAt: timeEntries.createdAt,
        })
        .from(timeEntries)
        .leftJoin(projects, eq(timeEntries.projectId, projects.id))
        .leftJoin(tasks, eq(timeEntries.taskId, tasks.id))
        .where(and(...conditions))
        .orderBy(desc(timeEntries.createdAt))
        .limit(limit)
        .offset(offset);

      return { timeEntries: rows, total, page, limit };
    }),

  getById: authedQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = getDb();
      const rows = await db
        .select({
          id: timeEntries.id,
          projectId: timeEntries.projectId,
          projectName: projects.name,
          taskId: timeEntries.taskId,
          taskTitle: tasks.title,
          contactId: timeEntries.contactId,
          description: timeEntries.description,
          date: timeEntries.date,
          startTime: timeEntries.startTime,
          endTime: timeEntries.endTime,
          hours: timeEntries.hours,
          rate: timeEntries.rate,
          isBillable: timeEntries.isBillable,
          isBilled: timeEntries.isBilled,
          invoiceId: timeEntries.invoiceId,
          createdAt: timeEntries.createdAt,
        })
        .from(timeEntries)
        .leftJoin(projects, eq(timeEntries.projectId, projects.id))
        .leftJoin(tasks, eq(timeEntries.taskId, tasks.id))
        .where(and(eq(timeEntries.id, input.id), eq(timeEntries.userId, ctx.user.id)));
      return rows[0] ?? null;
    }),

  create: authedQuery
    .input(z.object({
      projectId: z.number().optional(),
      taskId: z.number().optional(),
      contactId: z.number().optional(),
      description: z.string().optional(),
      date: z.string(),
      startTime: z.string().optional(),
      endTime: z.string().optional(),
      hours: z.string(),
      rate: z.string().optional(),
      isBillable: z.boolean().default(true),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const result = await db.insert(timeEntries).values({
        ...input,
        userId: ctx.user.id,
        date: new Date(input.date),
        isBilled: false,
      });
      return { id: Number(result[0].insertId) };
    }),

  update: authedQuery
    .input(z.object({
      id: z.number(),
      projectId: z.number().optional(),
      taskId: z.number().optional(),
      contactId: z.number().optional(),
      description: z.string().optional(),
      date: z.string().optional(),
      startTime: z.string().optional(),
      endTime: z.string().optional(),
      hours: z.string().optional(),
      rate: z.string().optional(),
      isBillable: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const { id, ...data } = input;
      const updateData: any = { ...data };
      if (data.date) updateData.date = new Date(data.date);
      await db.update(timeEntries).set(updateData).where(and(eq(timeEntries.id, id), eq(timeEntries.userId, ctx.user.id)));
      return { success: true };
    }),

  delete: authedQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      await db.delete(timeEntries).where(and(eq(timeEntries.id, input.id), eq(timeEntries.userId, ctx.user.id)));
      return { success: true };
    }),

  getSummary: authedQuery
    .input(z.object({
      projectId: z.number().optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      const db = getDb();
      const conditions = [eq(timeEntries.userId, ctx.user.id)];
      if (input?.projectId) conditions.push(eq(timeEntries.projectId, input.projectId));
      if (input?.startDate) conditions.push(sql`${timeEntries.date} >= ${new Date(input.startDate)}`);
      if (input?.endDate) conditions.push(sql`${timeEntries.date} <= ${new Date(input.endDate)}`);

      const [totalResult] = await db
        .select({
          totalHours: sql<number>`COALESCE(SUM(CAST(${timeEntries.hours} AS DECIMAL(10,2))), 0)`,
          billableHours: sql<number>`COALESCE(SUM(CASE WHEN ${timeEntries.isBillable} = true THEN CAST(${timeEntries.hours} AS DECIMAL(10,2)) ELSE 0 END), 0)`,
          billedHours: sql<number>`COALESCE(SUM(CASE WHEN ${timeEntries.isBilled} = true THEN CAST(${timeEntries.hours} AS DECIMAL(10,2)) ELSE 0 END), 0)`,
          totalAmount: sql<number>`COALESCE(SUM(CAST(${timeEntries.hours} AS DECIMAL(10,2)) * CAST(${timeEntries.rate} AS DECIMAL(15,2))), 0)`,
        })
        .from(timeEntries)
        .where(and(...conditions));

      const totalHours = Number(totalResult?.totalHours ?? 0);
      const billableHours = Number(totalResult?.billableHours ?? 0);
      const billedHours = Number(totalResult?.billedHours ?? 0);

      return {
        totalHours,
        billableHours,
        unbilledHours: billableHours - billedHours,
        billedHours,
        totalAmount: Number(totalResult?.totalAmount ?? 0),
      };
    }),
});
