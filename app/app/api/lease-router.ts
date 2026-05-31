import { z } from "zod";
import { eq, and, desc } from "drizzle-orm";
import { createRouter, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { leases } from "@db/schema";

export const leaseRouter = createRouter({
  list: authedQuery
    .input(z.object({ status: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const db = getDb();
      const conditions = [eq(leases.userId, ctx.user.id)];
      if (input?.status) conditions.push(eq(leases.status, input.status as any));
      return db.select().from(leases).where(and(...conditions)).orderBy(desc(leases.createdAt));
    }),

  getById: authedQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = getDb();
      const rows = await db.select().from(leases)
        .where(and(eq(leases.id, input.id), eq(leases.userId, ctx.user.id)));
      return rows[0] ?? null;
    }),

  create: authedQuery
    .input(z.object({
      name: z.string().min(1),
      contactId: z.number().optional(),
      leaseType: z.enum(["operating", "finance"]).optional(),
      startDate: z.string(),
      endDate: z.string(),
      monthlyPayment: z.string(),
      discountRate: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const result = await db.insert(leases).values({
        ...input,
        userId: ctx.user.id,
        startDate: new Date(input.startDate),
        endDate: new Date(input.endDate),
      });
      return { id: Number(result[0].insertId) };
    }),

  update: authedQuery
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      leaseType: z.enum(["operating", "finance"]).optional(),
      monthlyPayment: z.string().optional(),
      discountRate: z.string().optional(),
      status: z.enum(["active", "expired", "terminated"]).optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const { id, ...data } = input;
      await db.update(leases).set(data)
        .where(and(eq(leases.id, id), eq(leases.userId, ctx.user.id)));
      return { success: true };
    }),

  delete: authedQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      await db.delete(leases).where(and(eq(leases.id, input.id), eq(leases.userId, ctx.user.id)));
      return { success: true };
    }),

  calculateLiability: authedQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const rows = await db.select().from(leases)
        .where(and(eq(leases.id, input.id), eq(leases.userId, ctx.user.id)));
      if (!rows[0]) throw new Error("Lease not found");
      const lease = rows[0];
      const monthly = parseFloat(lease.monthlyPayment);
      const start = new Date(lease.startDate);
      const end = new Date(lease.endDate);
      const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
      const totalPayments = (monthly * months).toFixed(2);
      const rate = parseFloat(lease.discountRate || "0") / 100;
      let rou = 0;
      for (let i = 1; i <= months; i++) {
        rou += monthly / Math.pow(1 + rate / 12, i);
      }
      await db.update(leases).set({
        totalPayments,
        rightOfUseAsset: rou.toFixed(2),
        leaseLiability: rou.toFixed(2),
      }).where(eq(leases.id, input.id));
      return { rightOfUseAsset: rou.toFixed(2), leaseLiability: rou.toFixed(2) };
    }),
});
