import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createExpense } from "../api/client";
import { QueryKeys } from "@/lib/constants";

export const useCreateExpense = (groupId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload) => createExpense(groupId, payload),
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
