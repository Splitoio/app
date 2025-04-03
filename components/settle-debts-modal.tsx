"use client";

import { X, Loader2, ChevronDown, MinusCircle } from "lucide-react";
import { useState, useEffect } from "react";
import { useWallet } from "@/hooks/useWallet";
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
}

export function SettleDebtsModal({
  isOpen,
  onClose,
  balances = [],
  groupId = "",
  members = [],
  showIndividualView = false,
  selectedFriendId = null,
}: SettleDebtsModalProps) {
  const { address, connectWallet, disconnectWallet, isConnected } = useWallet();
  const [selectedToken, setSelectedToken] = useState("USDT");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [excludedFriendIds, setExcludedFriendIds] = useState<string[]>([]);
  const [totalAmount, setTotalAmount] = useState("0");
  const [individualAmount, setIndividualAmount] = useState("0");

  const settleDebtMutation = useSettleDebt(groupId);
  const queryClient = useQueryClient();
  const { data: friends } = useGetFriends();
  const { data: groups } = useGetAllGroups();
  const { data: balanceData } = useBalances();
  useHandleEscapeToCloseModal(isOpen, onClose);

  // Reset excluded friends when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setExcludedFriendIds([]);
    }
  }, [isOpen]);

  // Set the selected user based on selectedFriendId prop
  useEffect(() => {
    if (selectedFriendId && friends) {
      const friend = friends.find((friend) => friend.id === selectedFriendId);
      if (friend) {
        setSelectedUser(friend as unknown as User);

        // Calculate amount owed to this specific friend
        const negativeBalance = friend.balances.find((b) => b.amount < 0);
        if (negativeBalance) {
          setIndividualAmount(Math.abs(negativeBalance.amount).toFixed(2));
        }
      }
    } else if (!showIndividualView) {
      setSelectedUser(null);
    }
  }, [selectedFriendId, friends, showIndividualView]);

  // Calculate total debts across all groups on mount and when data changes
  useEffect(() => {
    if (friends) {
      const totalOwed = calculateTotalDebts(friends as FriendWithBalances[]);
      setTotalAmount(totalOwed.toFixed(2));
    }
  }, [friends, balanceData]);

  // Function to calculate total debts owed to all friends
  const calculateTotalDebts = (friendsList: FriendWithBalances[]) => {
    return friendsList.reduce((total, friend) => {
      const negativeBalances = friend.balances.filter((b) => b.amount < 0);
      const friendTotal = negativeBalances.reduce((sum: number, balance) => {
        return sum + Math.abs(balance.amount);
      }, 0);
      return total + friendTotal;
    }, 0);
  };

  // Calculate remaining total after excluding friends
  const calculateRemainingTotal = () => {
    if (!friends) return 0;

    const includedFriends = friends.filter(
      (friend) => !excludedFriendIds.includes(friend.id)
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
    friends?.filter((friend) =>
      friend.balances.some((balance) => balance.amount < 0)
    ) || [];

  const handleSettleOne = async (settleWith: User) => {
    if (!address) {
      toast.error("Please connect your wallet to settle debts");
      return;
    }

    if (!settleWith.stellarAccount) {
      toast.error(`${settleWith.name} doesn't have a Stellar wallet connected`);
      return;
    }

    // Create a payload that matches the expected structure by the API
    const payload = {
      groupId,
      address,
      settleWithId: settleWith.id,
    };

    // Include amount information in the request
    const amountValue = parseFloat(individualAmount);

    settleDebtMutation.mutate(payload, {
      onSuccess: () => {
        toast.success(`Successfully settled debt with ${settleWith.name}`);

        queryClient.invalidateQueries({
          queryKey: [QueryKeys.GROUPS, groupId],
        });

        queryClient.invalidateQueries({ queryKey: [QueryKeys.GROUPS] });
        queryClient.invalidateQueries({ queryKey: [QueryKeys.BALANCES] });

        onClose();
      },
    });
  };

  const handleSettleAll = async () => {
    if (!address) {
      toast.error("Please connect your wallet to settle debts");
      return;
    }

    // Filter out excluded friends
    const friendsToSettle = friendsWithDebts.filter(
      (friend) => !excludedFriendIds.includes(friend.id)
    );

    // Check if any of the users don't have a stellar account
    const usersWithoutStellarAccount = friendsToSettle
      .filter((friend) => {
        // Use type assertion to check for stellarAccount property
        const user = friend as FriendWithBalances;
        return !user.stellarAccount;
      })
      .map((friend) => friend.name);

    if (usersWithoutStellarAccount.length > 0) {
      toast.error(`Some users don't have Stellar wallets`, {
        description: `${usersWithoutStellarAccount.join(
          ", "
        )} need to connect their Stellar wallets first.`,
      });
      return;
    }

    // Create a payload that matches the expected structure by the API
    const payload = {
      groupId,
      address,
    };

    // The amount and excludedUserIds can be passed in the query parameters or handled by the backend
    settleDebtMutation.mutate(payload, {
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: [QueryKeys.GROUPS, groupId],
        });

        queryClient.invalidateQueries({ queryKey: [QueryKeys.GROUPS] });
        queryClient.invalidateQueries({ queryKey: [QueryKeys.BALANCES] });

        onClose();
        toast.success("Successfully settled debts");
      },
    });
  };

  const isPending = settleDebtMutation.isPending;

  // Get the selected user's balance for individual settlement
  const selectedUserBalance = selectedUser
    ? (selectedUser as unknown as FriendWithBalances).balances.find(
        (balance) => balance.amount < 0
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
            className="fixed inset-0 bg-black/30 backdrop-blur-[2px]"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          />
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full md:w-[90%] max-w-[600px]">
            {/* Settle All Debts Section - Only shown when header button is clicked */}
            {!showIndividualView && (
              <motion.div className="rounded-[24px] bg-black p-8" {...scaleIn}>
                <div className="mb-2 text-sm text-white/60">
                  Settle All Debt
                </div>
                <h2 className="text-3xl font-semibold text-white mb-8">
                  Settle All Debts
                </h2>

                <div className="space-y-6">
                  <div>
                    <div className="text-lg font-medium text-white mb-4">
                      Choose Payment Token
                    </div>

                    <div className="relative mb-4">
                      <button className="w-full flex items-center justify-between rounded-full h-14 px-6 bg-transparent border border-white/10 text-white">
                        <span className="text-lg">{selectedToken}</span>
                        <ChevronDown className="h-5 w-5 text-white/50" />
                      </button>
                    </div>

                    <div className="relative">
                      <div className="w-full flex items-center justify-between rounded-full h-14 px-6 bg-transparent border border-white/10 text-white">
                        <input
                          type="text"
                          value={remainingTotal.toFixed(2)}
                          onChange={(e) => setTotalAmount(e.target.value)}
                          className="bg-transparent outline-none text-lg w-full"
                        />
                        <span className="text-lg text-white/50">
                          {selectedToken}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-5 max-h-[300px] overflow-y-auto pr-2">
                    {friendsWithDebts
                      .filter((friend) =>
                        friend.balances.some((b) => b.amount < 0)
                      )
                      .map((friend, index) => {
                        const negativeBalance = friend.balances.find(
                          (b) => b.amount < 0
                        );
                        const amount = negativeBalance
                          ? Math.abs(negativeBalance.amount)
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
                            <div className="flex items-center gap-4">
                              <div className="h-12 w-12 overflow-hidden rounded-full">
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
                                <p className="text-xl text-white font-medium">
                                  {friend.name}
                                </p>
                                <p className="text-base text-white/60">
                                  You owe{" "}
                                  <span className="text-[#FF4444]">
                                    ${amount.toFixed(2)}
                                  </span>
                                </p>
                              </div>
                            </div>

                            <button
                              className={`flex items-center justify-center h-10 w-10 rounded-full border border-white/10 hover:bg-white/5 transition-colors ${
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
                                className={`h-5 w-5 text-white ${
                                  isExcluded ? "text-red-500" : "text-white/70"
                                }`}
                              />
                            </button>
                          </div>
                        );
                      })}

                    {friendsWithDebts.filter((friend) =>
                      friend.balances.some((b) => b.amount < 0)
                    ).length === 0 && (
                      <div className="text-center text-white/60 py-4">
                        No debts to settle
                      </div>
                    )}
                  </div>
                </div>

                <button
                  className="w-full mt-12 flex items-center justify-center gap-2 text-lg font-medium h-14 bg-white text-black rounded-full hover:bg-white/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={handleSettleAll}
                  disabled={
                    isPending ||
                    remainingTotal <= 0 ||
                    friendsWithDebts.length === 0
                  }
                >
                  {isPending ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span>Settling payment...</span>
                    </>
                  ) : (
                    <>
                      <Image
                        src="/coins-dollar.svg"
                        alt="Settle Payment"
                        width={24}
                        height={24}
                        className="invert"
                      />
                      <span>Settle Payment</span>
                    </>
                  )}
                </button>
              </motion.div>
            )}

            {/* Settle Individual Debt Section - Only shown when a friend's button is clicked */}
            {showIndividualView && (
              <motion.div className="rounded-[24px] bg-black p-8" {...scaleIn}>
                <div className="mb-2 text-sm text-white/60">
                  Settle Individual Debt
                </div>
                <h2 className="text-3xl font-semibold text-white mb-8">
                  {selectedUser
                    ? `Settle ${selectedUser.name}'s Debts`
                    : "Settle Individual Debt"}
                </h2>

                <div className="space-y-6">
                  <div>
                    <div className="text-lg font-medium text-white mb-4">
                      Choose Payment Token
                    </div>

                    <div className="relative mb-4">
                      <button className="w-full flex items-center justify-between rounded-full h-14 px-6 bg-transparent border border-white/10 text-white">
                        <span className="text-lg">{selectedToken}</span>
                        <ChevronDown className="h-5 w-5 text-white/50" />
                      </button>
                    </div>

                    <div className="relative">
                      <div className="w-full flex items-center justify-between rounded-full h-14 px-6 bg-transparent border border-white/10 text-white">
                        <input
                          type="text"
                          value={individualAmount}
                          onChange={(e) => setIndividualAmount(e.target.value)}
                          className="bg-transparent outline-none text-lg w-full"
                        />
                        <span className="text-lg text-white/50">
                          {selectedToken}
                        </span>
                      </div>
                    </div>
                  </div>

                  {!selectedUser && (
                    <div className="text-center text-white/60 py-4">
                      Select a user to settle individual debt
                    </div>
                  )}

                  {selectedUser && (
                    <div className="flex items-center gap-4 p-4 bg-white/5 rounded-xl">
                      <div className="h-14 w-14 overflow-hidden rounded-full">
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
                        <p className="text-xl text-white font-medium">
                          {selectedUser.name}
                        </p>
                        <p className="text-base text-white/60">
                          You owe{" "}
                          <span className="text-[#FF4444]">
                            ${Math.abs(selectedUserBalance).toFixed(2)}
                          </span>
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <button
                  className="w-full mt-12 flex items-center justify-center gap-2 text-lg font-medium h-14 bg-white text-black rounded-full hover:bg-white/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={() => selectedUser && handleSettleOne(selectedUser)}
                  disabled={
                    isPending ||
                    !selectedUser ||
                    parseFloat(individualAmount) <= 0
                  }
                >
                  {isPending ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span>Settling payment...</span>
                    </>
                  ) : (
                    <>
                      <Image
                        src="/coins-dollar.svg"
                        alt="Settle Payment"
                        width={24}
                        height={24}
                        className="invert"
                      />
                      <span>Settle Payment</span>
                    </>
                  )}
                </button>
              </motion.div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
