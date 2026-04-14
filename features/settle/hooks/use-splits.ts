import { useMutation, useQueryClient } from "@tanstack/react-query";
import { settleDebt } from "../api/client";
import { QueryKeys, invalidateSettlementCaches } from "@/lib/constants";
import { useWallet } from "@/hooks/useWallet";
import { toast } from "sonner";

export const useSettleDebt = (groupId: string) => {
  const queryClient = useQueryClient();
  const { wallet, walletType, isConnected, address, aptosWallet } = useWallet();

  return useMutation({
    mutationFn: (payload: Parameters<typeof settleDebt>[0]) => {
      // Use aptosWallet as fallback if main wallet is not available but we're on Aptos
      const walletToUse = wallet || (payload.selectedChainId === 'aptos' && aptosWallet?.connected ? {
        account: aptosWallet.account,
        connected: aptosWallet.connected,
        signTransaction: aptosWallet.signTransaction,
        submitTransaction: aptosWallet.submitTransaction,
        signAndSubmitTransaction: aptosWallet.signAndSubmitTransaction,
      } : undefined);

      return settleDebt(payload, walletToUse);
    },
    onSuccess: (data) => {
      // Add a small delay to ensure backend processing is complete
      setTimeout(() => {
        // Use the utility function for comprehensive cache invalidation
        invalidateSettlementCaches(queryClient, groupId);
      }, 1000); // 1 second delay
    },
    onError: (error: any) => {
      let errorMsg = "Unknown error";
      if (error && typeof error === "object") {
        if (Array.isArray(error.message)) {
          errorMsg = error.message.map((e: any) => e.message).join(", ");
        } else if (typeof error.message === "string") {
          errorMsg = error.message;
        } else if (error.data && error.data.error) {
          if (Array.isArray(error.data.error)) {
            errorMsg = error.data.error.map((e: any) => e.message || JSON.stringify(e)).join(", ");
          } else {
            errorMsg = error.data.error;
          }
        } else {
          errorMsg = JSON.stringify(error);
        }
      }
      toast.error("Error settling debt.", { description: errorMsg });
    },
  });
};
