import { z } from "zod";
import { eq, and, desc, sql } from "drizzle-orm";
import { createRouter, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { fixedAssets } from "@db/schema";

export const fixedAssetRouter = createRouter({
  list: authedQuery
    .input(z.object({ status: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const db = getDb();
      const conditions = [eq(fixedAssets.userId, ctx.user.id)];
      if (input?.status) conditions.push(eq(fixedAssets.status, input.status as any));
      return db.select().from(fixedAssets).where(and(...conditions)).orderBy(desc(fixedAssets.createdAt));
    }),

  getById: authedQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = getDb();
      const rows = await db.select().from(fixedAssets)
        .where(and(eq(fixedAssets.id, input.id), eq(fixedAssets.userId, ctx.user.id)));
      return rows[0] ?? null;
    }),

  create: authedQuery
    .input(z.object({
      name: z.string().min(1),
      description: z.string().optional(),
      assetCode: z.string().min(1),
      purchaseDate: z.string(),
      purchasePrice: z.string(),
      salvageValue: z.string().optional(),
      usefulLife: z.number(),
      depreciationMethod: z.enum(["straight_line", "declining_balance", "double_declining"]).default("straight_line"),
      location: z.string().optional(),
      accountId: z.number().optional(),
      depreciationAccountId: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const result = await db.insert(fixedAssets).values({
        ...input,
        userId: ctx.user.id,
        purchaseDate: new Date(input.purchaseDate),
        salvageValue: input.salvageValue || "0.00",
        currentValue: input.purchasePrice,
        accumulatedDepreciation: "0.00",
      });
      return { id: Number(result[0].insertId) };
    }),

  update: authedQuery
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      status: z.enum(["active", "fully_depreciated", "sold", "disposed"]).optional(),
      currentValue: z.string().optional(),
      accumulatedDepreciation: z.string().optional(),
      location: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const { id, ...data } = input;
      await db.update(fixedAssets).set(data)
        .where(and(eq(fixedAssets.id, id), eq(fixedAssets.userId, ctx.user.id)));
      return { success: true };
    }),

  delete: authedQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      await db.delete(fixedAssets).where(and(eq(fixedAssets.id, input.id), eq(fixedAssets.userId, ctx.user.id)));
      return { success: true };
    }),

  depreciate: authedQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const rows = await db.select().from(fixedAssets)
        .where(and(eq(fixedAssets.id, input.id), eq(fixedAssets.userId, ctx.user.id)));
      if (!rows[0]) throw new Error("Asset not found");
      const asset = rows[0];

      const cost = parseFloat(asset.purchasePrice);
      const salvage = parseFloat(asset.salvageValue || "0");
      const usefulLife = asset.usefulLife;
      const accumulated = parseFloat(asset.accumulatedDepreciation || "0");

      let annualDepreciation = 0;
      if (asset.depreciationMethod === "straight_line") {
        annualDepreciation = (cost - salvage) / usefulLife;
      } else if (asset.depreciationMethod === "double_declining") {
        const rate = 2 / usefulLife;
        annualDepreciation = (cost - accumulated) * rate;
      } else {
        const rate = 1 / usefulLife;
        annualDepreciation = (cost - accumulated) * rate;
      }

      const monthlyDepreciation = annualDepreciation / 12;
      const newAccumulated = Math.min(accumulated + monthlyDepreciation, cost - salvage);
      const newValue = cost - newAccumulated;

      await db.update(fixedAssets).set({
        accumulatedDepreciation: newAccumulated.toFixed(2),
        currentValue: newValue.toFixed(2),
        status: newValue <= salvage ? "fully_depreciated" : "active",
      }).where(eq(fixedAssets.id, input.id));

      return { depreciation: monthlyDepreciation.toFixed(2) };
    }),

  getSummary: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    const result = await db.select({
      totalCost: sql<number>`COALESCE(SUM(${fixedAssets.purchasePrice}), 0)`,
      totalAccumulated: sql<number>`COALESCE(SUM(${fixedAssets.accumulatedDepreciation}), 0)`,
      totalCurrentValue: sql<number>`COALESCE(SUM(${fixedAssets.currentValue}), 0)`,
      count: sql<number>`COUNT(*)`,
    }).from(fixedAssets).where(eq(fixedAssets.userId, ctx.user.id));
    return result[0] || { totalCost: 0, totalAccumulated: 0, totalCurrentValue: 0, count: 0 };
  }),
});
