import { z } from "zod";
import { eq, and, desc, sql, like } from "drizzle-orm";
import { createRouter, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { expenseClaims, employees } from "@db/schema";

export const expenseClaimRouter = createRouter({
  list: authedQuery
    .input(z.object({
      status: z.string().optional(),
      search: z.string().optional(),
      page: z.number().optional().default(1),
      limit: z.number().optional().default(50),
    }).optional())
    .query(async ({ ctx, input }) => {
      const db = getDb();
      const conditions = [eq(expenseClaims.userId, ctx.user.id)];
      if (input?.status) conditions.push(eq(expenseClaims.status, input.status as any));
      if (input?.search) conditions.push(like(expenseClaims.claimNumber, `%${input.search}%`));

      const page = input?.page || 1;
      const limit = input?.limit || 50;
      const offset = (page - 1) * limit;

      const [countResult] = await db.select({ count: sql<number>`COUNT(*)` }).from(expenseClaims).where(and(...conditions));
      const total = countResult?.count || 0;

      const rows = await db
        .select({
          id: expenseClaims.id,
          claimNumber: expenseClaims.claimNumber,
          employeeId: expenseClaims.employeeId,
          employeeFirstName: employees.firstName,
          employeeLastName: employees.lastName,
          date: expenseClaims.date,
          category: expenseClaims.category,
          description: expenseClaims.description,
          amount: expenseClaims.amount,
          currency: expenseClaims.currency,
          status: expenseClaims.status,
          receiptUrl: expenseClaims.receiptUrl,
          createdAt: expenseClaims.createdAt,
        })
        .from(expenseClaims)
        .leftJoin(employees, eq(expenseClaims.employeeId, employees.id))
        .where(and(...conditions))
        .orderBy(desc(expenseClaims.createdAt))
        .limit(limit)
        .offset(offset);

      return { expenseClaims: rows, total, page, limit };
    }),

  getById: authedQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = getDb();
      const rows = await db
        .select({
          id: expenseClaims.id,
          claimNumber: expenseClaims.claimNumber,
          employeeId: expenseClaims.employeeId,
          employeeFirstName: employees.firstName,
          employeeLastName: employees.lastName,
          date: expenseClaims.date,
          category: expenseClaims.category,
          description: expenseClaims.description,
          amount: expenseClaims.amount,
          currency: expenseClaims.currency,
          status: expenseClaims.status,
          receiptUrl: expenseClaims.receiptUrl,
          approvedBy: expenseClaims.approvedBy,
          approvedAt: expenseClaims.approvedAt,
          createdAt: expenseClaims.createdAt,
        })
        .from(expenseClaims)
        .leftJoin(employees, eq(expenseClaims.employeeId, employees.id))
        .where(and(eq(expenseClaims.id, input.id), eq(expenseClaims.userId, ctx.user.id)));
      return rows[0] ?? null;
    }),

  create: authedQuery
    .input(z.object({
      claimNumber: z.string().min(1),
      employeeId: z.number().optional(),
      date: z.string(),
      category: z.string().optional(),
      description: z.string().optional(),
      amount: z.string(),
      currency: z.string().default("USD"),
      receiptUrl: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const result = await db.insert(expenseClaims).values({
        ...input,
        userId: ctx.user.id,
        date: new Date(input.date),
        status: "draft",
      });
      return { id: Number(result[0].insertId) };
    }),

  update: authedQuery
    .input(z.object({
      id: z.number(),
      claimNumber: z.string().optional(),
      employeeId: z.number().optional(),
      date: z.string().optional(),
      category: z.string().optional(),
      description: z.string().optional(),
      amount: z.string().optional(),
      currency: z.string().optional(),
      receiptUrl: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const { id, ...data } = input;
      const updateData: any = { ...data };
      if (data.date) updateData.date = new Date(data.date);
      await db.update(expenseClaims).set(updateData).where(and(eq(expenseClaims.id, id), eq(expenseClaims.userId, ctx.user.id)));
      return { success: true };
    }),

  updateStatus: authedQuery
    .input(z.object({ id: z.number(), status: z.enum(["draft", "submitted", "approved", "rejected", "paid"]) }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      await db.update(expenseClaims).set({ status: input.status }).where(and(eq(expenseClaims.id, input.id), eq(expenseClaims.userId, ctx.user.id)));
      return { success: true };
    }),

  delete: authedQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      await db.delete(expenseClaims).where(and(eq(expenseClaims.id, input.id), eq(expenseClaims.userId, ctx.user.id)));
      return { success: true };
    }),

  nextNumber: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    const result = await db
      .select({ maxNum: sql<number>`COALESCE(MAX(CAST(SUBSTRING(${expenseClaims.claimNumber}, 4) AS UNSIGNED)), 0)` })
      .from(expenseClaims).where(eq(expenseClaims.userId, ctx.user.id));
    return `EC-${String((result[0]?.maxNum ?? 0) + 1).padStart(4, "0")}`;
  }),
});
