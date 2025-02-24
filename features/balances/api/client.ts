import { apiClient } from "@/api/client";
import { z } from "zod";

const BalanceSchema = z.object({
  total: z.number(),
  currency: z.string(),
  debts: z.array(
    z.object({
      from: z.string(),
      to: z.string(),
      amount: z.number(),
    })
  ),
});

export const getBalances = async () => {
  const response = await apiClient.get("/groups/balances");
  return BalanceSchema.parse(response);
};
