"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2 } from "lucide-react";
import { useHandleEscapeToCloseModal } from "@/hooks/useHandleEscape";
import { SettleDebtsModal } from "@/components/settle-debts-modal";
import { apiClient } from "@/api-helpers/client";
import { toast } from "sonner";
import Image from "next/image";
import { User as ApiUser, GroupBalance as ApiGroupBalance } from "@/api-helpers/modelSchema";

interface User {
  id: string;
  name: string;
  email: string;
  image?: string | null;
}

interface GroupBalance {
  groupId: string;
  currency: string;
  userId: string;
  firendId: string;
  amount: number;
  updatedAt: string;
}

interface GroupData {
  id: string;
  name: string;
  userId: string;
  description?: string | null;
  image?: string | null;
  defaultCurrency: string;
  createdAt: string;
  updatedAt: string;
  lockPrice: boolean;
  groupBalances: GroupBalance[];
  expenses: any[];
  balances: Record<string, number>;
  groupUsers?: Array<{
    user: {
      id: string;
      name: string;
      email: string;
      image?: string | null;
    };
  }>;
}

interface FriendData {
  id: string;
  email: string;
  name: string;
  image: string | null;
  balances: Array<{ currency: string; amount: number }>;
}

interface FriendsBreakdownModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSettleAll?: () => void; // Callback to open main settle debts modal
}

const scaleIn = {
  initial: { scale: 0.9, opacity: 0 },
  animate: { scale: 1, opacity: 1 },
  exit: { scale: 0.9, opacity: 0 },
  transition: { duration: 0.2, ease: "easeOut" },
};

