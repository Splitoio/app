"use client";

import { X, Loader2, ChevronDown, MinusCircle } from "lucide-react";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { fadeIn, scaleIn } from "@/utils/animations";
import { toast } from "sonner";
import Image from "next/image";
import { GroupBalance, User } from "@/api-helpers/modelSchema";
import { useSettleDebt } from "@/features/settle/hooks/use-splits";
import { useHandleEscapeToCloseModal } from "@/hooks/useHandleEscape";
import { useQueryClient } from "@tanstack/react-query";
import { QueryKeys } from "@/lib/constants";
import { useGetFriends } from "@/features/friends/hooks/use-get-friends";
import { useGetAllGroups } from "@/features/groups/hooks/use-create-group";
import { useBalances } from "@/features/balances/hooks/use-balances";
import ResolverSelector, { Option as TokenOption } from "./ResolverSelector";
import { useOrganizedCurrencies } from "@/features/currencies/hooks/use-currencies";
import { useAuthStore } from "@/stores/authStore";
import { useWallet } from "@/hooks/useWallet";
import { useUserWallets } from "@/features/wallets/hooks/use-wallets";
import { WalletSelector as ShadcnWalletSelector } from "@/components/WalletSelector";

// Define a type for friend data coming from the API
interface FriendWithBalances {
  id: string;
  name: string;
  email: string;
  image: string | null;
  balances: Array<{ currency: string; amount: number }>;
  stellarAccount?: string | null;
}

interface SettleDebtsModalProps {
  isOpen: boolean;
  onClose: () => void;
  balances?: GroupBalance[];
  groupId?: string;
  members?: User[];
  showIndividualView?: boolean;
  selectedFriendId?: string | null;
  defaultCurrency?: string; // <-- add this
  specificAmount?: number; // Add specific amount for individual debt settlement
}

