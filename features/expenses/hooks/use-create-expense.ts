import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createExpense, getExpenses } from "../api/client";
import { QueryKeys } from "@/lib/constants";

export const useCreateExpense = (groupId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: Parameters<typeof createExpense>[1]) =>
      createExpense(groupId, payload),
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

export const useGetExpenses = (groupId: string) => {
  return useQuery({
    queryKey: [QueryKeys.EXPENSES, groupId],
    queryFn: () => getExpenses(groupId),
  });
};
