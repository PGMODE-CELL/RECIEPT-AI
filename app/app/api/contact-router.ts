import { z } from "zod";
import { eq, and, like, sql } from "drizzle-orm";
import { createRouter, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { contacts, invoices, bills } from "@db/schema";

export const contactRouter = createRouter({
  list: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    return db
      .select()
      .from(contacts)
      .where(eq(contacts.userId, ctx.user.id))
      .orderBy(contacts.name);
  }),

  search: authedQuery
    .input(z.object({ q: z.string() }))
    .query(async ({ ctx, input }) => {
      const db = getDb();
      return db
        .select()
        .from(contacts)
        .where(
          and(
            eq(contacts.userId, ctx.user.id),
            like(contacts.name, `%${input.q}%`)
          )
        )
        .limit(20);
    }),

  getById: authedQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = getDb();
      const rows = await db
        .select()
        .from(contacts)
        .where(and(eq(contacts.id, input.id), eq(contacts.userId, ctx.user.id)));
      return rows[0] ?? null;
    }),

  create: authedQuery
    .input(z.object({
      type: z.enum(["customer", "vendor", "employee", "both"]),
      name: z.string().min(1),
      companyName: z.string().optional(),
      email: z.string().email().optional(),
      phone: z.string().optional(),
      taxId: z.string().optional(),
      address: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      country: z.string().optional(),
      postalCode: z.string().optional(),
      paymentTerms: z.number().optional(),
      currency: z.string().optional(),
      creditLimit: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const result = await db.insert(contacts).values({
        ...input,
        userId: ctx.user.id,
        balance: "0.00",
      });
      return { id: Number(result[0].insertId) };
    }),

  update: authedQuery
    .input(z.object({
      id: z.number(),
      type: z.enum(["customer", "vendor", "employee", "both"]).optional(),
      name: z.string().optional(),
      companyName: z.string().optional(),
      email: z.string().email().optional(),
      phone: z.string().optional(),
      taxId: z.string().optional(),
      address: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      country: z.string().optional(),
      postalCode: z.string().optional(),
      paymentTerms: z.number().optional(),
      currency: z.string().optional(),
      creditLimit: z.string().optional(),
      isActive: z.boolean().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const { id, ...data } = input;
      await db
        .update(contacts)
        .set(data)
        .where(and(eq(contacts.id, id), eq(contacts.userId, ctx.user.id)));
      return { success: true };
    }),

  delete: authedQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      // Check for linked invoices/bills
      const invCount = await db.select({ count: sql<number>`COUNT(*)` }).from(invoices).where(eq(invoices.contactId, input.id));
      const billCount = await db.select({ count: sql<number>`COUNT(*)` }).from(bills).where(eq(bills.contactId, input.id));
      if ((invCount[0]?.count ?? 0) > 0 || (billCount[0]?.count ?? 0) > 0) {
        throw new Error("Cannot delete contact with linked invoices or bills.");
      }
      await db.delete(contacts).where(and(eq(contacts.id, input.id), eq(contacts.userId, ctx.user.id)));
      return { success: true };
    }),

  // Contact statement
  statement: authedQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = getDb();
      const contactInvoices = await db
        .select()
        .from(invoices)
        .where(and(eq(invoices.contactId, input.id), eq(invoices.userId, ctx.user.id)))
        .orderBy(invoices.issueDate);
      const contactBills = await db
        .select()
        .from(bills)
        .where(and(eq(bills.contactId, input.id), eq(bills.userId, ctx.user.id)))
        .orderBy(bills.billDate);
      return { invoices: contactInvoices, bills: contactBills };
    }),
});
