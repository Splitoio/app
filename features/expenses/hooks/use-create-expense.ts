import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createExpense } from "../api/client";
import { QueryKeys } from "@/lib/constants";
import { Expense } from "@/api/types";

export const useCreateExpense = (groupId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: {
      paidBy: string;
      name: string;
      category: string;
      amount: number;
      splitType: string;
      currency: string;
      participants: Array<{ userId: string; amount: number }>;
    }) => createExpense(groupId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [QueryKeys.EXPENSES, groupId],
      });
      queryClient.invalidateQueries({
        queryKey: [QueryKeys.BALANCES],
      });
    },
  });
};
