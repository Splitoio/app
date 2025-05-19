import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createExpense,
  getExpenses,
  getLegacyExpenses,
  EnhancedExpensePayload,
} from "../api/client";
import { QueryKeys } from "@/lib/constants";
import { toast } from "sonner";

// Export the expense payload type for components to use
export type CreateExpenseParams = EnhancedExpensePayload;

export const useCreateExpense = (groupId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateExpenseParams) =>
      createExpense(groupId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [QueryKeys.EXPENSES, groupId],
      });
      queryClient.invalidateQueries({
        queryKey: [QueryKeys.BALANCES],
      });
      queryClient.invalidateQueries({
        queryKey: [QueryKeys.ANALYTICS],
      });
      toast.success("Expense added successfully");
    },
    onError: (error: Error) => {
      console.error("Error creating expense:", error);
      toast.error(error.message || "Failed to create expense");
    },
  });
};

export const useGetExpenses = (groupId: string) => {
  return useQuery({
    queryKey: [QueryKeys.EXPENSES, groupId],
    queryFn: () => getExpenses(groupId),
  });
};

export const useGetLegacyExpenses = (groupId: string) => {
  return useQuery({
    queryKey: [QueryKeys.LEGACY_EXPENSES, groupId],
    queryFn: () => getLegacyExpenses(groupId),
  });
};
