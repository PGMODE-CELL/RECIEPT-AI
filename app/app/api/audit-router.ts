import { z } from "zod";
import { eq, and, desc, sql } from "drizzle-orm";
import { createRouter, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { auditLogs } from "@db/schema";

export const auditRouter = createRouter({
  list: authedQuery
    .input(z.object({
      entityType: z.string().optional(),
      entityId: z.number().optional(),
      limit: z.number().optional().default(50),
    }).optional())
    .query(async ({ ctx, input }) => {
      const db = getDb();
      const conditions = [eq(auditLogs.userId, ctx.user.id)];
      if (input?.entityType) conditions.push(eq(auditLogs.entityType, input.entityType));
      if (input?.entityId) conditions.push(eq(auditLogs.entityId, input.entityId));
      return db.select().from(auditLogs)
        .where(and(...conditions))
        .orderBy(desc(auditLogs.createdAt))
        .limit(input?.limit || 50);
    }),

  log: authedQuery
    .input(z.object({
      action: z.string(),
      entityType: z.string(),
      entityId: z.number().optional(),
      oldValues: z.any().optional(),
      newValues: z.any().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const result = await db.insert(auditLogs).values({
        ...input,
        userId: ctx.user.id,
      });
      return { id: Number(result[0].insertId) };
    }),

  getStats: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    const result = await db.select({
      total: sql<number>`COUNT(*)`,
      todayCount: sql<number>`SUM(CASE WHEN DATE(${auditLogs.createdAt}) = CURDATE() THEN 1 ELSE 0 END)`,
    }).from(auditLogs).where(eq(auditLogs.userId, ctx.user.id));
    return result[0] || { total: 0, todayCount: 0 };
  }),
});
