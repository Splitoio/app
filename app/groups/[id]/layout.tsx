"use client";

import { GroupInfoHeader } from "@/components/group-info-header";
import { useAuthStore } from "@/stores/authStore";
import { useParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { SettleDebtsModal } from "@/components/settle-debts-modal";
import { AddMemberModal } from "@/components/add-member-modal";
import {
  useGetGroupById,
  useMarkAsPaid,
  useDeleteGroup,
  useUpdateGroup,
} from "@/features/groups/hooks/use-create-group";
import { AddExpenseModal } from "@/components/add-expense-modal";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useReminders } from "@/features/reminders/hooks/use-reminders";
import { useGetAllCurrencies } from "@/features/currencies/hooks/use-currencies";
import axios from "axios";
import CurrencyDropdown from "@/components/currency-dropdown";
import type { Currency } from "@/features/currencies/api/client";
import TimeLockToggle from "@/components/ui/TimeLockToggle";
import {
  GroupLayoutProvider,
  type GroupLayoutContextValue,
} from "@/contexts/group-layout-context";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

function GroupLayoutInner({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const groupId = typeof params.id === "string" ? params.id : params.id?.[0] ?? "";
  const { user } = useAuthStore();
  const { data: group, isLoading } = useGetGroupById(groupId, { type: "PERSONAL" });
  const { sendReminder, isSending } = useReminders();
  const { data: allCurrencies } = useGetAllCurrencies();
  const router = useRouter();

  const [isSettleModalOpen, setIsSettleModalOpen] = useState(false);
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);
  const [isAddExpenseModalOpen, setIsAddExpenseModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [settleFriendId, setSettleFriendId] = useState<string | null>(null);
  const [groupSettings, setGroupSettings] = useState({
    name: "",
    currency: "ETH",
    lockPrice: true,
    memberEmail: "",
  });

  const getCurrencySymbol = (currencyId: string): string => {
    const currency = allCurrencies?.currencies?.find((c) => c.id === currencyId);
    return currency?.symbol || currencyId;
  };

  const formatCurrency = (amount: number, currencyId: string): string => {
    const symbol = getCurrencySymbol(currencyId);
    const decimals = currencyId === "JPY" ? 0 : 2;
    return `${symbol}${amount.toFixed(decimals)}`;
  };

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
  const markAsPaidMutation = useMarkAsPaid();

  const handleDeleteGroup = () => {
    deleteGroupMutation.mutate(groupId, {
      onSuccess: () => {
        toast.success("Group deleted successfully");
        router.push("/groups");
      },
      onError: (error: unknown) => {
        toast.error((error as { message?: string })?.message || "Failed to delete group");
      },
    });
  };

  const handleSendReminder = (receiverId: string, splitId: string) => {
    sendReminder({
      receiverId,
      reminderType: "SPLIT",
      splitId,
      content: "Please settle your balance in the group.",
    });
  };

  const handleSettleFriendClick = (friendId: string) => {
    setSettleFriendId(friendId);
    setIsSettleModalOpen(true);
  };

  const getSpecificDebtAmount = (friendId: string) => {
    if (!group || !user) return 0;
    const balance = group.groupBalances.find(
      (b) => b.userId === user.id && b.firendId === friendId
    );
    return balance ? balance.amount : 0;
  };

  const getSpecificDebtByCurrency = (friendId: string) => {
    if (!group || !user) return {};
    const balance = group.groupBalances.find(
      (b) => b.userId === user.id && b.firendId === friendId
    );
    const debtByCurrency: Record<string, number> = {};
    if (balance && balance.amount !== 0) debtByCurrency[balance.currency] = balance.amount;
    return debtByCurrency;
  };

  const handleRemoveMember = async (memberId: string) => {
    try {
      await axios.delete(`${BACKEND_URL}/api/groups/${groupId}/members/${memberId}`, {
        withCredentials: true,
      });
      toast.success("Member removed from group");
      window.location.reload();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } };
      toast.error(err?.response?.data?.error || "Failed to remove member");
    }
  };

  const handleSettingsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateGroupMutation.mutate(
      {
        groupId,
        payload: { name: groupSettings.name, currency: groupSettings.currency },
      },
      {
        onSuccess: () => {
          toast.success("Group settings updated successfully");
          setIsSettingsModalOpen(false);
        },
        onError: () => toast.error("Failed to update group"),
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

  const isAdmin = group.createdBy?.id === user.id;

  const contextValue = {
    groupId,
    group,
    isLoading,
    isAdmin,
    openAddMember: () => setIsAddMemberModalOpen(true),
    openAddExpense: () => setIsAddExpenseModalOpen(true),
    openSettings: () => setIsSettingsModalOpen(true),
    openSettle: (friendId?: string | null) => {
      setSettleFriendId(friendId ?? null);
      setIsSettleModalOpen(true);
    },
    settleFriendId,
    getSpecificDebtAmount,
    getSpecificDebtByCurrency,
    handleSettleFriendClick,
    handleSendReminder,
    handleRemoveMember,
    markAsPaidMutation: markAsPaidMutation as GroupLayoutContextValue["markAsPaidMutation"],
    isSending,
    formatCurrency,
    defaultCurrency: user?.currency || group?.defaultCurrency || "USD",
  };

  return (
    <GroupLayoutProvider value={contextValue}>
      <div className="w-full">
        <GroupInfoHeader
          groupId={groupId}
          onSettleClick={() => setIsSettleModalOpen(true)}
          onAddExpenseClick={() => setIsAddExpenseModalOpen(true)}
          onSettingsClick={() => setIsSettingsModalOpen(true)}
          group={group}
        />

        <div className="bg-[#101012] rounded-xl sm:rounded-3xl min-h-[calc(100vh-200px)]">
          {children}
        </div>

        <SettleDebtsModal
          isOpen={isSettleModalOpen}
          onClose={() => {
            setIsSettleModalOpen(false);
            setSettleFriendId(null);
          }}
          balances={group.groupBalances}
          groupId={groupId}
          members={group.groupUsers.map((u) => u.user)}
          defaultCurrency={user?.currency || group.defaultCurrency}
          showIndividualView={settleFriendId !== null}
          selectedFriendId={settleFriendId}
          specificAmount={settleFriendId ? getSpecificDebtAmount(settleFriendId) : undefined}
          specificDebtByCurrency={
            settleFriendId ? getSpecificDebtByCurrency(settleFriendId) : undefined
          }
        />

        <AddMemberModal
          isOpen={isAddMemberModalOpen}
          onClose={() => setIsAddMemberModalOpen(false)}
          groupId={groupId}
        />

        <AddExpenseModal
          isOpen={isAddExpenseModalOpen}
          onClose={() => setIsAddExpenseModalOpen(false)}
          groupId={groupId}
          members={group.groupUsers.map((m) => m.user)}
        />

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
                        setGroupSettings((prev) => ({ ...prev, name: e.target.value }))
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
                      selectedCurrencies={
                        groupSettings.currency ? [groupSettings.currency] : []
                      }
                      setSelectedCurrencies={(currencies) =>
                        setGroupSettings((prev) => ({
                          ...prev,
                          currency: currencies[0] || "",
                        }))
                      }
                      mode="single"
                      showFiatCurrencies={true}
                      filterCurrencies={(currency: Currency) =>
                        currency.symbol !== "ETH" && currency.symbol !== "USDC"
                      }
                      disableChainCurrencies={true}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <TimeLockToggle
                      value={groupSettings.lockPrice}
                      onChange={(val) =>
                        setGroupSettings((prev) => ({ ...prev, lockPrice: val }))
                      }
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
    </GroupLayoutProvider>
  );
}

export default function GroupLayout({ children }: { children: React.ReactNode }) {
  return <GroupLayoutInner>{children}</GroupLayoutInner>;
}
