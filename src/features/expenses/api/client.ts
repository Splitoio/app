import { apiClient } from "@/api/client";
import { z } from "zod";

const ExpenseSchema = z.object({
  id: z.string(),
  name: z.string(),
  amount: z.number(),
  currency: z.string(),
  splitType: z.enum(["EQUAL", "PERCENTAGE", "EXACT"]),
  participants: z.array(
    z.object({
      userId: z.string(),
      amount: z.number(),
    })
  ),
});

export const createExpense = async (
  groupId: string,
  payload: {
    paidBy: string;
    name: string;
    category: string;
    amount: number;
    splitType: string;
    currency: string;
    participants: Array<{ userId: string; amount: number }>;
  }
) => {
  const response = await apiClient.post(`/groups/${groupId}/expenses`, payload);
  return ExpenseSchema.parse(response);
};
