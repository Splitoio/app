import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createExpense,
  updateExpense,
  deleteExpense,
  getExpenses,
  getLegacyExpenses,
  markParticipantAsPaid,
  EnhancedExpensePayload,
  UpdateExpensePayload,
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
      // Toast is shown by the caller (e.g. AddExpenseModal) to avoid duplicate toasts
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

export const useUpdateExpense = (groupId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      expenseId,
      payload,
    }: {
      expenseId: string;
      payload: UpdateExpensePayload;
    }) => updateExpense(groupId, expenseId, payload),
    onSuccess: (_, { expenseId }) => {
      queryClient.invalidateQueries({ queryKey: [QueryKeys.EXPENSES] });
      queryClient.invalidateQueries({ queryKey: [QueryKeys.EXPENSES, groupId] });
      queryClient.invalidateQueries({ queryKey: [QueryKeys.BALANCES] });
      queryClient.invalidateQueries({ queryKey: [QueryKeys.ANALYTICS] });
      toast.success("Expense updated");
    },
    onError: (error: Error) => {
      console.error("Error updating expense:", error);
      toast.error(error.message || "Failed to update expense");
    },
  });
};

export const useMarkParticipantAsPaid = (groupId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ expenseId, userId }: { expenseId: string; userId: string }) =>
      markParticipantAsPaid(expenseId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKeys.GROUPS] });
      queryClient.invalidateQueries({ queryKey: [QueryKeys.GROUPS, groupId] });
      queryClient.invalidateQueries({ queryKey: [QueryKeys.EXPENSES] });
      queryClient.invalidateQueries({ queryKey: [QueryKeys.BALANCES] });
      toast.success("Marked as paid");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to mark as paid");
    },
  });
};

export const useDeleteExpense = (groupId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (expenseId: string) => deleteExpense(groupId, expenseId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKeys.GROUPS] });
      queryClient.invalidateQueries({ queryKey: [QueryKeys.GROUPS, groupId] });
      queryClient.invalidateQueries({ queryKey: [QueryKeys.EXPENSES] });
      queryClient.invalidateQueries({ queryKey: [QueryKeys.EXPENSES, groupId] });
      queryClient.invalidateQueries({ queryKey: [QueryKeys.BALANCES] });
      queryClient.invalidateQueries({ queryKey: [QueryKeys.ANALYTICS] });
      toast.success("Expense deleted successfully");
    },
    onError: (error: Error) => {
      console.error("Error deleting expense:", error);
      toast.error(error.message || "Failed to delete expense");
    },
  });
};
