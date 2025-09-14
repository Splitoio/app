"use client";

import { useState, useCallback, useEffect, use } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  StellarWalletsKit,
  WalletNetwork,
  allowAllModules,
  XBULL_ID,
  ISupportedWallet,
} from "@creit.tech/stellar-wallets-kit";

import { useWallet as useAptosWallet } from "@aptos-labs/wallet-adapter-react";

// Union type for both wallet types
type UnifiedWalletType =
  | StellarWalletsKit
  | {
      account: any;
      connected: boolean;
      signTransaction?: (args: any) => Promise<any>;
      submitTransaction?: (transaction: any) => Promise<any>;
      signAndSubmitTransaction?: (transaction: any) => Promise<any>;
    };

type WalletStore = {
  isConnected: boolean;
  address: string | null;
  walletType: "stellar" | "aptos" | null;
  setWalletState: (state: {
    isConnected: boolean;
    address: string | null;
    walletType?: "stellar" | "aptos" | null;
  }) => void;
  disconnect: () => void;
  wallet: UnifiedWalletType | null;
  setWallet: (wallet: UnifiedWalletType, type: "stellar" | "aptos") => void;
};

const useWalletStore = create<WalletStore>()((set) => ({
  isConnected: false,
  address: null,
  wallet: null,
  walletType: null,
  setWalletState: (state) => set(state),
  disconnect: () =>
    set({ isConnected: false, address: null, wallet: null, walletType: null }),
  setWallet: (wallet, type) => set({ wallet, walletType: type }),
}));

export function useWallet() {
  const {
    isConnected,
    address,
    setWalletState,
    disconnect,
    wallet,
    setWallet,
    walletType,
  } = useWalletStore();
  const [isConnecting, setIsConnecting] = useState(false);

  // Get Aptos wallet from the adapter
  const aptosWallet = useAptosWallet();
  console.log("[useWallet] Initializing wallet store", aptosWallet.account);

  // Sync Aptos wallet state with our store
  useEffect(() => {
    console.log("[useWallet] Aptos wallet state changed:", {
      connected: aptosWallet.connected,
      hasAccount: !!aptosWallet.account,
      address: aptosWallet.account?.address,
      currentWalletType: walletType,
      hasWalletInStore: !!wallet,
    });

    if (aptosWallet.connected && aptosWallet.account?.address) {
      // Update store with Aptos wallet if it's connected
      // Only skip if Stellar wallet is already connected and we want to prioritize it
      if (walletType !== "stellar") {
        const aptosWalletObj = {
          account: aptosWallet.account,
          connected: aptosWallet.connected,
          signTransaction: aptosWallet.signTransaction,
          submitTransaction: aptosWallet.submitTransaction,
          signAndSubmitTransaction: aptosWallet.signAndSubmitTransaction,
        };
        console.log(
          "[useWallet] Setting Aptos wallet in store:",
          aptosWalletObj
        );
        setWallet(aptosWalletObj, "aptos");
        setWalletState({
          isConnected: true,
          address: aptosWallet.account.address.toString(),
          walletType: "aptos",
        });
      }
    } else if (!aptosWallet.connected && walletType === "aptos") {
      // Aptos wallet disconnected, clear the store
      console.log("[useWallet] Aptos wallet disconnected, clearing store");
      disconnect();
    }
  }, [
    aptosWallet.connected,
    aptosWallet.account?.address,
    walletType,
    setWallet,
    setWalletState,
    disconnect,
  ]);

  const connectWallet = useCallback(async () => {
    try {
      setIsConnecting(true);
      const kit = new StellarWalletsKit({
        network: WalletNetwork.TESTNET,
        selectedWalletId: XBULL_ID,
        modules: allowAllModules(),
      });

      await kit.openModal({
        onWalletSelected: async (option: ISupportedWallet) => {
          try {
            kit.setWallet(option.id);
            setWallet(kit, "stellar");

            const response = await kit.getAddress();
            const walletAddress =
              typeof response === "object" && response !== null
                ? response.address
                : response;

            if (typeof walletAddress === "string") {
              setWalletState({
                isConnected: true,
                address: walletAddress,
                walletType: "stellar",
              });
            }
          } catch (error) {
            console.error("Error in wallet selection:", error);
          }
        },
      });
    } catch (error) {
      console.error("Error connecting wallet:", error);
    } finally {
      setIsConnecting(false);
    }
  }, [setWalletState, setWallet]);

  const returnValue = {
    isConnected,
    address,
    isConnecting,
    connectWallet,
    disconnectWallet: disconnect,
    wallet,
    setWallet,
    walletType,
    // Expose Aptos-specific properties for direct access if needed
    aptosWallet,
  };

  console.log("[useWallet] Hook returning:", {
    isConnected: returnValue.isConnected,
    address: returnValue.address,
    hasWallet: !!returnValue.wallet,
    walletType: returnValue.walletType,
    aptosConnected: returnValue.aptosWallet.connected,
    aptosAddress: returnValue.aptosWallet.account?.address,
  });

  return returnValue;
}
