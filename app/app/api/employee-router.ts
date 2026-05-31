import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { createRouter, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { employees } from "@db/schema";

export const employeeRouter = createRouter({
  list: authedQuery
    .input(z.object({ status: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const db = getDb();
      if (input?.status) {
        return db.select().from(employees)
          .where(and(eq(employees.userId, ctx.user.id), eq(employees.status, input.status as any)))
          .orderBy(employees.firstName);
      }
      return db.select().from(employees).where(eq(employees.userId, ctx.user.id)).orderBy(employees.firstName);
    }),

  getById: authedQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = getDb();
      const rows = await db.select().from(employees)
        .where(and(eq(employees.id, input.id), eq(employees.userId, ctx.user.id)));
      return rows[0] ?? null;
    }),

  create: authedQuery
    .input(z.object({
      employeeCode: z.string().min(1),
      firstName: z.string().min(1),
      lastName: z.string().min(1),
      email: z.string().email().optional(),
      phone: z.string().optional(),
      hireDate: z.string().optional(),
      department: z.string().optional(),
      designation: z.string().optional(),
      salary: z.string().default("0.00"),
      payFrequency: z.enum(["weekly", "biweekly", "monthly", "quarterly"]).default("monthly"),
      bankName: z.string().optional(),
      bankAccount: z.string().optional(),
      taxCode: z.string().optional(),
      address: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const result = await db.insert(employees).values({
        ...input,
        userId: ctx.user.id,
        hireDate: input.hireDate ? new Date(input.hireDate) : null,
        status: "active",
      });
      return { id: Number(result[0].insertId) };
    }),

  update: authedQuery
    .input(z.object({
      id: z.number(),
      employeeCode: z.string().optional(),
      firstName: z.string().optional(),
      lastName: z.string().optional(),
      email: z.string().email().optional(),
      phone: z.string().optional(),
      hireDate: z.string().optional(),
      department: z.string().optional(),
      designation: z.string().optional(),
      salary: z.string().optional(),
      payFrequency: z.enum(["weekly", "biweekly", "monthly", "quarterly"]).optional(),
      status: z.enum(["active", "inactive", "terminated", "on_leave"]).optional(),
      bankName: z.string().optional(),
      bankAccount: z.string().optional(),
      taxCode: z.string().optional(),
      address: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const { id, ...data } = input;
      const updateData: any = { ...data };
      if (data.hireDate) updateData.hireDate = new Date(data.hireDate);
      await db.update(employees).set(updateData)
        .where(and(eq(employees.id, id), eq(employees.userId, ctx.user.id)));
      return { success: true };
    }),

  delete: authedQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      await db.delete(employees).where(and(eq(employees.id, input.id), eq(employees.userId, ctx.user.id)));
      return { success: true };
    }),
});
