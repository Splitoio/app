import { apiClient } from "@/api-helpers/client";
import { z } from "zod";

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

export const createExpense = async (
  groupId: string,
  payload: {
    // paidBy: string;w
    // name: string;
    // category: string;
    // amount: number;
    // splitType: string;
    // currency: string;
    // participants: Array<{ userId: string; amount: number }>;
    // description: string;
    // members: Array<string>;
    // shares: Array<number>;

    name: string;
    category: string;
    amount: number;
    splitType: string;
    currency: string;
    participants: Array<{ userId: string; amount: number }>;
  }
) => {
  const response = await apiClient.post(`/groups/${groupId}/expenses`, payload);
  return response;
  // return ExpenseSchema.parse(response);
};

export const getExpenses = async (groupId: string) => {
  const response = await apiClient.get(`/groups/${groupId}/expenses`);
  return response.data;
};
