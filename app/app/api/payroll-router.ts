import { z } from "zod";
import { eq, and, desc, sql } from "drizzle-orm";
import { createRouter, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { payrollRuns, payslips, employees, companies } from "@db/schema";

export const payrollRouter = createRouter({
  list: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    return db.select().from(payrollRuns)
      .where(eq(payrollRuns.userId, ctx.user.id))
      .orderBy(desc(payrollRuns.createdAt));
  }),

  getById: authedQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = getDb();
      const runRows = await db.select().from(payrollRuns)
        .where(and(eq(payrollRuns.id, input.id), eq(payrollRuns.userId, ctx.user.id)));
      if (!runRows[0]) return null;

      const slips = await db.select({
        id: payslips.id,
        grossPay: payslips.grossPay,
        taxDeduction: payslips.taxDeduction,
        otherDeductions: payslips.otherDeductions,
        netPay: payslips.netPay,
        firstName: employees.firstName,
        lastName: employees.lastName,
        employeeCode: employees.employeeCode,
      })
      .from(payslips)
      .leftJoin(employees, eq(payslips.employeeId, employees.id))
      .where(eq(payslips.payrollRunId, input.id));

      return { ...runRows[0], payslips: slips };
    }),

  getStats: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    const activeEmployees = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(employees)
      .where(and(eq(employees.userId, ctx.user.id), eq(employees.status, "active")));

    const totalSalary = await db
      .select({ total: sql<number>`COALESCE(SUM(${employees.salary}), 0)` })
      .from(employees)
      .where(and(eq(employees.userId, ctx.user.id), eq(employees.status, "active")));

    const lastRun = await db
      .select()
      .from(payrollRuns)
      .where(eq(payrollRuns.userId, ctx.user.id))
      .orderBy(desc(payrollRuns.createdAt))
      .limit(1);

    return {
      activeEmployees: activeEmployees[0]?.count || 0,
      totalMonthlySalary: totalSalary[0]?.total || 0,
      lastRunDate: lastRun[0]?.payDate || null,
    };
  }),

  create: authedQuery
    .input(z.object({
      periodStart: z.string(),
      periodEnd: z.string(),
      payDate: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const empList = await db.select().from(employees)
        .where(and(eq(employees.userId, ctx.user.id), eq(employees.status, "active")));

      if (empList.length === 0) {
        throw new Error("No active employees found");
      }

      // Get company tax settings (default 15% if not set)
      const company = await db.select().from(companies).where(eq(companies.userId, ctx.user.id));
      const taxRate = 0.15; // Default 15% - can be extended to read from taxRates table

      const totalGross = empList.reduce((s, e) => s + parseFloat(e.salary || "0"), 0);
      const totalTax = totalGross * taxRate;
      const totalNet = totalGross - totalTax;

      const result = await db.insert(payrollRuns).values({
        ...input,
        userId: ctx.user.id,
        periodStart: new Date(input.periodStart),
        periodEnd: new Date(input.periodEnd),
        payDate: new Date(input.payDate),
        status: "draft",
        totalGross: totalGross.toFixed(2),
        totalTax: totalTax.toFixed(2),
        totalDeductions: "0.00",
        totalNet: totalNet.toFixed(2),
      });
      const runId = Number(result[0].insertId);

      // Create payslips
      if (empList.length > 0) {
        await db.insert(payslips).values(empList.map((emp) => {
          const gross = parseFloat(emp.salary || "0");
          const tax = gross * taxRate;
          return {
            payrollRunId: runId,
            employeeId: emp.id,
            grossPay: gross.toFixed(2),
            taxDeduction: tax.toFixed(2),
            otherDeductions: "0.00",
            netPay: (gross - tax).toFixed(2),
          };
        }));
      }

      return { id: runId };
    }),

  updateStatus: authedQuery
    .input(z.object({
      id: z.number(),
      status: z.enum(["draft", "processing", "completed"]),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      await db.update(payrollRuns).set({ status: input.status })
        .where(and(eq(payrollRuns.id, input.id), eq(payrollRuns.userId, ctx.user.id)));
      return { success: true };
    }),

  delete: authedQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      await db.delete(payslips).where(eq(payslips.payrollRunId, input.id));
      await db.delete(payrollRuns).where(and(eq(payrollRuns.id, input.id), eq(payrollRuns.userId, ctx.user.id)));
      return { success: true };
    }),
});
