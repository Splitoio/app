"use client";

import { GroupInfoHeader } from "@/components/group-info-header";
import { useWallet } from "@/hooks/useWallet";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { SettleDebtsModal } from "@/components/settle-debts-modal";
import { AddMemberModal } from "@/components/add-member-modal";
import { useGetGroupById, useMarkAsPaid, useDeleteGroup, useUpdateGroup } from "@/features/groups/hooks/use-create-group";
import { AddExpenseModal } from "@/components/add-expense-modal";

import { useAuthStore } from "@/stores/authStore";
import { Loader2, Plus, Settings, Users, Clock, X, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useReminders } from "@/features/reminders/hooks/use-reminders";
import { useGetAllCurrencies } from "@/features/currencies/hooks/use-currencies";
import axios from "axios";
import CurrencyDropdown from "@/components/currency-dropdown";
import TimeLockToggle from "@/components/ui/TimeLockToggle";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export default function GroupDetailsPage({
  params,
}: {
  params: { id: string };
}) {
  const { user } = useAuthStore();
  const groupId = params.id;
  const { data: group, isLoading } = useGetGroupById(groupId);
  const { address } = useWallet();
  const router = useRouter();
  const { sendReminder, isSending } = useReminders();
  const { data: allCurrencies } = useGetAllCurrencies();
  const [isSettleModalOpen, setIsSettleModalOpen] = useState(false);
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);
  const [isAddExpenseModalOpen, setIsAddExpenseModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [settleFriendId, setSettleFriendId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"members" | "splits" | "activity">(
    "splits"
  );

  // Helper function to get currency symbol from the currencies data
  const getCurrencySymbol = (currencyId: string): string => {
    const currency = allCurrencies?.currencies?.find(c => c.id === currencyId);
    return currency?.symbol || currencyId;
  };

  // Helper function to format currency using actual symbols from API
  const formatCurrency = (amount: number, currencyId: string): string => {
    const symbol = getCurrencySymbol(currencyId);
    // For currencies like JPY, don't show decimals
    const decimals = currencyId === 'JPY' ? 0 : 2;
    return `${symbol}${amount.toFixed(decimals)}`;
  };

  // State for group settings form
  const [groupSettings, setGroupSettings] = useState({
    name: "",
    currency: "ETH",
    lockPrice: true,
    memberEmail: "",
  });

  // Initialize settings from group data when it loads
  useEffect(() => {
    if (group) {
      setGroupSettings((prev) => ({
        ...prev,
        name: group.name,
        currency: group.defaultCurrency || "ETH",
      }));
    }
  }, [group]);

  const deleteGroupMutation = useDeleteGroup();
  const updateGroupMutation = useUpdateGroup();

  // Handle delete group action
  const handleDeleteGroup = () => {
    deleteGroupMutation.mutate(groupId, {
      onSuccess: () => {
        toast.success("Group deleted successfully");
        router.push("/groups");
      },
      onError: (error: any) => {
        toast.error(error?.message || "Failed to delete group");
      },
    });
  };

  const handleSendReminder = (receiverId: string, splitId: string) => {
    sendReminder({
      receiverId,
      reminderType: "SPLIT",
      splitId,
      content: "Please settle your balance in the group."
    });
  };

  const handleSettleFriendClick = (friendId: string) => {
    setSettleFriendId(friendId);
    setIsSettleModalOpen(true);
  };

  // Calculate the specific amount owed to a friend in this group
  const getSpecificDebtAmount = (friendId: string) => {
    if (!group || !user) return 0;
    
    // Find all balance entries for this friend in this group
    const balances = group.groupBalances.filter(
      (balance) => balance.userId === user.id && balance.firendId === friendId
    );
    
    // Return the total amount owed (could be positive or negative)
    return balances.reduce((sum, balance) => sum + balance.amount, 0);
  };

  // Get currency-specific debt information for a friend
  const getSpecificDebtByCurrency = (friendId: string) => {
    if (!group || !user) return {};
    
    const balances = group.groupBalances.filter(
      (balance) => balance.userId === user.id && balance.firendId === friendId
    );
    
    // Group by currency
    const debtByCurrency: Record<string, number> = {};
    balances.forEach(balance => {
      if (!debtByCurrency[balance.currency]) {
        debtByCurrency[balance.currency] = 0;
      }
      debtByCurrency[balance.currency] += balance.amount;
    });
    
    return debtByCurrency;
  };

  const markAsPaidMutation = useMarkAsPaid();

  const handleRemoveMember = async (memberId: string) => {
    try {
      await axios.delete(`${BACKEND_URL}/api/groups/${groupId}/members/${memberId}`, { withCredentials: true });
      toast.success("Member removed from group");
      window.location.reload();
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Failed to remove member");
    }
  };

  // Add this handler for the settings form
  const handleSettingsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateGroupMutation.mutate(
      {
        groupId,
        payload: {
          name: groupSettings.name,
          currency: groupSettings.currency,
        },
      },
      {
        onSuccess: () => {
          toast.success("Group settings updated successfully");
          setIsSettingsModalOpen(false);
        },
        onError: () => {
          toast.error("Failed to update group");
        },
      }
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-white/50" />
          <p className="text-mobile-base sm:text-base text-white/70">
            Loading group details...
          </p>
        </div>
      </div>
    );
  }

  if (!group) return null;
  if (!user) return null;

  const expenses = group?.expenses;

  return (
    <div className="w-full">
      <GroupInfoHeader
        groupId={params.id}
        onSettleClick={() => setIsSettleModalOpen(true)}
        onAddExpenseClick={() => setIsAddExpenseModalOpen(true)}
        onSettingsClick={() => setIsSettingsModalOpen(true)}
        group={group}
      />

      <div className="bg-[#101012] rounded-xl sm:rounded-3xl min-h-[calc(100vh-200px)]">
        {/* Tabs */}
        <div className="flex px-3 sm:px-4 pt-3 sm:pt-4 pb-2 gap-1 sm:gap-2 overflow-x-auto">
          <button
            className={`px-4 sm:px-6 py-1.5 sm:py-2 text-mobile-base sm:text-lg font-medium transition-colors rounded-full ${
              activeTab === "splits"
                ? "bg-[#333] text-white"
                : "text-white/60 hover:text-white/80"
            }`}
            onClick={() => setActiveTab("splits")}
          >
            Splits
          </button>
          <button
            className={`px-4 sm:px-6 py-1.5 sm:py-2 text-mobile-base sm:text-lg font-medium transition-colors rounded-full ${
              activeTab === "activity"
                ? "bg-[#333] text-white"
                : "text-white/60 hover:text-white/80"
            }`}
            onClick={() => setActiveTab("activity")}
          >
            Activity
          </button>
          <button
            className={`px-4 sm:px-6 py-1.5 sm:py-2 text-mobile-base sm:text-lg font-medium transition-colors rounded-full ${
              activeTab === "members"
                ? "bg-[#333] text-white"
                : "text-white/60 hover:text-white/80"
            }`}
            onClick={() => setActiveTab("members")}
          >
            Members
          </button>

          {/* Add Member Button - Always visible now */}
          <div className="ml-auto flex items-center">
            <button
              onClick={() => {
                setIsAddingMember(true);
                setIsAddMemberModalOpen(true);
              }}
              disabled={isAddingMember}
              className="flex items-center justify-center gap-1 sm:gap-2 rounded-full text-white hover:bg-white/5 h-8 sm:h-10 px-3 sm:px-4 text-mobile-sm sm:text-base transition-colors"
            >
              <Image
                alt="Add Member"
                src="/plus-sign-circle.svg"
                width={14}
                height={14}
                className="w-4 h-4 sm:w-5 sm:h-5"
              />
              <span className="text-mobile-sm sm:text-base">Add Member</span>
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-4 sm:p-6">
          {activeTab === "members" && (
            <div className="space-y-3 sm:space-y-4">
              {group.groupUsers.map((member) => {
                const isCurrentUser = member.user.id === user.id;
                return (
                  <div
                    key={member.user.id}
                    className="flex items-center justify-between p-3 sm:p-4 rounded-xl"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 sm:h-10 sm:w-10 overflow-hidden rounded-full">
                        <Image
                          src={
                            member.user.image ||
                            `https://api.dicebear.com/9.x/identicon/svg?seed=${member.user.id}`
                          }
                          alt={member.user.name || "User"}
                          width={40}
                          height={40}
                          className="h-full w-full object-cover"
                          onError={(e) => {
                            console.error(
                              `Error loading image for user ${member.user.id}`
                            );
                            const target = e.target as HTMLImageElement;
                            target.src = `https://api.dicebear.com/9.x/identicon/svg?seed=${member.user.id}`;
                          }}
                        />
                      </div>
                      <div>
                        <p className="text-mobile-base sm:text-base text-white font-medium">
                          {isCurrentUser ? "You" : member.user.name}
                        </p>
                        <p className="text-mobile-sm sm:text-base text-white/70">
                          {member.user.email}
                        </p>
                      </div>
                    </div>
                    {/* Only show delete button if not current user and current user is group creator */}
                    {!isCurrentUser && group.createdBy.id === user.id && (
                      <button
                        className="flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-full hover:bg-white/5 ml-1 sm:ml-2"
                        onClick={() => handleRemoveMember(member.user.id)}
                      >
                        <Trash2 className="h-4 w-4 sm:h-5 sm:w-5 text-white/70" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {activeTab === "splits" && (
            <div className="space-y-3 sm:space-y-4">
              {group.groupBalances.filter(balance => balance.userId !== balance.firendId && balance.amount !== 0).length === 0 ? (
                <div className="text-center py-8 sm:py-12 text-mobile-base sm:text-base text-white/60">
                  No splits available
                </div>
              ) : (
                group.groupUsers.map((member) => {
                  // Filter out self-balances
                  const balances = group?.groupBalances.filter(
                    (balance) => balance.userId === member.user.id && balance.userId !== balance.firendId
                  );
                
                // Correct logic: positive amount means userId owes to firendId
                // negative amount means firendId owes to userId
                const owedBalance = balances?.filter(
                  (balance) => balance.amount > 0  // member owes money (shows as "You owe" for current user)
                );
                const oweBalance = balances?.filter(
                  (balance) => balance.amount < 0  // member is owed money (shows as "Owes you" for current user)
                );

                // Group balances by currency
                const owedByCurrency = owedBalance?.reduce((acc, balance) => {
                  if (!acc[balance.currency]) {
                    acc[balance.currency] = 0;
                  }
                  acc[balance.currency] += Math.abs(balance.amount);
                  return acc;
                }, {} as Record<string, number>) || {};

                const oweByCurrency = oweBalance?.reduce((acc, balance) => {
                  if (!acc[balance.currency]) {
                    acc[balance.currency] = 0;
                  }
                  acc[balance.currency] += Math.abs(balance.amount);
                  return acc;
                }, {} as Record<string, number>) || {};

                // Check if there are any balances at all
                const hasOwedBalances = Object.keys(owedByCurrency).length > 0;
                const hasOweBalances = Object.keys(oweByCurrency).length > 0;

                // Skip users that have no debt relationship
                if (!hasOwedBalances && !hasOweBalances && member.user.id !== user?.id) {
                  return null;
                }

                // Determine if this is the current user or someone else
                const isCurrentUser = member.user.id === user?.id;
                // Only show the current user if they have debts to settle
                if (isCurrentUser && !hasOwedBalances && !hasOweBalances) {
                  return null;
                }

                return (
                  <div
                    key={member.user.id}
                    className="flex items-center justify-between p-3 sm:p-4 rounded-xl"
                  >
                    <div className="flex items-center gap-3 sm:gap-4">
                      <div className="h-10 w-10 sm:h-12 sm:w-12 overflow-hidden rounded-full">
                        <Image
                          src={
                            member.user.image ||
                            `https://api.dicebear.com/9.x/identicon/svg?seed=${member.user.id}`
                          }
                          alt={member.user.name || "User"}
                          width={48}
                          height={48}
                          className="h-full w-full object-cover"
                          onError={(e) => {
                            console.error(
                              `Error loading image for user ${member.user.id}`
                            );
                            const target = e.target as HTMLImageElement;
                            target.src = `https://api.dicebear.com/9.x/identicon/svg?seed=${member.user.id}`;
                          }}
                        />
                      </div>
                      <div>
                        <p className="text-mobile-base sm:text-lg font-medium text-white">
                          {isCurrentUser ? "You" : member.user.name}
                        </p>

                        {/* Show amounts owed by currency */}
                        {hasOwedBalances && !isCurrentUser && (
                          <div className="text-mobile-sm sm:text-base text-white/70">
                            Owes you{" "}
                            {Object.entries(owedByCurrency).map(([currency, amount], index) => (
                              <span key={currency}>
                                <span className="text-green-500">
                                  {formatCurrency(amount, currency)}
                                </span>
                                {index < Object.entries(owedByCurrency).length - 1 && ", "}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Show amounts owed by currency */}
                        {!isCurrentUser && hasOweBalances && (
                          <div className="text-mobile-sm sm:text-base text-white/70">
                            You owe{" "}
                            {Object.entries(oweByCurrency).map(([currency, amount], index) => (
                              <span key={currency}>
                                <span className="text-red-500">
                                  {formatCurrency(amount, currency)}
                                </span>
                                {index < Object.entries(oweByCurrency).length - 1 && ", "}
                              </span>
                            ))}
                          </div>
                        )}

                        {!hasOwedBalances && !hasOweBalances && (
                          <p className="text-mobile-sm sm:text-base text-white/70">
                            No Payment Requirement
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {!isCurrentUser && (
                        <div className="flex items-center gap-2">
                          {hasOwedBalances && (
                            <button
                              className="flex items-center justify-center gap-1 sm:gap-2 rounded-full border border-white/80 text-white h-8 sm:h-10 px-3 sm:px-4 text-mobile-sm sm:text-sm hover:bg-white/5 transition-colors"
                              onClick={() => {
                                const latestExpense = expenses && expenses.length > 0 ? expenses[0] : null;
                                if (latestExpense) {
                                  handleSendReminder(member.user.id, latestExpense.id);
                                }
                              }}
                              disabled={isSending}
                            >
                              <Clock className="h-3 w-3 sm:h-4 sm:w-4" />
                              <span className="hidden sm:inline">
                                {isSending ? "Sending..." : "Send a Reminder"}
                              </span>
                            </button>
                          )}

                          {hasOweBalances && (
                            <>
                              <button
                                className="flex items-center justify-center gap-1 sm:gap-2 rounded-full border border-white/80 text-white h-8 sm:h-10 px-3 sm:px-4 text-mobile-sm sm:text-sm hover:bg-white/5 transition-colors"
                                onClick={() => handleSettleFriendClick(member.user.id)}
                              >
                                <Image
                                  src="/coins-dollar.svg"
                                  alt="Settle Debts"
                                  width={16}
                                  height={16}
                                  className="h-3 w-3 sm:h-4 sm:w-4"
                                />
                                <span className="hidden sm:inline">
                                  Settle Debts
                                </span>
                              </button>

                              <button
                                className="flex items-center justify-center gap-1 sm:gap-2 rounded-full border border-white/80 text-white h-8 sm:h-10 px-3 sm:px-4 text-mobile-sm sm:text-sm hover:bg-white/5 transition-colors"
                                onClick={async () => {
                                  // For simplicity, mark the first currency balance as paid
                                  const firstCurrency = Object.keys(oweByCurrency)[0];
                                  const firstAmount = oweByCurrency[firstCurrency];
                                  
                                  markAsPaidMutation.mutate(
                                    {
                                      groupId,
                                      payload: {
                                        payerId: user.id,
                                        payeeId: member.user.id,
                                        amount: firstAmount,
                                        currency: firstCurrency,
                                        currencyType: "FIAT",
                                      },
                                    },
                                    {
                                      onSuccess: () => {
                                        toast.success(`Marked payment to ${member.user.name} as paid`, {
                                          description: "This will be recorded in your activity.",
                                        });
                                      },
                                      onError: (error) => {
                                        toast.error("Failed to mark as paid");
                                      },
                                    }
                                  );
                                }}
                                disabled={markAsPaidMutation.isPending}
                              >
                                <Image
                                  src="/checkmark-circle.svg"
                                  alt="Mark as Paid"
                                  width={16}
                                  height={16}
                                  className="h-3 w-3 sm:h-4 sm:w-4"
                                />
                                <span className="hidden sm:inline">
                                  Mark as Paid
                                </span>
                              </button>
                            </>
                          )}
                        </div>
                      )}

                      {/* Only show delete button if not current user and current user is group creator */}
                      {!isCurrentUser && group.createdBy.id === user.id && (
                        <button
                          className="flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-full hover:bg-white/5 ml-1 sm:ml-2"
                          onClick={() => handleRemoveMember(member.user.id)}
                        >
                          <Trash2 className="h-4 w-4 sm:h-5 sm:w-5 text-white/70" />
                        </button>
                      )}
                    </div>
                  </div>
                );
                })
              )}
            </div>
          )}

          {activeTab === "activity" && (
            <div className="space-y-3 sm:space-y-4">
              <h3 className="text-mobile-lg sm:text-xl font-medium text-white mb-3 sm:mb-4">
                Recent Activity
              </h3>

              {expenses && expenses.length > 0 ? (
                expenses.map((expense: any, index: number) => {
                  const paidBy = group?.groupUsers.find(
                    (user) => user.user.id === expense.paidBy
                  )?.user;

                  // For SETTLEMENT expenses, show a custom message
                  if (!paidBy) return null;

                  // Find payee for SETTLEMENT
                  let settlementPayee = null;
                  if (expense.splitType === "SETTLEMENT") {
                    // The payee is the participant with amount > 0
                    const payeeParticipant = (expense.expenseParticipants || []).find(
                      (p: any) => p.amount > 0
                    );
                    if (payeeParticipant) {
                      settlementPayee = group?.groupUsers.find(
                        (user) => user.user.id === payeeParticipant.userId
                      )?.user;
                    }
                  }

                  return (
                    <div
                      key={index}
                      className="p-3 sm:p-4 rounded-xl flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 sm:h-10 sm:w-10 overflow-hidden rounded-full">
                          <Image
                            src={
                              paidBy.image ||
                              `https://api.dicebear.com/9.x/identicon/svg?seed=${paidBy.id}`
                            }
                            alt={paidBy.name || "User"}
                            width={40}
                            height={40}
                            className="h-full w-full object-cover"
                            onError={(e) => {
                              console.error(
                                `Error loading image for user ${paidBy.id}`
                              );
                              const target = e.target as HTMLImageElement;
                              target.src = `https://api.dicebear.com/9.x/identicon/svg?seed=${paidBy.id}`;
                            }}
                          />
                        </div>
                        <div>
                          {expense.splitType === "SETTLEMENT" && settlementPayee ? (
                            <p className="text-mobile-base sm:text-base text-white">
                              <span className="font-medium">
                                {paidBy.id === user?.id ? "You" : paidBy.name}
                              </span>{" "}
                              marked payment to
                              {" "}
                              <span className="font-medium">
                                {settlementPayee.id === user?.id ? "you" : settlementPayee.name}
                              </span>{" "}
                              as settled
                            </p>
                          ) : (
                            <p className="text-mobile-base sm:text-base text-white">
                              <span className="font-medium">
                                {paidBy.id === user?.id ? "You" : paidBy.name}
                              </span>{" "}
                              added expense "{expense.name}"
                            </p>
                          )}
                          <p className="text-mobile-xs sm:text-sm text-white/60">
                            {new Date(expense.createdAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <div className="text-mobile-base sm:text-base text-white font-medium">
                        {formatCurrency(expense.amount, expense.currency || 'USD')}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-8 sm:py-12 text-mobile-base sm:text-base text-white/60">
                  No activity yet
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <SettleDebtsModal
        isOpen={isSettleModalOpen}
        onClose={() => {
          setIsSettleModalOpen(false);
          setSettleFriendId(null);
        }}
        balances={group.groupBalances}
        groupId={params.id}
        members={group.groupUsers.map((user) => user.user)}
        defaultCurrency={group.defaultCurrency}
        showIndividualView={settleFriendId !== null}
        selectedFriendId={settleFriendId}
        specificAmount={settleFriendId ? getSpecificDebtAmount(settleFriendId) : undefined}
        specificDebtByCurrency={settleFriendId ? getSpecificDebtByCurrency(settleFriendId) : undefined}
      />

      <AddMemberModal
        isOpen={isAddMemberModalOpen}
        onClose={() => {
          setIsAddMemberModalOpen(false);
          setIsAddingMember(false);
        }}
        groupId={params.id}
      />

      <AddExpenseModal
        isOpen={isAddExpenseModalOpen}
        onClose={() => setIsAddExpenseModalOpen(false)}
        groupId={params.id}
        members={group.groupUsers.map((member) => member.user)}
      />

      {/* Group Settings Modal */}
      {isSettingsModalOpen && (
        <div className="fixed inset-0 z-50 h-screen w-screen">
          <div
            className="fixed inset-0 bg-black/80 brightness-50"
            onClick={() => setIsSettingsModalOpen(false)}
          />
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-[450px] max-h-[90vh] overflow-auto">
            <div className="relative z-10 rounded-[20px] bg-black p-4 sm:p-6 border border-white/20">
              <h2 className="text-mobile-xl sm:text-2xl font-medium text-white mb-4 sm:mb-6">
                Group settings
              </h2>

              <form className="space-y-4 sm:space-y-6" onSubmit={handleSettingsSubmit}>
                <div>
                  <label
                    htmlFor="groupName"
                    className="block text-mobile-base sm:text-base text-white/80 mb-2"
                  >
                    Group Name
                  </label>
                  <input
                    type="text"
                    id="groupName"
                    value={groupSettings.name}
                    onChange={(e) =>
                      setGroupSettings((prev) => ({
                        ...prev,
                        name: e.target.value,
                      }))
                    }
                    className="w-full px-4 py-2 rounded-lg bg-[#1A1A1C] text-white border border-white/20 focus:outline-none focus:border-white/40"
                  />
                </div>

                <div>
                  <label
                    htmlFor="currency"
                    className="block text-mobile-base sm:text-base text-white/80 mb-2"
                  >
                    Default Currency
                  </label>
                  <CurrencyDropdown
                    selectedCurrencies={groupSettings.currency ? [groupSettings.currency] : []}
                    setSelectedCurrencies={(currencies) => {
                      setGroupSettings((prev) => ({
                        ...prev,
                        currency: currencies[0] || "",
                      }));
                    }}
                    showFiatCurrencies={false}
                  />
                </div>

                <div className="flex items-center justify-between">
                  
                  <TimeLockToggle
                    value={groupSettings.lockPrice}
                    onChange={(val) => setGroupSettings((prev) => ({ ...prev, lockPrice: val }))}
                  />
                </div>

                <div className="flex justify-end gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setIsSettingsModalOpen(false)}
                    className="px-4 py-2 rounded-lg text-white/80 hover:text-white"
                  >
                    Cancel
                  </button>
                <button
                  type="submit"
                    className="px-4 py-2 rounded-lg bg-white text-black hover:bg-white/90"
                >
                    Save Changes
                </button>
                </div>
              </form>

              <div className="mt-8 pt-6 border-t border-white/20">
                <button
                  onClick={handleDeleteGroup}
                  className="flex items-center gap-2 text-red-500 hover:text-red-400"
                >
                  <Trash2 className="h-4 w-4" />
                  <span>Delete Group</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
