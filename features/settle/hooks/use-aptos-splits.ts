import { useMutation, useQueryClient } from "@tanstack/react-query";
import { settleDebtAptos, settleDebtAptosWithSubmit } from "../api/aptos-client";
import { QueryKeys, invalidateSettlementCaches } from "@/lib/constants";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { toast } from "sonner";

export const useSettleDebtAptos = (groupId: string) => {
  const queryClient = useQueryClient();
  const wallet = useWallet();

  return useMutation({
    mutationFn: (payload: Parameters<typeof settleDebtAptos>[0]) => {
      // Check if wallet is connected and has required methods
      console.log("[useSettleDebtAptos] Wallet state:", {
        connected: wallet.connected,
        account: wallet.account,
        hasSignTransaction: !!wallet.signTransaction,
        hasSubmitTransaction: !!wallet.submitTransaction,
      });
      
      if (!wallet.connected) {
        throw new Error("Please connect your Aptos wallet first.");
      }
      
      if (!wallet.account) {
        throw new Error("Wallet account not found. Please ensure your wallet is properly connected.");
      }
      
      // Use the wallet context from Aptos wallet adapter
      const walletContext = {
        account: wallet.account,
        signTransaction: wallet.signTransaction,
        submitTransaction: wallet.submitTransaction,
        connected: wallet.connected,
      };
      
      return settleDebtAptos(payload, walletContext);
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
          errorMsg = error.data.error;
        }
      }
      
      console.error("Settlement error:", error);
      toast.error("Transaction failed", {
        description: errorMsg,
      });
    },
  });
};

// Alternative hook using submitTransaction method
export const useSettleDebtAptosWithSubmit = (groupId: string) => {
  const queryClient = useQueryClient();
  const wallet = useWallet();

  return useMutation({
    mutationFn: (payload: Parameters<typeof settleDebtAptosWithSubmit>[0]) => {
      // Check if wallet is connected and has required methods
      console.log("[useSettleDebtAptosWithSubmit] Wallet state:", {
        connected: wallet.connected,
        account: wallet.account,
        hasSignTransaction: !!wallet.signTransaction,
        hasSubmitTransaction: !!wallet.submitTransaction,
      });
      
      if (!wallet.connected) {
        throw new Error("Please connect your Aptos wallet first.");
      }
      
      if (!wallet.account) {
        throw new Error("Wallet account not found. Please ensure your wallet is properly connected.");
      }
      
      if (!wallet.submitTransaction) {
        throw new Error("Your wallet does not support direct transaction submission. Please try a different wallet or method.");
      }
      
      // Use the wallet context from Aptos wallet adapter
      const walletContext = {
        account: wallet.account,
        signTransaction: wallet.signTransaction,
        submitTransaction: wallet.submitTransaction,
        connected: wallet.connected,
      };
      
      return settleDebtAptosWithSubmit(payload, walletContext);
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
          errorMsg = error.data.error;
        }
      }
      
      console.error("Settlement error:", error);
      toast.error("Transaction failed", {
        description: errorMsg,
      });
    },
  });
};
