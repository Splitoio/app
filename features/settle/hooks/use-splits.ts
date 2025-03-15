import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { settleWithEveryone, settleWithOne } from "../api/client";
import { QueryKeys } from "@/lib/constants";
import { useWallet } from "@/hooks/useWallet";

export const useSettleWithOne = (groupId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: Parameters<typeof settleWithOne>[0]) =>
      settleWithOne(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [QueryKeys.GROUPS, groupId],
      });
      queryClient.invalidateQueries({
        queryKey: [QueryKeys.BALANCES],
      });
    },
  });
};

export const useSettleWithEveryone = (groupId: string) => {
  const queryClient = useQueryClient();
  const { wallet } = useWallet();

  return useMutation({
    mutationFn: (payload: Parameters<typeof settleWithEveryone>[0]) =>
      settleWithEveryone(payload, wallet!),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [QueryKeys.GROUPS, groupId],
      });
      queryClient.invalidateQueries({
        queryKey: [QueryKeys.BALANCES],
      });
    },
  });
};
