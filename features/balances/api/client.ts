import { apiClient } from "@/api/client";

import { z } from "zod";

const BalanceSchema = z.object({
  // ...GroupSchema.shape, // Include all fields from GroupSchema
  // balances: z.record(z.string(), z.number()),
  // expenses: z.array(ExpenseSchema),
  // groupBalances: z.array(GroupBalanceSchema),

  youOwe: z.array(
    z.object({
      currency: z.string(),
      amount: z.number(),
    })
  ),
  youGet: z.array(
    z.object({
      currency: z.string(),
      amount: z.number(),
    })
  ),
});

export const getBalances = async () => {
  const response = await apiClient.get("/users/balances");
  return BalanceSchema.parse(response);
};
