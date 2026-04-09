import { useQuery, useQueryClient } from "@tanstack/react-query";
import { QueryKeys } from "@/lib/constants";
import { useMutation } from "@tanstack/react-query";
import {
  getUser, updateUser, getUserAcceptedTokens, addUserAcceptedToken, removeUserAcceptedToken,
  getSettlementPreference, getUserSettlementPreference, saveSettlementPreference, removeSettlementPreference, updateSettlementWallet,
} from "../api/client";
import { toast } from "sonner";
import { WALLET_QUERY_KEYS } from "@/features/wallets/hooks/use-wallets";

export const useUpdateUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKeys.USER] });
    },
    onError: (error) => {
      toast.error("Error updating profile", {
        description: error.message || "Unknown error",
      });
    },
  });
};

export const useGetUser = () => {
  return useQuery({
    queryKey: [QueryKeys.USER],
    queryFn: getUser,
  });
};

const ACCEPTED_TOKENS_KEY = ["user-accepted-tokens"];

export const useGetUserAcceptedTokens = () => {
  return useQuery({
    queryKey: ACCEPTED_TOKENS_KEY,
    queryFn: getUserAcceptedTokens,
    staleTime: 0,
  });
};

export const useAddUserAcceptedToken = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: addUserAcceptedToken,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ACCEPTED_TOKENS_KEY }),
  });
};

export const useRemoveUserAcceptedToken = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: removeUserAcceptedToken,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ACCEPTED_TOKENS_KEY }),
  });
};

// ─── Settlement Preference hooks ─────────────────────────────────────────────

const SETTLEMENT_PREF_KEY = ["settlement-preference"];

export const useGetSettlementPreference = () => {
  return useQuery({
    queryKey: SETTLEMENT_PREF_KEY,
    queryFn: getSettlementPreference,
    staleTime: 0,
  });
};

export const useGetUserSettlementPreference = (userId: string | null) => {
  return useQuery({
    queryKey: ["settlement-preference", userId],
    queryFn: () => getUserSettlementPreference(userId!),
    enabled: !!userId,
    staleTime: 1000 * 60 * 2,
  });
};

export const useSaveSettlementPreference = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: saveSettlementPreference,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SETTLEMENT_PREF_KEY });
      queryClient.invalidateQueries({ queryKey: ACCEPTED_TOKENS_KEY });
      queryClient.invalidateQueries({ queryKey: [WALLET_QUERY_KEYS.WALLETS] });
    },
  });
};

export const useRemoveSettlementPreference = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: removeSettlementPreference,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SETTLEMENT_PREF_KEY });
      queryClient.invalidateQueries({ queryKey: ACCEPTED_TOKENS_KEY });
    },
  });
};

export const useUpdateSettlementWallet = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateSettlementWallet,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SETTLEMENT_PREF_KEY });
      queryClient.invalidateQueries({ queryKey: [WALLET_QUERY_KEYS.WALLETS] });
    },
  });
};
