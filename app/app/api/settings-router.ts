import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { createRouter, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { companies, taxRates, currencies } from "@db/schema";

export const settingsRouter = createRouter({
  // Company
  getCompany: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    const rows = await db.select().from(companies).where(eq(companies.userId, ctx.user.id));
    return rows[0] ?? null;
  }),

  saveCompany: authedQuery
    .input(z.object({
      name: z.string().min(1),
      legalName: z.string().optional(),
      taxId: z.string().optional(),
      registrationNumber: z.string().optional(),
      industry: z.string().optional(),
      phone: z.string().optional(),
      email: z.string().email().optional(),
      website: z.string().optional(),
      address: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      country: z.string().optional(),
      postalCode: z.string().optional(),
      fiscalYearStart: z.string().optional(),
      baseCurrency: z.string().default("USD"),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const existing = await db.select().from(companies).where(eq(companies.userId, ctx.user.id));
      if (existing[0]) {
        await db.update(companies).set({
          ...input,
          fiscalYearStart: input.fiscalYearStart ? new Date(input.fiscalYearStart) : existing[0].fiscalYearStart,
          updatedAt: new Date(),
        }).where(eq(companies.id, existing[0].id));
        return { id: existing[0].id };
      } else {
        const result = await db.insert(companies).values({
          ...input,
          userId: ctx.user.id,
          fiscalYearStart: input.fiscalYearStart ? new Date(input.fiscalYearStart) : null,
        });
        return { id: Number(result[0].insertId) };
      }
    }),

  // Tax Rates
  listTaxRates: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    return db.select().from(taxRates).where(eq(taxRates.userId, ctx.user.id));
  }),

  createTaxRate: authedQuery
    .input(z.object({
      name: z.string().min(1),
      rate: z.string(),
      type: z.enum(["vat", "gst", "sales_tax", "withholding", "custom"]),
      country: z.string().optional(),
      region: z.string().optional(),
      isCompound: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const result = await db.insert(taxRates).values({ ...input, userId: ctx.user.id });
      return { id: Number(result[0].insertId) };
    }),

  deleteTaxRate: authedQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      await db.delete(taxRates).where(and(eq(taxRates.id, input.id), eq(taxRates.userId, ctx.user.id)));
      return { success: true };
    }),

  // Currencies
  listCurrencies: authedQuery.query(async () => {
    const db = getDb();
    return db.select().from(currencies);
  }),

  updateCurrency: authedQuery
    .input(z.object({
      id: z.number(),
      exchangeRate: z.string(),
      isActive: z.boolean(),
    }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.update(currencies).set({
        exchangeRate: input.exchangeRate,
        isActive: input.isActive,
      }).where(eq(currencies.id, input.id));
      return { success: true };
    }),
});
