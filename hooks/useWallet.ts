"use client";

import { useState, useCallback, useEffect } from "react";
import { useGroups } from "@/stores/groups";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  StellarWalletsKit,
  WalletNetwork,
  allowAllModules,
  XBULL_ID,
  ISupportedWallet,
} from "@creit.tech/stellar-wallets-kit";

type WalletStore = {
  isConnected: boolean;
  address: string | null;
  setWalletState: (state: {
    isConnected: boolean;
    address: string | null;
  }) => void;
  disconnect: () => void;
  wallet: StellarWalletsKit | null;
  setWallet: (wallet: StellarWalletsKit) => void;
};

const useWalletStore = create<WalletStore>()((set) => ({
  isConnected: false,
  address: null,
  wallet: null,
  setWalletState: (state) => set(state),
  disconnect: () => set({ isConnected: false, address: null }),
  setWallet: (wallet) => set({ wallet }),
}));

export function useWallet() {
  const {
    isConnected,
    address,
    setWalletState,
    disconnect,
    wallet,
    setWallet,
  } = useWalletStore();
  const [isConnecting, setIsConnecting] = useState(false);
  const { setConnectedAddress } = useGroups();

  const disconnectWallet = useCallback(() => {
    disconnect();
    setConnectedAddress(null);
  }, [disconnect, setConnectedAddress]);

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
            setWallet(kit);

            const response = await kit.getAddress();
            const walletAddress =
              typeof response === "object" && response !== null
                ? response.address
                : response;

            if (typeof walletAddress === "string") {
              setWalletState({
                isConnected: true,
                address: walletAddress,
              });
              setConnectedAddress(walletAddress);
            }
          } catch (error) {
            console.error("Error in wallet selection:", error);
            disconnectWallet();
          }
        },
      });
    } catch (error) {
      console.error("Error connecting wallet:", error);
      disconnectWallet();
    } finally {
      setIsConnecting(false);
    }
  }, [setConnectedAddress, setWalletState, disconnectWallet]);

  return {
    isConnected,
    address,
    isConnecting,
    connectWallet,
    disconnectWallet,
    wallet,
    setWallet,
  };
}
