import { z } from "zod";
import { eq, and, desc } from "drizzle-orm";
import { createRouter, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { crmLeads, crmActivities } from "@db/schema";

export const crmRouter = createRouter({
  listLeads: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    return db.select().from(crmLeads)
      .where(eq(crmLeads.userId, ctx.user.id))
      .orderBy(desc(crmLeads.createdAt));
  }),

  getById: authedQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = getDb();
      const rows = await db.select().from(crmLeads)
        .where(and(eq(crmLeads.id, input.id), eq(crmLeads.userId, ctx.user.id)));
      return rows[0] ?? null;
    }),

  createLead: authedQuery
    .input(z.object({
      name: z.string().min(1),
      email: z.string().email().optional(),
      phone: z.string().optional(),
      company: z.string().optional(),
      source: z.string().optional(),
      status: z.enum(["new", "contacted", "qualified", "proposal", "negotiation", "won", "lost"]).optional(),
      value: z.string().optional(),
      assignee: z.string().optional(),
      notes: z.string().optional(),
      expectedCloseDate: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const result = await db.insert(crmLeads).values({
        ...input,
        userId: ctx.user.id,
        expectedCloseDate: input.expectedCloseDate ? new Date(input.expectedCloseDate) : null,
      });
      return { id: Number(result[0].insertId) };
    }),

  updateLead: authedQuery
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      email: z.string().email().optional(),
      phone: z.string().optional(),
      company: z.string().optional(),
      source: z.string().optional(),
      status: z.enum(["new", "contacted", "qualified", "proposal", "negotiation", "won", "lost"]).optional(),
      value: z.string().optional(),
      assignee: z.string().optional(),
      notes: z.string().optional(),
      expectedCloseDate: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const { id, ...data } = input;
      const updateData: any = { ...data };
      if (data.expectedCloseDate) updateData.expectedCloseDate = new Date(data.expectedCloseDate);
      await db.update(crmLeads).set(updateData)
        .where(and(eq(crmLeads.id, id), eq(crmLeads.userId, ctx.user.id)));
      return { success: true };
    }),

  deleteLead: authedQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      await db.delete(crmLeads).where(and(eq(crmLeads.id, input.id), eq(crmLeads.userId, ctx.user.id)));
      return { success: true };
    }),

  listActivities: authedQuery
    .input(z.object({ leadId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = getDb();
      return db.select().from(crmActivities)
        .where(and(eq(crmActivities.leadId, input.leadId), eq(crmActivities.userId, ctx.user.id)))
        .orderBy(desc(crmActivities.createdAt));
    }),

  createActivity: authedQuery
    .input(z.object({
      leadId: z.number(),
      type: z.enum(["call", "email", "meeting", "task", "note"]),
      subject: z.string().min(1),
      description: z.string().optional(),
      dueDate: z.string().optional(),
      completed: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const result = await db.insert(crmActivities).values({
        ...input,
        userId: ctx.user.id,
        dueDate: input.dueDate ? new Date(input.dueDate) : null,
      });
      return { id: Number(result[0].insertId) };
    }),
});
