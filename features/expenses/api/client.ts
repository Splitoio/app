import { apiClient } from "@/api-helpers/client";
import { z } from "zod";
import { CurrencyType } from "@/api-helpers/types";

// const ExpenseSchema = z.object({
//   id: z.string(),
//   name: z.string(),
//   amount: z.number(),
//   currency: z.string(),
//   splitType: z.enum(["EQUAL", "PERCENTAGE", "EXACT"]),
//   participants: z.array(
//     z.object({
//       userId: z.string(),
//       amount: z.number(),
//     })
//   ),
// });

// Define a comprehensive type for the expense payload
export interface EnhancedExpensePayload {
  name: string;
  category: string;
  amount: number;
  splitType: string;
  currency: string;
  currencyType: CurrencyType;
  chainId?: string;
  tokenId?: string;
  timeLockIn: boolean;
  participants: Array<{ userId: string; amount: number }>;
  paidBy: string;
  description?: string;
  groupId?: string;
}

export const createExpense = async (
  groupId: string,
  payload: EnhancedExpensePayload
): Promise<any> => {
  const response = await apiClient.post(`/enhanced-expenses`, {
    ...payload,
    groupId,
  });
  return response.data;
};

export const getExpenses = async (groupId: string) => {
  const response = await apiClient.get(`/enhanced-expenses/${groupId}`);
  return response.data;
};

export const getLegacyExpenses = async (groupId: string) => {
  const response = await apiClient.get(`/groups/${groupId}/expenses`);
  return response.data;
};