export function SettleDebtsModal({
  isOpen,
  onClose,
  balances = [],
  groupId = "",
  members = [],
  showIndividualView = false,
  selectedFriendId = null,
  defaultCurrency,
  specificAmount, // Add this parameter
}: SettleDebtsModalProps) {
  const user = useAuthStore((state) => state.user);
  const {
    isConnected: walletConnected,
    isConnecting,
    connectWallet,
    wallet,
    aptosWallet,
    address,
    walletType,
  } = useWallet();
  const [selectedToken, setSelectedToken] = useState<TokenOption | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [excludedFriendIds, setExcludedFriendIds] = useState<string[]>([]);
  const [totalAmount, setTotalAmount] = useState("0");
  const [individualAmount, setIndividualAmount] = useState("0");
  const [selectedChain, setSelectedChain] = useState<string | null>(null);
  const [availableChainsForToken, setAvailableChainsForToken] = useState<string[]>([]);

  const settleDebtMutation = useSettleDebt(groupId);
  const queryClient = useQueryClient();
  const { data: friends } = useGetFriends();
  const { data: groups } = useGetAllGroups();
  const { data: balanceData } = useBalances();
  const { data: organizedCurrencies } = useOrganizedCurrencies();
  const { data: walletData } = useUserWallets();
  const wallets = walletData?.accounts || [];
  const stellarWallet = wallets.find(w => w.chainId === "stellar");
  const userStellarAddress = stellarWallet?.address || null;
  useHandleEscapeToCloseModal(isOpen, onClose);

  // Debug: Log user data
  useEffect(() => {
    console.log("[SettleDebtsModal] User data debug:", {
      user: user ? {
        id: user.id,
        name: user.name,
        stellarAccount: user.stellarAccount,
        hasStellarAccount: !!user.stellarAccount
      } : null,
      userStellarAddress,
      walletConnected,
      wallet: wallet ? 'exists' : 'null',
      walletAddress: address,
      walletType,
      userFromStore: user
    });
  }, [user, userStellarAddress, walletConnected, wallet, address, walletType]);

  // Reset excluded friends when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      console.log("[SettleDebtsModal] Modal opened", { 
        groupId, 
        showIndividualView, 
        selectedFriendId,
        userStellarAddress
      });
      setExcludedFriendIds([]);
    }
  }, [isOpen, groupId, showIndividualView, selectedFriendId, userStellarAddress]);

  // Set the selected user based on selectedFriendId prop
  useEffect(() => {
    if (selectedFriendId && friends) {
      const friend = friends.find((friend: any) => friend.id === selectedFriendId);
      if (friend) {
        setSelectedUser(friend as unknown as User);

        // Use specific amount if provided, otherwise calculate from friend balances
        if (specificAmount !== undefined) {
          setIndividualAmount(specificAmount.toFixed(2));
        } else {
          // Calculate amount owed to this specific friend
          const positiveBalance = friend.balances.find((b: any) => b.amount > 0);
          if (positiveBalance) {
            setIndividualAmount(positiveBalance.amount.toFixed(2));
          } else {
            setIndividualAmount("0");
          }
        }
      }
    } else if (!showIndividualView) {
      setSelectedUser(null);
    }
  }, [selectedFriendId, friends, showIndividualView, specificAmount]);

  // Calculate total debts across all groups on mount and when data changes
  useEffect(() => {
    if (friends) {
      const totalOwed = calculateTotalDebts(friends as FriendWithBalances[]);
      setTotalAmount(totalOwed.toFixed(2));
    }
  }, [friends, balanceData]);

  // Fetch available tokens
  useEffect(() => {
    if (isOpen && organizedCurrencies) {
      const chainCurrencies = Object.values(organizedCurrencies.chainGroups || {}).flat();
      let tokenToSelect = chainCurrencies[0];
      if (defaultCurrency) {
        const match = chainCurrencies.find(
          (t) => t.symbol === defaultCurrency
        );
        if (match) tokenToSelect = match;
      }
      if (tokenToSelect) {
        setSelectedToken({
          id: tokenToSelect.id,
          symbol: tokenToSelect.symbol,
          name: tokenToSelect.name,
          chainId: tokenToSelect.chainId || undefined,
          type: tokenToSelect.type,
        });
      }
    }
  }, [isOpen, organizedCurrencies, defaultCurrency]);

  // Update individualAmount when selectedUser changes
  useEffect(() => {
    if (selectedUser && specificAmount === undefined) {
      // Only update from user balances if no specific amount is provided
      const positiveBalance = (selectedUser as any).balances?.find((b: any) => b.amount > 0);
      if (positiveBalance) {
        setIndividualAmount(positiveBalance.amount.toFixed(2));
      } else {
        setIndividualAmount("0");
      }
    }
  }, [selectedUser, specificAmount]);

  // Update available chains when selectedToken changes
  useEffect(() => {
    if (selectedToken && organizedCurrencies) {
      // Find all tokens with the same symbol (across chains)
      const chainCurrencies = Object.values(organizedCurrencies.chainGroups || {}).flat();
      const matchingTokens = chainCurrencies.filter(
        (t) => t.symbol === selectedToken.symbol
      );
      const chains = matchingTokens.map((t) => t.chainId).filter(Boolean) as string[];
      setAvailableChainsForToken(chains);
      // Auto-select if only one chain
      if (chains.length === 1) {
        setSelectedChain(chains[0]);
      } else {
        setSelectedChain(selectedToken.chainId || null);
      }
    } else {
      setAvailableChainsForToken([]);
      setSelectedChain(null);
    }
  }, [selectedToken, organizedCurrencies]);

  // When chain changes, update selectedToken to the token on that chain
  useEffect(() => {
    if (
      selectedToken &&
      selectedChain &&
      organizedCurrencies &&
      selectedToken.chainId !== selectedChain
    ) {
      const chainCurrencies = Object.values(organizedCurrencies.chainGroups || {}).flat();
      const tokenOnChain = chainCurrencies.find(
        (t) => t.symbol === selectedToken.symbol && t.chainId === selectedChain
      );
      if (tokenOnChain) {
        setSelectedToken({
          id: tokenOnChain.id,
          symbol: tokenOnChain.symbol,
          name: tokenOnChain.name,
          chainId: tokenOnChain.chainId || undefined,
          type: tokenOnChain.type,
        });
      }
    }
  }, [selectedChain]);

  // Function to calculate total debts owed to all friends
  const calculateTotalDebts = (friendsList: FriendWithBalances[]) => {
    return friendsList.reduce((total, friend) => {
      const positiveBalances = friend.balances.filter((b) => b.amount > 0);
      const friendTotal = positiveBalances.reduce((sum: number, balance) => {
        return sum + balance.amount;
      }, 0);
      return total + friendTotal;
    }, 0);
  };

  // Calculate remaining total after excluding friends
  const calculateRemainingTotal = () => {
    if (!friends) return 0;

    const includedFriends = friends.filter(
      (friend: any) => !excludedFriendIds.includes(friend.id)
    );
    return calculateTotalDebts(includedFriends as FriendWithBalances[]);
  };

  // Toggle excluding a friend from settlement
  const toggleExcludeFriend = (friendId: string) => {
    setExcludedFriendIds((prev) => {
      if (prev.includes(friendId)) {
        return prev.filter((id) => id !== friendId);
      } else {
        return [...prev, friendId];
      }
    });
  };

  // Get friends with debts for showing in the modal
  const friendsWithDebts =
    friends?.filter((friend: any) =>
      friend.balances.some((balance: any) => balance.amount > 0)
    ) || [];

  // Helper to get the correct wallet address based on selected chain
  const getUserWalletAddress = () => {
    if (selectedChain === 'aptos') {
      const aptosWallet = wallets.find(w => w.chainId === 'aptos');
      return aptosWallet?.address || null;
    } else if (selectedChain === 'stellar') {
      // First try to get from connected wallet, then fallback to saved address
      return address || userStellarAddress;
    }
    // Add more chains as needed
    return null;
  };

  // Helper to check if wallet is connected for the selected chain
  const isWalletConnectedForChain = () => {
    if (selectedChain === 'aptos') {
      return aptosWallet.connected && aptosWallet.account?.address;
    } else if (selectedChain === 'stellar') {
      // For Stellar, check if the wallet is connected AND we have an address
      return walletConnected && wallet && (address || userStellarAddress);
    }
    return false;
  };

  // Helper to check if we can proceed with settlement
  const canProceedWithSettlement = () => {
    const result = {
      aptos: selectedChain === 'aptos' ? {
        connected: aptosWallet.connected,
        hasAddress: !!aptosWallet.account?.address,
        canProceed: aptosWallet.connected && aptosWallet.account?.address
      } : null,
      stellar: selectedChain === 'stellar' ? {
        walletConnected,
        hasWallet: !!wallet,
        address,
        userStellarAddress,
        hasAnyAddress: !!(address || userStellarAddress),
        canProceed: walletConnected && wallet && (address || userStellarAddress)
      } : null
    };
    
    console.log('[SettleDebtsModal] canProceedWithSettlement check:', {
      selectedChain,
      result,
      finalResult: selectedChain === 'aptos' ? result.aptos?.canProceed : result.stellar?.canProceed
    });
    
    if (selectedChain === 'aptos') {
      // For Aptos, need wallet connected and address available
      return aptosWallet.connected && aptosWallet.account?.address;
    } else if (selectedChain === 'stellar') {
      // For Stellar, need wallet connected and address (either from connected wallet or saved settings)
      return walletConnected && wallet && (address || userStellarAddress);
    }
    return false;
  };

  const handleSettleOne = async (settleWith: User) => {
    const userWalletAddress = getUserWalletAddress();
    
    // Check wallet connection first
    if (!canProceedWithSettlement()) {
      if (selectedChain === 'aptos') {
        toast.error("Please connect your Aptos wallet first.");
      } else {
        toast.error("Please connect your Stellar wallet first.");
      }
      connectWallet();
      return;
    }
    
    if (!userWalletAddress) {
      toast.error(`Please connect your ${selectedChain === 'aptos' ? 'Aptos' : 'Stellar'} wallet or add your wallet address in settings first.`);
      return;
    }
    
    if (!selectedToken) {
      toast.error("Please select a payment token");
      return;
    }
    const payload = {
      groupId,
      address: userWalletAddress,
      settleWithId: settleWith.id,
      selectedTokenId: selectedToken.id,
      selectedChainId: selectedChain || undefined,
      amount: parseFloat(individualAmount),
    };
    settleDebtMutation.mutate(payload, {
      onSuccess: () => {
        toast.success(`Successfully settled debt with ${settleWith.name}`);
        onClose();
      },
      onError: (err) => {
        console.error("[SettleDebtsModal] Error settling debt:", err);
        toast.error("Failed to settle debt", {
          description: "Please try again or check your wallet connection.",
        });
      }
    });
  };

  const handleSettleAll = async () => {
    const userWalletAddress = getUserWalletAddress();
    
    // Check wallet connection first
    if (!canProceedWithSettlement()) {
      if (selectedChain === 'aptos') {
        toast.error("Please connect your Aptos wallet first.");
      } else {
        toast.error("Please connect your Stellar wallet first.");
      }
      connectWallet();
      return;
    }
    
    if (!userWalletAddress) {
      toast.error(`Please connect your ${selectedChain === 'aptos' ? 'Aptos' : 'Stellar'} wallet or add your wallet address in settings first.`);
      return;
    }
    
    if (!selectedToken) {
      toast.error("Please select a payment token");
      return;
    }
    const payload = {
      groupId,
      address: userWalletAddress,
      selectedTokenId: selectedToken.id,
      selectedChainId: selectedChain || undefined,
      amount: parseFloat(totalAmount), // or remainingTotal if that's the correct value
    };
    settleDebtMutation.mutate(payload, {
      onSuccess: () => {
        onClose();
        toast.success("Successfully settled debts");
      },
      onError: (err) => {
        toast.error("Failed to settle debts", {
          description: "Please try again or check your wallet connection.",
        });
      }
    });
  };

  const isPending = settleDebtMutation.isPending;

  // Get the selected user's balance for individual settlement
  const selectedUserBalance = selectedUser
    ? (selectedUser as unknown as FriendWithBalances).balances.find(
        (balance) => balance.amount > 0
      )?.amount || 0
    : 0;

  // Calculate the remaining total after exclusions
  const remainingTotal = calculateRemainingTotal();

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 h-screen w-screen"
          {...fadeIn}
        >
          <motion.div
            className="fixed inset-0 bg-black/70 brightness-50"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          />
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full md:w-[90%] max-w-[600px] px-4 sm:px-0">
            {/* Settle All Debts Section - Only shown when header button is clicked */}
            {!showIndividualView && (
              <motion.div
                className="relative z-10 rounded-[24px] bg-black p-5 sm:p-8 border border-white/10 shadow-[0_0_15px_rgba(255,255,255,0.05)]"
                {...scaleIn}
              >
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="mb-1 text-xs sm:text-sm text-white/60">
                      Settle All Debt
                    </div>
                    <h2 className="text-xl sm:text-3xl font-semibold text-white">
                      Settle All Debts
                    </h2>
                  </div>
                  <button
                    onClick={onClose}
                    className="p-2 rounded-full hover:bg-white/[0.03] transition-colors"
                  >
                    <X className="h-5 w-5 text-white/60" />
                  </button>
                </div>

                <div className="space-y-4 sm:space-y-6">
                  {/* Show user's stored Stellar address */}
                  {userStellarAddress ? (
                    <div className="text-sm text-white/70">
                      Using address: {userStellarAddress.slice(0, 25)}...
                    </div>
                  ) : (
                    <div className="text-sm text-red-400">
                      Please add your Stellar wallet address in settings first.
                    </div>
                  )}

                  <div>
                    <div className="text-base sm:text-lg font-medium text-white mb-3 sm:mb-4">
                      Choose Payment Token
                    </div>

                    <div className="relative mb-3 sm:mb-4">
                      <button className="w-full flex items-center justify-between rounded-full h-12 sm:h-14 px-4 sm:px-6 bg-transparent border border-white/10 text-white">
                        <span className="text-base sm:text-lg">
                          {selectedToken?.symbol || "Token"}
                        </span>
                        <ChevronDown className="h-4 w-4 sm:h-5 sm:w-5 text-white/50" />
                      </button>
                    </div>

                    {availableChainsForToken.length > 1 && (
                      <div className="mb-3 sm:mb-4">
                        <label className="block text-white mb-1">Select Chain</label>
                        <select
                          value={selectedChain || ''}
                          onChange={e => setSelectedChain(e.target.value)}
                          className="w-full rounded px-3 py-2 bg-black border border-white/10 text-white"
                        >
                          {availableChainsForToken.map(chain => (
                            <option key={chain} value={chain}>
                              {chain.charAt(0).toUpperCase() + chain.slice(1)}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div className="relative">
                      <div className="w-full flex items-center justify-between rounded-full h-12 sm:h-14 px-4 sm:px-6 bg-transparent border border-white/10 text-white">
                        <input
                          type="text"
                          value={remainingTotal.toFixed(2)}
                          onChange={(e) => setTotalAmount(e.target.value)}
                          className="bg-transparent outline-none text-base sm:text-lg w-full"
                        />
                        <span className="text-base sm:text-lg text-white/50">
                          {selectedToken?.symbol || "Token"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3 sm:space-y-5 max-h-[200px] sm:max-h-[300px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                    {friendsWithDebts
                      .filter((friend: any) =>
                        friend.balances.some((b: any) => b.amount > 0)
                      )
                      .map((friend: any, index: number) => {
                        const positiveBalance = friend.balances.find(
                          (b: any) => b.amount > 0
                        );
                        const amount = positiveBalance
                          ? positiveBalance.amount
                          : 0;
                        const isExcluded = excludedFriendIds.includes(
                          friend.id
                        );

                        return (
                          <div
                            key={index}
                            className={`flex items-center justify-between ${
                              isExcluded ? "opacity-50" : ""
                            }`}
                          >
                            <div className="flex items-center gap-3 sm:gap-4">
                              <div className="h-10 w-10 sm:h-12 sm:w-12 overflow-hidden rounded-full">
                                <Image
                                  src={
                                    friend.image ||
                                    `https://api.dicebear.com/9.x/identicon/svg?seed=${friend.id}`
                                  }
                                  alt={friend.name || "User"}
                                  width={48}
                                  height={48}
                                  className="h-full w-full object-cover"
                                  onError={(e) => {
                                    // Fallback to dicebear
                                    const target = e.target as HTMLImageElement;
                                    target.src = `https://api.dicebear.com/9.x/identicon/svg?seed=${friend.id}`;
                                  }}
                                />
                              </div>
                              <div>
                                <p className="text-mobile-base sm:text-xl text-white font-medium">
                                  {friend.name}
                                </p>
                                <p className="text-mobile-sm sm:text-base text-white/60">
                                  You owe{" "}
                                  <span className="text-[#FF4444]">
                                    ${amount.toFixed(2)}
                                  </span>
                                </p>
                              </div>
                            </div>

                            <button
                              className={`flex items-center justify-center h-8 w-8 sm:h-10 sm:w-10 rounded-full border border-white/10 hover:bg-white/5 transition-colors ${
                                isExcluded ? "bg-white/5" : ""
                              }`}
                              onClick={() => toggleExcludeFriend(friend.id)}
                              title={
                                isExcluded
                                  ? "Include in settlement"
                                  : "Exclude from settlement"
                              }
                            >
                              <MinusCircle
                                className={`h-4 w-4 sm:h-5 sm:w-5 text-white ${
                                  isExcluded ? "text-red-500" : "text-white/70"
                                }`}
                              />
                            </button>
                          </div>
                        );
                      })}

                    {friendsWithDebts.filter((friend: any) =>
                      friend.balances.some((b: any) => b.amount > 0)
                    ).length === 0 && (
                      <div className="text-center text-white/60 py-4 text-mobile-sm sm:text-base">
                        No debts to settle
                      </div>
                    )}
                  </div>
                </div>

                {/* Show wallet connection component for any chain if not connected */}
                {!canProceedWithSettlement() && (
                  <div className="mb-6">
                    <div className="text-base sm:text-lg font-medium text-white mb-3">
                      {selectedChain === 'aptos' ? 'Connect Your Aptos Wallet' : 'Connect Your Stellar Wallet'}
                    </div>
                    {selectedChain === 'aptos' && <ShadcnWalletSelector />}
                  </div>
                )}

                {canProceedWithSettlement() ? (
                  <button
                    className="w-full mt-8 sm:mt-12 flex items-center justify-center gap-2 text-mobile-base sm:text-lg font-medium h-10 sm:h-14 bg-white text-black rounded-full hover:bg-white/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={() => {
                      console.log("[SettleDebtsModal] Settle All button clicked", { isPending, remainingTotal, friendsWithDebtsLength: friendsWithDebts.length });
                      handleSettleAll();
                    }}
                    disabled={
                      isPending ||
                      remainingTotal <= 0 ||
                      friendsWithDebts.length === 0
                    }
                  >
                    {isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin" />
                        <span>Settling payment...</span>
                      </>
                    ) : (
                      <>
                        <Image
                          src="/coins-dollar.svg"
                          alt="Settle Payment"
                          width={24}
                          height={24}
                          className="invert h-4 w-4 sm:h-5 sm:w-5"
                        />
                        <span>Settle Payment</span>
                      </>
                    )}
                  </button>
                ) : (
                  selectedChain === 'stellar' && (
                    <button
                      className="w-full mt-8 sm:mt-12 flex items-center justify-center gap-2 text-sm font-medium h-10 sm:h-12 px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none"
                      onClick={connectWallet}
                    >
                      <span>Connect Stellar Wallet</span>
                    </button>
                  )
                )}
                
                {/* Show appropriate wallet connection message */}
                {selectedChain === 'aptos' && !isWalletConnectedForChain() && (
                  <div className="text-sm text-amber-400 mt-2 text-center">
                    Please connect your Aptos wallet to continue
                  </div>
                )}
                {selectedChain === 'stellar' && !getUserWalletAddress() && (
                  <div className="text-sm text-red-400 mt-2 text-center">
                    Please connect your Stellar wallet or add your Stellar wallet address in settings first.
                  </div>
                )}
              </motion.div>
            )}

            {/* Settle Individual Debt Section - Only shown when a friend's button is clicked */}
            {showIndividualView && (
              <motion.div
                className="relative z-10 rounded-[24px] bg-black p-5 sm:p-8 border border-white/10 shadow-[0_0_15px_rgba(255,255,255,0.05)]"
                {...scaleIn}
              >
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="mb-1 text-xs sm:text-sm text-white/60">
                      Settle Individual Debt
                    </div>
                    <h2 className="text-xl sm:text-3xl font-semibold text-white">
                      {selectedUser
                        ? `Settle ${selectedUser.name}'s Debts`
                        : "Settle Individual Debt"}
                    </h2>
                  </div>
                  <button
                    onClick={onClose}
                    className="p-2 rounded-full hover:bg-white/[0.03] transition-colors"
                  >
                    <X className="h-5 w-5 text-white/60" />
                  </button>
                </div>

                <div className="space-y-4 sm:space-y-6">
                  <div>
                    <div className="text-base sm:text-lg font-medium text-white mb-3 sm:mb-4">
                      Choose Payment Token
                    </div>

                    <div className="relative mb-3 sm:mb-4">
                      <ResolverSelector
                        value={selectedToken || undefined}
                        onChange={(option) => setSelectedToken(option || null)}
                      />
                    </div>

                    {availableChainsForToken.length > 1 && (
                      <div className="mb-3 sm:mb-4">
                        <label className="block text-white mb-1">Select Chain</label>
                        <select
                          value={selectedChain || ''}
                          onChange={e => setSelectedChain(e.target.value)}
                          className="w-full rounded px-3 py-2 bg-black border border-white/10 text-white"
                        >
                          {availableChainsForToken.map(chain => (
                            <option key={chain} value={chain}>
                              {chain.charAt(0).toUpperCase() + chain.slice(1)}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div className="relative">
                      <div className="w-full flex items-center justify-between rounded-full h-12 sm:h-14 px-4 sm:px-6 bg-transparent border border-white/10 text-white">
                        <input
                          type="text"
                          value={individualAmount}
                          onChange={(e) => setIndividualAmount(e.target.value)}
                          className="bg-transparent outline-none text-base sm:text-lg w-full"
                        />
                        <span className="text-base sm:text-lg text-white/50">
                          {selectedToken?.symbol || "Token"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {!selectedUser && (
                    <div className="text-center text-white/60 py-4 text-mobile-sm sm:text-base">
                      Select a user to settle individual debt
                    </div>
                  )}

                  {selectedUser && (
                    <div className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 bg-white/5 rounded-xl">
                      <div className="h-10 w-10 sm:h-14 sm:w-14 overflow-hidden rounded-full">
                        <Image
                          src={
                            selectedUser.image ||
                            `https://api.dicebear.com/9.x/identicon/svg?seed=${selectedUser.id}`
                          }
                          alt={selectedUser.name || "User"}
                          width={56}
                          height={56}
                          className="h-full w-full object-cover"
                          onError={(e) => {
                            // Fallback to dicebear
                            const target = e.target as HTMLImageElement;
                            target.src = `https://api.dicebear.com/9.x/identicon/svg?seed=${selectedUser.id}`;
                          }}
                        />
                      </div>
                      <div>
                        <p className="text-mobile-base sm:text-xl text-white font-medium">
                          {selectedUser.name}
                        </p>
                        <p className="text-mobile-sm sm:text-base text-white/60">
                          You owe{" "}
                          <span className="text-[#FF4444]">
                            ${Math.abs(selectedUserBalance).toFixed(2)}
                          </span>
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Show wallet connection component for any chain if not connected */}
                {!canProceedWithSettlement() && (
                  <div className="mb-6">
                    <div className="text-base sm:text-lg font-medium text-white mb-3">
                      {selectedChain === 'aptos' ? 'Connect Your Aptos Wallet' : 'Connect Your Stellar Wallet'}
                    </div>
                    {selectedChain === 'aptos' && <ShadcnWalletSelector />}
                  </div>
                )}

                {canProceedWithSettlement() ? (
                  <button
                    className="w-full mt-8 sm:mt-12 flex items-center justify-center gap-2 text-mobile-base sm:text-lg font-medium h-10 sm:h-14 bg-white text-black rounded-full hover:bg-white/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={() => selectedUser && handleSettleOne(selectedUser)}
                    disabled={
                      isPending ||
                      !selectedUser ||
                      parseFloat(individualAmount) <= 0 ||
                      !selectedToken
                    }
                  >
                    {isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin" />
                        <span>Settling payment...</span>
                      </>
                    ) : (
                      <>
                        <Image
                          src="/coins-dollar.svg"
                          alt="Settle Payment"
                          width={24}
                          height={24}
                          className="invert h-4 w-4 sm:h-5 sm:w-5"
                        />
                        <span>Settle Payment</span>
                      </>
                    )}
                  </button>
                ) : (
                  selectedChain === 'stellar' && (
                    <button
                      className="text-white transition-colors text-base flex items-center justify-center gap-2 w-full bg-transparent border py-3 rounded-full mt-2 border-white/40 hover:bg-white/10"
                      onClick={connectWallet}
                    >
                      <span>Connect Stellar Wallet</span>
                    </button>
                  )
                )}
              </motion.div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
