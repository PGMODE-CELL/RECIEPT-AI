import { z } from "zod";
import { eq, and, desc } from "drizzle-orm";
import { createRouter, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { documents } from "@db/schema";

export const documentRouter = createRouter({
  list: authedQuery
    .input(z.object({ category: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const db = getDb();
      if (input?.category) {
        return db.select().from(documents)
          .where(and(eq(documents.userId, ctx.user.id), eq(documents.category, input.category)))
          .orderBy(desc(documents.createdAt));
      }
      return db.select().from(documents).where(eq(documents.userId, ctx.user.id)).orderBy(desc(documents.createdAt));
    }),

  create: authedQuery
    .input(z.object({
      name: z.string().min(1),
      fileUrl: z.string(),
      fileType: z.string().optional(),
      fileSize: z.number().optional(),
      category: z.string().optional(),
      tags: z.any().optional(),
      description: z.string().optional(),
      relatedType: z.enum(["invoice", "bill", "contact", "receipt", "employee", "project", "general"]).optional(),
      relatedId: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const result = await db.insert(documents).values({ ...input, userId: ctx.user.id });
      return { id: Number(result[0].insertId) };
    }),

  delete: authedQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      await db.delete(documents).where(and(eq(documents.id, input.id), eq(documents.userId, ctx.user.id)));
      return { success: true };
    }),
});
