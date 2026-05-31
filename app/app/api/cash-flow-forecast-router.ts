import { z } from "zod";
import { createRouter, authedQuery } from "./middleware";

const mockForecasts = [
  { id: 1, month: "2026-01", inflow: 125000, outflow: 98000, net: 27000 },
  { id: 2, month: "2026-02", inflow: 132000, outflow: 101000, net: 31000 },
  { id: 3, month: "2026-03", inflow: 118000, outflow: 105000, net: 13000 },
  { id: 4, month: "2026-04", inflow: 145000, outflow: 110000, net: 35000 },
  { id: 5, month: "2026-05", inflow: 155000, outflow: 112000, net: 43000 },
  { id: 6, month: "2026-06", inflow: 140000, outflow: 108000, net: 32000 },
];

export const cashFlowForecastRouter = createRouter({
  list: authedQuery.query(async () => {
    return mockForecasts;
  }),

  create: authedQuery
    .input(z.object({
      month: z.string().min(1),
      inflow: z.number(),
      outflow: z.number(),
      net: z.number(),
    }))
    .mutation(async ({ input }) => {
      const newEntry = { id: mockForecasts.length + 1, ...input };
      mockForecasts.push(newEntry);
      return { id: newEntry.id };
    }),

  delete: authedQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const idx = mockForecasts.findIndex((f) => f.id === input.id);
      if (idx !== -1) mockForecasts.splice(idx, 1);
      return { success: true };
    }),
});
