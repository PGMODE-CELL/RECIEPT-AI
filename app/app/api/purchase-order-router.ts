import { z } from "zod";
import { eq, and, desc, sql, like } from "drizzle-orm";
import { createRouter, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { purchaseOrders, purchaseOrderItems, contacts, products } from "@db/schema";

export const purchaseOrderRouter = createRouter({
  list: authedQuery
    .input(z.object({
      status: z.string().optional(),
      search: z.string().optional(),
      page: z.number().optional().default(1),
      limit: z.number().optional().default(50),
    }).optional())
    .query(async ({ ctx, input }) => {
      const db = getDb();
      const conditions = [eq(purchaseOrders.userId, ctx.user.id)];
      if (input?.status) conditions.push(eq(purchaseOrders.status, input.status as any));
      if (input?.search) conditions.push(like(purchaseOrders.orderNumber, `%${input.search}%`));

      const page = input?.page || 1;
      const limit = input?.limit || 50;
      const offset = (page - 1) * limit;

      const [countResult] = await db.select({ count: sql<number>`COUNT(*)` }).from(purchaseOrders).where(and(...conditions));
      const total = countResult?.count || 0;

      const rows = await db
        .select({
          id: purchaseOrders.id,
          orderNumber: purchaseOrders.orderNumber,
          contactId: purchaseOrders.contactId,
          contactName: contacts.name,
          orderDate: purchaseOrders.orderDate,
          expectedDate: purchaseOrders.expectedDate,
          status: purchaseOrders.status,
          subTotal: purchaseOrders.subTotal,
          taxTotal: purchaseOrders.taxTotal,
          total: purchaseOrders.total,
          currency: purchaseOrders.currency,
          createdAt: purchaseOrders.createdAt,
        })
        .from(purchaseOrders)
        .leftJoin(contacts, eq(purchaseOrders.contactId, contacts.id))
        .where(and(...conditions))
        .orderBy(desc(purchaseOrders.createdAt))
        .limit(limit)
        .offset(offset);

      return { purchaseOrders: rows, total, page, limit };
    }),

  getById: authedQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = getDb();
      const poRows = await db
        .select({
          id: purchaseOrders.id,
          orderNumber: purchaseOrders.orderNumber,
          contactId: purchaseOrders.contactId,
          contactName: contacts.name,
          contactEmail: contacts.email,
          contactAddress: contacts.address,
          orderDate: purchaseOrders.orderDate,
          expectedDate: purchaseOrders.expectedDate,
          status: purchaseOrders.status,
          subTotal: purchaseOrders.subTotal,
          taxTotal: purchaseOrders.taxTotal,
          total: purchaseOrders.total,
          notes: purchaseOrders.notes,
          currency: purchaseOrders.currency,
          createdAt: purchaseOrders.createdAt,
        })
        .from(purchaseOrders)
        .leftJoin(contacts, eq(purchaseOrders.contactId, contacts.id))
        .where(and(eq(purchaseOrders.id, input.id), eq(purchaseOrders.userId, ctx.user.id)));
      if (!poRows[0]) return null;
      const items = await db
        .select({
          id: purchaseOrderItems.id,
          purchaseOrderId: purchaseOrderItems.purchaseOrderId,
          productId: purchaseOrderItems.productId,
          productName: products.name,
          description: purchaseOrderItems.description,
          quantity: purchaseOrderItems.quantity,
          unitPrice: purchaseOrderItems.unitPrice,
          taxRate: purchaseOrderItems.taxRate,
          amount: purchaseOrderItems.amount,
        })
        .from(purchaseOrderItems)
        .leftJoin(products, eq(purchaseOrderItems.productId, products.id))
        .where(eq(purchaseOrderItems.purchaseOrderId, input.id));
      return { ...poRows[0], items };
    }),

  create: authedQuery
    .input(z.object({
      orderNumber: z.string().min(1),
      contactId: z.number(),
      orderDate: z.string(),
      expectedDate: z.string().optional(),
      notes: z.string().optional(),
      currency: z.string().default("USD"),
      items: z.array(z.object({
        productId: z.number().optional(),
        description: z.string().min(1),
        quantity: z.string(),
        unitPrice: z.string(),
        taxRate: z.string().optional(),
        amount: z.string(),
      })).min(1),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const { items, ...poData } = input;
      const subTotal = items.reduce((s, i) => s + parseFloat(i.amount), 0);
      const taxTotal = items.reduce((s, i) => s + parseFloat(i.taxRate || "0") * parseFloat(i.quantity) * parseFloat(i.unitPrice) / 100, 0);
      const total = subTotal + taxTotal;

      const result = await db.insert(purchaseOrders).values({
        ...poData,
        userId: ctx.user.id,
        orderDate: new Date(poData.orderDate),
        expectedDate: poData.expectedDate ? new Date(poData.expectedDate) : null,
        subTotal: subTotal.toFixed(2),
        taxTotal: taxTotal.toFixed(2),
        total: total.toFixed(2),
        status: "draft",
      });
      const purchaseOrderId = Number(result[0].insertId);

      if (items.length > 0) {
        await db.insert(purchaseOrderItems).values(items.map((item) => ({
          purchaseOrderId,
          productId: item.productId ?? null,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          taxRate: item.taxRate || "0.00",
          amount: item.amount,
        })));
      }
      return { id: purchaseOrderId };
    }),

  update: authedQuery
    .input(z.object({
      id: z.number(),
      orderNumber: z.string().optional(),
      contactId: z.number().optional(),
      orderDate: z.string().optional(),
      expectedDate: z.string().optional(),
      notes: z.string().optional(),
      currency: z.string().optional(),
      items: z.array(z.object({
        productId: z.number().optional(),
        description: z.string().min(1),
        quantity: z.string(),
        unitPrice: z.string(),
        taxRate: z.string().optional(),
        amount: z.string(),
      })).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const { id, items, ...updateData } = input;

      const updateFields: any = { ...updateData };
      if (updateData.orderDate) updateFields.orderDate = new Date(updateData.orderDate);
      if (updateData.expectedDate) updateFields.expectedDate = new Date(updateData.expectedDate);

      if (items && items.length > 0) {
        const subTotal = items.reduce((s, i) => s + parseFloat(i.amount), 0);
        const taxTotal = items.reduce((s, i) => s + parseFloat(i.taxRate || "0") * parseFloat(i.quantity) * parseFloat(i.unitPrice) / 100, 0);
        const total = subTotal + taxTotal;

        updateFields.subTotal = subTotal.toFixed(2);
        updateFields.taxTotal = taxTotal.toFixed(2);
        updateFields.total = total.toFixed(2);

        await db.delete(purchaseOrderItems).where(eq(purchaseOrderItems.purchaseOrderId, id));
        await db.insert(purchaseOrderItems).values(items.map((item) => ({
          purchaseOrderId: id,
          productId: item.productId ?? null,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          taxRate: item.taxRate || "0.00",
          amount: item.amount,
        })));
      }

      await db.update(purchaseOrders).set(updateFields).where(and(eq(purchaseOrders.id, id), eq(purchaseOrders.userId, ctx.user.id)));
      return { success: true };
    }),

  updateStatus: authedQuery
    .input(z.object({ id: z.number(), status: z.enum(["draft", "sent", "confirmed", "received", "cancelled"]) }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      await db.update(purchaseOrders).set({ status: input.status }).where(and(eq(purchaseOrders.id, input.id), eq(purchaseOrders.userId, ctx.user.id)));
      return { success: true };
    }),

  delete: authedQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      await db.delete(purchaseOrderItems).where(eq(purchaseOrderItems.purchaseOrderId, input.id));
      await db.delete(purchaseOrders).where(and(eq(purchaseOrders.id, input.id), eq(purchaseOrders.userId, ctx.user.id)));
      return { success: true };
    }),

  nextNumber: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    const result = await db
      .select({ maxNum: sql<number>`COALESCE(MAX(CAST(SUBSTRING(${purchaseOrders.orderNumber}, 4) AS UNSIGNED)), 0)` })
      .from(purchaseOrders).where(eq(purchaseOrders.userId, ctx.user.id));
    return `PO-${String((result[0]?.maxNum ?? 0) + 1).padStart(4, "0")}`;
  }),
});
