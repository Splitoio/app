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
import { AlertTriangle, Loader2, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { useReminders } from "@/features/reminders/hooks/use-reminders";
import { useGetAllCurrencies } from "@/features/currencies/hooks/use-currencies";
import axios from "axios";
import Link from "next/link";
import { A, T } from "@/lib/splito-design";
import {
  GroupLayoutProvider,
  type GroupLayoutContextValue,
} from "@/contexts/group-layout-context";
import { useGetSettlementPreference } from "@/features/user/hooks/use-update-profile";

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
  const [settleSpecificAmount, setSettleSpecificAmount] = useState<number | undefined>(undefined);
  const [settleSpecificMemberAmounts, setSettleSpecificMemberAmounts] = useState<Record<string, number> | undefined>(undefined);
  const [settleExpenseId, setSettleExpenseId] = useState<string | undefined>(undefined);
  const [groupSettings, setGroupSettings] = useState({ name: "" });
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [settlementBannerDismissed, setSettlementBannerDismissed] = useState(() => {
    if (typeof window === "undefined") return false;
    return sessionStorage.getItem("settlement-banner-dismissed") === "true";
  });
  const { data: settlementPref, isLoading: isSettlementLoading } = useGetSettlementPreference();

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
    const balances = group.groupBalances.filter(
      (b) => b.userId === user.id && b.firendId === friendId
    );
    const debtByCurrency: Record<string, number> = {};
    balances.forEach((b) => {
      if (b.amount !== 0) {
        debtByCurrency[b.currency] = (debtByCurrency[b.currency] ?? 0) + b.amount;
      }
    });
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
        payload: { name: groupSettings.name },
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
    openSettle: (friendId?: string | null, specificAmount?: number, specificMemberAmounts?: Record<string, number>, expenseId?: string) => {
      setSettleFriendId(friendId ?? null);
      setSettleSpecificAmount(specificAmount);
      setSettleSpecificMemberAmounts(specificMemberAmounts);
      setSettleExpenseId(expenseId);
      setIsSettleModalOpen(true);
    },
    settleFriendId,
    settleSpecificAmount,
    settleSpecificMemberAmounts,
    settleExpenseId,
    getSpecificDebtAmount,
    getSpecificDebtByCurrency,
    handleSettleFriendClick,
    handleSendReminder,
    handleRemoveMember,
    markAsPaidMutation: markAsPaidMutation as GroupLayoutContextValue["markAsPaidMutation"],
    isSending,
    formatCurrency,
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

        <div className="p-4 pt-0 sm:pt-0 sm:p-7">
          {!isSettlementLoading && (!settlementPref || settlementPref.length === 0) && !settlementBannerDismissed && (
            <div className="mb-4 flex items-center gap-3 rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-4 py-3">
              <AlertTriangle className="h-4 w-4 shrink-0 text-yellow-400" />
              <p className="flex-1 text-mobile-sm sm:text-sm text-yellow-200">
                You haven&apos;t set a settlement preference yet — others won&apos;t be able to pay you.{" "}
                <Link href="/settings" className="underline text-yellow-400 hover:text-yellow-300">
                  Set it up
                </Link>
              </p>
              <button
                onClick={() => {
                  setSettlementBannerDismissed(true);
                  sessionStorage.setItem("settlement-banner-dismissed", "true");
                }}
                className="shrink-0 rounded-md p-1 text-yellow-400 hover:bg-yellow-500/20"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
          {children}
        </div>

        <SettleDebtsModal
          isOpen={isSettleModalOpen}
          onClose={() => {
            setIsSettleModalOpen(false);
            setSettleFriendId(null);
            setSettleSpecificAmount(undefined);
            setSettleSpecificMemberAmounts(undefined);
            setSettleExpenseId(undefined);
          }}
          balances={group.groupBalances}
          groupId={groupId}
          members={group.groupUsers.map((u) => u.user)}
          expenses={group.expenses}
          defaultCurrency={user?.currency || "USD"}
          showIndividualView={false}
          defaultExpandedMemberId={settleFriendId}
          specificAmount={settleSpecificAmount}
          specificMemberAmounts={settleSpecificMemberAmounts}
          expenseId={settleExpenseId}
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
          defaultCurrency={user?.currency || "USD"}
        />

        {isSettingsModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <div
              className="fixed inset-0"
              style={{ background: "rgba(0,0,0,0.88)", backdropFilter: "blur(16px)" }}
              onClick={() => {
                setIsSettingsModalOpen(false);
                setConfirmDelete(false);
              }}
            />
            <div
              className="relative z-10 w-full max-w-[460px] rounded-[28px] p-7"
              style={{
                background: "linear-gradient(160deg, #141414 0%, #0f0f0f 100%)",
                border: "1px solid rgba(255,255,255,0.09)",
                boxShadow: "0 40px 100px rgba(0,0,0,0.8)",
                animation: "mIn 0.3s cubic-bezier(.34,1.56,.64,1)",
              }}
            >
              <div className="flex items-start justify-between mb-6">
                <div>
                  <p style={{ color: "#fff", fontSize: 20, fontWeight: 800, letterSpacing: "-0.02em" }}>
                    Group settings
                  </p>
                  <p style={{ color: T.mid, fontSize: 12, marginTop: 4 }}>
                    Rename your group or delete it permanently.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setIsSettingsModalOpen(false);
                    setConfirmDelete(false);
                  }}
                  style={{
                    background: "rgba(255,255,255,0.07)",
                    border: "1px solid rgba(255,255,255,0.10)",
                    color: "rgba(255,255,255,0.60)",
                    width: 34,
                    height: 34,
                    borderRadius: "50%",
                    cursor: "pointer",
                    fontSize: 18,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  ×
                </button>
              </div>

              <form onSubmit={handleSettingsSubmit}>
                <div className="mb-5">
                  <label
                    htmlFor="groupName"
                    style={{
                      color: "rgba(204,204,204,0.9)",
                      fontSize: 11,
                      fontWeight: 700,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      marginBottom: 8,
                      display: "block",
                    }}
                  >
                    Group Name
                  </label>
                  <input
                    id="groupName"
                    type="text"
                    value={groupSettings.name}
                    onChange={(e) =>
                      setGroupSettings((prev) => ({ ...prev, name: e.target.value }))
                    }
                    style={{
                      width: "100%",
                      background: "rgba(255,255,255,0.05)",
                      border: "1.5px solid rgba(255,255,255,0.09)",
                      borderRadius: 14,
                      padding: "12px 16px",
                      color: "#fff",
                      fontSize: 14,
                      outline: "none",
                      boxSizing: "border-box",
                      fontFamily: "inherit",
                      fontWeight: 500,
                    }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={updateGroupMutation.isPending || !groupSettings.name.trim()}
                  style={{
                    width: "100%",
                    padding: "13px",
                    background: groupSettings.name.trim() ? A : "rgba(255,255,255,0.05)",
                    color: groupSettings.name.trim() ? "#0a0a0a" : "#555",
                    border: "none",
                    borderRadius: 14,
                    fontSize: 14,
                    fontWeight: 800,
                    cursor: groupSettings.name.trim() ? "pointer" : "default",
                    fontFamily: "inherit",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    transition: "all 0.2s",
                  }}
                >
                  {updateGroupMutation.isPending ? (
                    <>
                      <Loader2 style={{ width: 16, height: 16, animation: "spin 0.8s linear infinite" }} />
                      Saving…
                    </>
                  ) : (
                    "Save changes"
                  )}
                </button>
              </form>

              <div
                className="mt-6 pt-6"
                style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}
              >
                {!confirmDelete ? (
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(true)}
                    style={{
                      width: "100%",
                      padding: "12px",
                      background: "rgba(248,113,113,0.08)",
                      border: "1px solid rgba(248,113,113,0.25)",
                      color: "#F87171",
                      borderRadius: 14,
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: "pointer",
                      fontFamily: "inherit",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete group
                  </button>
                ) : (
                  <div>
                    <p style={{ color: T.mid, fontSize: 12, marginBottom: 10, lineHeight: 1.5 }}>
                      This permanently deletes the group. All balances must be settled first.
                    </p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setConfirmDelete(false)}
                        style={{
                          flex: 1,
                          padding: "12px",
                          background: "rgba(255,255,255,0.05)",
                          border: "1px solid rgba(255,255,255,0.09)",
                          color: "#f5f5f5",
                          borderRadius: 14,
                          fontSize: 13,
                          fontWeight: 700,
                          cursor: "pointer",
                          fontFamily: "inherit",
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleDeleteGroup}
                        disabled={deleteGroupMutation.isPending}
                        style={{
                          flex: 1,
                          padding: "12px",
                          background: "#F87171",
                          border: "none",
                          color: "#0a0a0a",
                          borderRadius: 14,
                          fontSize: 13,
                          fontWeight: 800,
                          cursor: deleteGroupMutation.isPending ? "default" : "pointer",
                          fontFamily: "inherit",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 8,
                          opacity: deleteGroupMutation.isPending ? 0.7 : 1,
                        }}
                      >
                        {deleteGroupMutation.isPending ? (
                          <>
                            <Loader2 style={{ width: 14, height: 14, animation: "spin 0.8s linear infinite" }} />
                            Deleting…
                          </>
                        ) : (
                          "Delete forever"
                        )}
                      </button>
                    </div>
                  </div>
                )}
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