export function FriendsBreakdownModal({
  isOpen,
  onClose,
  onSettleAll,
}: FriendsBreakdownModalProps) {
  const [user, setUser] = useState<User | null>(null);
  const [groupsData, setGroupsData] = useState<GroupData[]>([]);
  const [friendsData, setFriendsData] = useState<FriendData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSettleModalOpen, setIsSettleModalOpen] = useState(false);
  const [selectedDebt, setSelectedDebt] = useState<{
    groupId: string;
    friendId: string;
    amount: number;
    currency: string;
    groupName: string;
    friendName: string;
    group?: GroupData;
    specificAmount?: number;
  } | null>(null);

  useHandleEscapeToCloseModal(isOpen, onClose);

  // Fetch user details and group balances when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchUserAndBalances();
    }
  }, [isOpen]);

  const fetchUserAndBalances = async () => {
    setIsLoading(true);
    try {
      // Fetch user details
      const userData = await apiClient.get("/users/me") as User;
      setUser(userData);

      // Fetch friends data
      const friendsResponse = await apiClient.get("/users/friends") as FriendData[];
      setFriendsData(friendsResponse);

      // Fetch group balances
      const balancesData = await apiClient.get("/groups/balances") as GroupData[];
      setGroupsData(balancesData);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load debt breakdown");
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate debts that need to be paid (positive balances)
  const calculateDebts = () => {
    if (!user || !groupsData) return [];

    const debts: Array<{
      groupId: string;
      groupName: string;
      friendId: string;
      friendName: string;
      friendEmail: string;
      friendImage: string | null;
      amount: number;
      currency: string;
    }> = [];

    groupsData.forEach((group) => {
      group.groupBalances.forEach((balance) => {
        // Only include positive amounts (debts user owes)
        if (balance.userId === user.id && balance.amount > 0) {
          // Find friend from the friends API data first
          const friendFromAPI = friendsData.find(friend => friend.id === balance.firendId);
          
          // Fall back to group users if not found in friends API
          const friendUser = group.groupUsers?.find(
            (gu) => gu.user.id === balance.firendId
          )?.user;

          // Use friend data from API if available, otherwise use group user data
          const friendName = friendFromAPI?.name || friendUser?.name || friendUser?.email || balance.firendId;
          const friendEmail = friendFromAPI?.email || friendUser?.email || "";
          const friendImage = friendFromAPI?.image || friendUser?.image || null;

          debts.push({
            groupId: group.id,
            groupName: group.name,
            friendId: balance.firendId,
            friendName,
            friendEmail,
            friendImage,
            amount: balance.amount,
            currency: balance.currency,
          });
        }
      });
    });

    return debts;
  };

  // Group debts by friend
  const groupDebtsByFriend = () => {
    const debts = calculateDebts();
    const groupedDebts = new Map<string, {
      friendId: string;
      friendName: string;
      friendEmail: string;
      friendImage: string | null;
      totalAmount: number;
      debts: typeof debts;
    }>();

    debts.forEach(debt => {
      const existing = groupedDebts.get(debt.friendId);
      if (existing) {
        existing.totalAmount += debt.amount;
        existing.debts.push(debt);
      } else {
        groupedDebts.set(debt.friendId, {
          friendId: debt.friendId,
          friendName: debt.friendName,
          friendEmail: debt.friendEmail,
          friendImage: debt.friendImage,
          totalAmount: debt.amount,
          debts: [debt],
        });
      }
    });

    return Array.from(groupedDebts.values());
  };

  const handleSettleDebt = (debt: {
    groupId: string;
    friendId: string;
    amount: number;
    currency: string;
    groupName: string;
    friendName: string;
  }) => {
    // Find the specific group to get proper balance and member data
    const group = groupsData.find(g => g.id === debt.groupId);
    if (!group) {
      toast.error("Group not found");
      return;
    }

    setSelectedDebt({
      ...debt,
      // Include the group and member data needed for settle debts modal
      group,
      specificAmount: debt.amount, // Pass the specific debt amount
    });
    setIsSettleModalOpen(true);
  };

  const debts = calculateDebts();
  const friendGroups = groupDebtsByFriend();
  const totalAmount = debts.reduce((sum, debt) => sum + debt.amount, 0);

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div
              className="absolute inset-0 bg-black/80"
              onClick={onClose}
            />
            <motion.div
              className="relative w-full max-w-2xl max-h-[90vh] overflow-auto rounded-[24px] bg-black p-5 sm:p-8 border border-white/10 shadow-[0_0_15px_rgba(255,255,255,0.05)]"
              {...scaleIn}
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <div className="mb-1 text-xs sm:text-sm text-white/60">
                    Debt Breakdown
                  </div>
                  <h2 className="text-xl sm:text-3xl font-semibold text-white">
                    Your Outstanding Debts
                  </h2>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 rounded-full hover:bg-white/[0.03] transition-colors"
                >
                  <X className="h-5 w-5 text-white/60" />
                </button>
              </div>

              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-8 w-8 animate-spin text-white/50" />
                    <p className="text-white/70">Loading debt breakdown...</p>
                  </div>
                </div>
              ) : (
                <>
                  {/* Total Amount Summary */}
                  <div className="bg-white/5 rounded-xl p-4 mb-6">
                    <div className="text-center">
                      <p className="text-white/60 text-sm mb-2">Total Amount You Owe</p>
                      <p className="text-2xl font-semibold text-red-400">
                        ${totalAmount.toFixed(2)}
                      </p>
                    </div>
                  </div>

                  {/* Individual Friends and their debts */}
                  <div className="space-y-4">
                    {friendGroups.length === 0 ? (
                      <div className="text-center py-8 text-white/60">
                        No outstanding debts found
                      </div>
                    ) : (
                      friendGroups.map((friendGroup, index) => (
                        <div
                          key={friendGroup.friendId}
                          className="border border-white/10 rounded-xl overflow-hidden"
                        >
                          {/* Friend Header */}
                          <div className="flex items-center justify-between p-4 bg-white/5">
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 overflow-hidden rounded-full">
                                <Image
                                  src={
                                    friendGroup.friendImage ||
                                    `https://api.dicebear.com/9.x/identicon/svg?seed=${friendGroup.friendId}`
                                  }
                                  alt={friendGroup.friendName}
                                  width={40}
                                  height={40}
                                  className="h-full w-full object-cover"
                                />
                              </div>
                              <div>
                                <p className="text-white font-medium">
                                  {friendGroup.friendName}
                                </p>
                                <p className="text-white/60 text-sm">
                                  Total owed: <span className="text-red-400 font-medium">
                                    ${friendGroup.totalAmount.toFixed(2)}
                                  </span>
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* Individual debts in different groups */}
                          <div className="divide-y divide-white/10">
                            {friendGroup.debts.map((debt, debtIndex) => (
                              <div
                                key={`${debt.groupId}-${debtIndex}`}
                                className="flex items-center justify-between p-4 hover:bg-white/5 transition-colors"
                              >
                                <div>
                                  <p className="text-white text-sm">
                                    Group: {debt.groupName}
                                  </p>
                                  <p className="text-white/60 text-xs">
                                    Amount: <span className="text-red-400 font-medium">
                                      ${debt.amount.toFixed(2)} {debt.currency}
                                    </span>
                                  </p>
                                </div>

                                <button
                                  onClick={() => handleSettleDebt({
                                    ...debt,
                                    friendName: friendGroup.friendName,
                                  })}
                                  className="flex items-center gap-2 px-3 py-1 rounded-full bg-white text-black text-xs font-medium hover:bg-white/90 transition-colors"
                                >
                                  <Image
                                    src="/coins-dollar.svg"
                                    alt="Settle"
                                    width={12}
                                    height={12}
                                    className="invert"
                                  />
                                  Settle
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Settle All Button */}
                  {(friendGroups.length > 1 || debts.length > 1) && (
                    <div className="mt-6 pt-6 border-t border-white/10">
                      <button
                        onClick={() => {
                          if (onSettleAll) {
                            onClose();
                            onSettleAll();
                          } else {
                            toast.info("Settle all functionality coming soon!");
                          }
                        }}
                        className="w-full flex items-center justify-center gap-2 py-3 px-6 rounded-full bg-white text-black font-medium hover:bg-white/90 transition-colors"
                      >
                        <Image
                          src="/coins-dollar.svg"
                          alt="Settle All"
                          width={20}
                          height={20}
                          className="invert"
                        />
                        Settle All Debts (${totalAmount.toFixed(2)})
                      </button>
                    </div>
                  )}
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Settle Debts Modal */}
      {selectedDebt && (
        <SettleDebtsModal
          isOpen={isSettleModalOpen}
          onClose={() => {
            setIsSettleModalOpen(false);
            setSelectedDebt(null);
            onClose(); // Close the friends breakdown modal as well
          }}
          balances={selectedDebt.group?.groupBalances?.map(balance => ({
            ...balance,
            updatedAt: new Date(balance.updatedAt)
          })) || []}
          groupId={selectedDebt.groupId}
          members={selectedDebt.group?.groupUsers?.map(gu => ({
            id: gu.user.id,
            name: gu.user.name || gu.user.email,
            email: gu.user.email || "",
            emailVerified: false,
            image: gu.user.image,
            currency: "USD", // Default currency
            stellarAccount: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          })) as ApiUser[] || []}
          defaultCurrency={selectedDebt.currency}
          showIndividualView={selectedDebt.friendName !== "all"}
          selectedFriendId={selectedDebt.friendName !== "all" ? selectedDebt.friendId : null}
          specificAmount={selectedDebt.specificAmount} // Pass the specific amount
        />
      )}
    </>
  );
}
