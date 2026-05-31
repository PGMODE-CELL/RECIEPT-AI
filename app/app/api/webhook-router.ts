import { z } from "zod";
import { eq, and, desc } from "drizzle-orm";
import { createRouter, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { webhooks } from "@db/schema";

export const webhookRouter = createRouter({
  list: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    return db.select().from(webhooks).where(eq(webhooks.userId, ctx.user.id)).orderBy(desc(webhooks.createdAt));
  }),

  getById: authedQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = getDb();
      const rows = await db.select().from(webhooks)
        .where(and(eq(webhooks.id, input.id), eq(webhooks.userId, ctx.user.id)));
      return rows[0] ?? null;
    }),

  create: authedQuery
    .input(z.object({
      name: z.string().min(1),
      url: z.string().url(),
      events: z.any().optional(),
      secret: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const result = await db.insert(webhooks).values({ ...input, userId: ctx.user.id });
      return { id: Number(result[0].insertId) };
    }),

  update: authedQuery
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      url: z.string().url().optional(),
      events: z.any().optional(),
      secret: z.string().optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const { id, ...data } = input;
      await db.update(webhooks).set(data)
        .where(and(eq(webhooks.id, id), eq(webhooks.userId, ctx.user.id)));
      return { success: true };
    }),

  delete: authedQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      await db.delete(webhooks).where(and(eq(webhooks.id, input.id), eq(webhooks.userId, ctx.user.id)));
      return { success: true };
    }),

  trigger: authedQuery
    .input(z.object({ id: z.number(), event: z.string(), payload: z.any().optional() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const rows = await db.select().from(webhooks)
        .where(and(eq(webhooks.id, input.id), eq(webhooks.userId, ctx.user.id)));
      if (!rows[0]) throw new Error("Webhook not found");
      const webhook = rows[0];
      if (!webhook.isActive) throw new Error("Webhook is inactive");
      await db.update(webhooks).set({ lastTriggered: new Date() }).where(eq(webhooks.id, input.id));
      return { success: true, url: webhook.url, event: input.event };
    }),

  getLogs: authedQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = getDb();
      const rows = await db.select().from(webhooks)
        .where(and(eq(webhooks.id, input.id), eq(webhooks.userId, ctx.user.id)));
      if (!rows[0]) throw new Error("Webhook not found");
      return { webhookId: input.id, lastTriggered: rows[0].lastTriggered };
    }),
});
