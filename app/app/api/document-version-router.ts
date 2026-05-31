import { z } from "zod";
import { eq, and, desc } from "drizzle-orm";
import { createRouter, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { documentVersions } from "@db/schema";

export const documentVersionRouter = createRouter({
  list: authedQuery
    .input(z.object({ documentId: z.number() }).optional())
    .query(async ({ ctx, input }) => {
      const db = getDb();
      if (input?.documentId) {
        return db.select().from(documentVersions)
          .where(eq(documentVersions.documentId, input.documentId))
          .orderBy(desc(documentVersions.version));
      }
      return db.select().from(documentVersions).orderBy(desc(documentVersions.createdAt));
    }),

  getById: authedQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = getDb();
      const rows = await db.select().from(documentVersions)
        .where(eq(documentVersions.id, input.id));
      return rows[0] ?? null;
    }),

  create: authedQuery
    .input(z.object({
      documentId: z.number(),
      version: z.number(),
      fileUrl: z.string(),
      fileSize: z.number().optional(),
      uploadedBy: z.number().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const result = await db.insert(documentVersions).values({ ...input });
      return { id: Number(result[0].insertId) };
    }),

  update: authedQuery
    .input(z.object({
      id: z.number(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const { id, ...data } = input;
      await db.update(documentVersions).set(data).where(eq(documentVersions.id, id));
      return { success: true };
    }),

  delete: authedQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      await db.delete(documentVersions).where(eq(documentVersions.id, input.id));
      return { success: true };
    }),

  getVersionHistory: authedQuery
    .input(z.object({ documentId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = getDb();
      const rows = await db.select().from(documentVersions)
        .where(eq(documentVersions.documentId, input.documentId))
        .orderBy(desc(documentVersions.version));
      return rows;
    }),
});
