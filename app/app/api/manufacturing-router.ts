import { z } from "zod";
import { eq, and, desc } from "drizzle-orm";
import { createRouter, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { billOfMaterials, bomItems, workOrders } from "@db/schema";

export const manufacturingRouter = createRouter({
  listBoms: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    return db.select().from(billOfMaterials)
      .where(eq(billOfMaterials.userId, ctx.user.id))
      .orderBy(desc(billOfMaterials.createdAt));
  }),

  createBom: authedQuery
    .input(z.object({
      name: z.string().min(1),
      productId: z.number(),
      quantity: z.string().optional(),
      status: z.enum(["draft", "active", "obsolete"]).optional(),
      description: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const result = await db.insert(billOfMaterials).values({
        ...input,
        userId: ctx.user.id,
      });
      return { id: Number(result[0].insertId) };
    }),

  updateBom: authedQuery
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      productId: z.number().optional(),
      quantity: z.string().optional(),
      status: z.enum(["draft", "active", "obsolete"]).optional(),
      description: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const { id, ...data } = input;
      await db.update(billOfMaterials).set(data)
        .where(and(eq(billOfMaterials.id, id), eq(billOfMaterials.userId, ctx.user.id)));
      return { success: true };
    }),

  deleteBom: authedQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      await db.delete(billOfMaterials).where(and(eq(billOfMaterials.id, input.id), eq(billOfMaterials.userId, ctx.user.id)));
      return { success: true };
    }),

  listBomItems: authedQuery
    .input(z.object({ bomId: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      return db.select().from(bomItems)
        .where(eq(bomItems.bomId, input.bomId));
    }),

  addBomItem: authedQuery
    .input(z.object({
      bomId: z.number(),
      productId: z.number(),
      quantity: z.string().optional(),
      unitCost: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const result = await db.insert(bomItems).values(input);
      return { id: Number(result[0].insertId) };
    }),

  removeBomItem: authedQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.delete(bomItems).where(eq(bomItems.id, input.id));
      return { success: true };
    }),

  listWorkOrders: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    return db.select().from(workOrders)
      .where(eq(workOrders.userId, ctx.user.id))
      .orderBy(desc(workOrders.createdAt));
  }),

  createWorkOrder: authedQuery
    .input(z.object({
      orderNumber: z.string().min(1),
      bomId: z.number(),
      quantity: z.string().optional(),
      status: z.enum(["draft", "planned", "in_progress", "completed", "cancelled"]).optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      actualCost: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const result = await db.insert(workOrders).values({
        ...input,
        userId: ctx.user.id,
        startDate: input.startDate ? new Date(input.startDate) : null,
        endDate: input.endDate ? new Date(input.endDate) : null,
      });
      return { id: Number(result[0].insertId) };
    }),

  updateWorkOrder: authedQuery
    .input(z.object({
      id: z.number(),
      orderNumber: z.string().optional(),
      bomId: z.number().optional(),
      quantity: z.string().optional(),
      status: z.enum(["draft", "planned", "in_progress", "completed", "cancelled"]).optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      actualCost: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const { id, ...data } = input;
      const updateData: any = { ...data };
      if (data.startDate) updateData.startDate = new Date(data.startDate);
      if (data.endDate) updateData.endDate = new Date(data.endDate);
      await db.update(workOrders).set(updateData)
        .where(and(eq(workOrders.id, id), eq(workOrders.userId, ctx.user.id)));
      return { success: true };
    }),

  deleteWorkOrder: authedQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      await db.delete(workOrders).where(and(eq(workOrders.id, input.id), eq(workOrders.userId, ctx.user.id)));
      return { success: true };
    }),
});
