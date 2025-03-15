import { useMutation, useQueryClient } from "@tanstack/react-query";
import { settleDebt } from "../api/client";
import { QueryKeys } from "@/lib/constants";
import { useWallet } from "@/hooks/useWallet";
import { toast } from "sonner";

export const useSettleDebt = (groupId: string) => {
  const queryClient = useQueryClient();
  const { wallet } = useWallet();

  return useMutation({
    mutationFn: (payload: Parameters<typeof settleDebt>[0]) =>
      settleDebt(payload, wallet!),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [QueryKeys.GROUPS, groupId],
      });
      queryClient.invalidateQueries({
        queryKey: [QueryKeys.BALANCES],
      });
    },
    onError: (error) => {
      toast.error("Error settling debt. ", {
        description: error.message || "Unknown error",
      });
      console.error(error);
    },
  });
};
