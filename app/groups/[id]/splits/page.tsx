"use client";

import Image from "next/image";
import { Clock, ChevronDown, ChevronUp } from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useGroupLayout } from "@/contexts/group-layout-context";
import { useAuthStore } from "@/stores/authStore";
import { useConvertedBalanceTotal } from "@/features/currencies/hooks/use-currencies";

type BalanceItem = { amount: number; currency: string };

type ExpenseForBreakdown = {
  id: string;
  name: string;
  amount: number;
  currency: string;
  paidBy: string;
  createdAt: Date | string;
  splitType?: string;
  expenseParticipants?: { userId: string; amount: number }[];
};

function FriendBalanceRow({
  friend,
  owedBalances,
  oweBalances,
  defaultCurrency,
  formatCurrency,
  onNotify,
  onSettle,
  onMarkAsPaid,
  isSending,
  isMarkAsPaidPending,
  expenses,
  groupUsers,
  currentUserId,
  currentUserName,
}: {
  friend: { id: string; name: string | null; image: string | null };
  owedBalances: BalanceItem[];
  oweBalances: BalanceItem[];
  defaultCurrency: string;
  formatCurrency: (amount: number, currencyId: string) => string;
  onNotify: () => void;
  onSettle: () => void;
  onMarkAsPaid: (payload: {
    payerId: string;
    payeeId: string;
    amount: number;
    currency: string;
    currencyType: string;
  }) => void;
  isSending: boolean;
  isMarkAsPaidPending: boolean;
  expenses: ExpenseForBreakdown[];
  groupUsers: { user: { id: string; name: string | null; image: string | null } }[];
  currentUserId: string;
  currentUserName: string | null;
}) {
  const [expanded, setExpanded] = useState(false);

  const { total: totalOwed, isLoading: loadingOwed } = useConvertedBalanceTotal(
    owedBalances.map((b) => ({ amount: b.amount, currency: b.currency })),
    defaultCurrency
  );
  const { total: totalOwe, isLoading: loadingOwe } = useConvertedBalanceTotal(
    oweBalances.map((b) => ({ amount: Math.abs(b.amount), currency: b.currency })),
    defaultCurrency
  );

  const hasOwedBalances = owedBalances.length > 0;
  const hasOweBalances = oweBalances.length > 0;
  const converting = loadingOwed || loadingOwe;

  const expensesWithFriend = useMemo(() => {
    return expenses.filter((exp) => {
      if (exp.splitType === "SETTLEMENT") return false;
      const paidByMe = exp.paidBy === currentUserId;
      const paidByFriend = exp.paidBy === friend.id;
      const participants = exp.expenseParticipants ?? [];
      const myPart = participants.find((p) => p.userId === currentUserId);
      const friendPart = participants.find((p) => p.userId === friend.id);
      const involvesMe = paidByMe || (myPart != null && myPart.amount !== 0);
      const involvesFriend = paidByFriend || (friendPart != null && friendPart.amount !== 0);
      return involvesMe && involvesFriend;
    });
  }, [expenses, currentUserId, friend.id]);

  return (
    <div className="rounded-xl overflow-hidden">
      <div className="flex items-center justify-between p-3 sm:p-4">
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0 text-left"
        >
          <div className="h-10 w-10 sm:h-12 sm:w-12 overflow-hidden rounded-full flex-shrink-0">
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
                const target = e.target as HTMLImageElement;
                target.src = `https://api.dicebear.com/9.x/identicon/svg?seed=${friend.id}`;
              }}
            />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-mobile-base sm:text-lg font-medium text-white">
              {friend.name}
            </p>
            {hasOwedBalances && (
              <div className="text-mobile-sm sm:text-base text-white/70">
                <span className="text-red-500">
                  You owe{" "}
                  {converting ? "…" : formatCurrency(totalOwed, defaultCurrency)}
                </span>
              </div>
            )}
            {hasOweBalances && (
              <div className="text-mobile-sm sm:text-base text-white/70">
                <span className="text-green-500">
                  Owes you{" "}
                  {converting ? "…" : formatCurrency(totalOwe, defaultCurrency)}
                </span>
              </div>
            )}
          </div>
          <span className="text-white/50 flex-shrink-0 ml-1">
            {expanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
          </span>
        </button>

        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
          {hasOweBalances && (
            <button
              className="flex items-center justify-center gap-1 sm:gap-2 rounded-full border border-white/80 text-white h-8 sm:h-10 px-3 sm:px-4 text-mobile-sm sm:text-sm hover:bg-white/5 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                onNotify();
              }}
              disabled={isSending}
            >
              <Clock className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">
                {isSending ? "Sending..." : "Notify"}
              </span>
            </button>
          )}
          {hasOwedBalances && (
            <>
              <button
                className="flex items-center justify-center gap-1 sm:gap-2 rounded-full border border-white/80 text-white h-8 sm:h-10 px-3 sm:px-4 text-mobile-sm sm:text-sm hover:bg-white/5 transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  onSettle();
                }}
              >
                <Image
                  src="/coins-dollar.svg"
                  alt="Settle Debts"
                  width={16}
                  height={16}
                  className="h-3 w-3 sm:h-4 sm:w-4"
                />
                <span className="hidden sm:inline">Settle Debts</span>
              </button>
              <button
                className="flex items-center justify-center gap-1 sm:gap-2 rounded-full border border-white/80 text-white h-8 sm:h-10 px-3 sm:px-4 text-mobile-sm sm:text-sm hover:bg-white/5 transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  const first = owedBalances[0];
                  if (first) {
                    onMarkAsPaid({
                      payerId: currentUserId,
                      payeeId: friend.id,
                      amount: Math.abs(first.amount),
                      currency: first.currency,
                      currencyType: "FIAT",
                    });
                  }
                }}
                disabled={isMarkAsPaidPending}
              >
                <Image
                  src="/checkmark-circle.svg"
                  alt="Mark as Paid"
                  width={16}
                  height={16}
                  className="h-3 w-3 sm:h-4 sm:w-4"
                />
                <span className="hidden sm:inline">Mark as Paid</span>
              </button>
            </>
          )}
        </div>
      </div>

      {expanded && (hasOwedBalances || hasOweBalances) && (
        <div
          className="pt-0 pb-3 sm:pb-4 space-y-2"
          onClick={(e) => e.stopPropagation()}
        >
          {expensesWithFriend.length > 0 && (
            <div className="space-y-2">
              <p className="text-mobile-sm sm:text-base text-white/60 px-3 sm:px-4">
                Expenses
              </p>
              {expensesWithFriend.map((expense) => {
                const paidByUser = groupUsers.find((gu) => gu.user.id === expense.paidBy)?.user;
                const paidByName =
                  expense.paidBy === currentUserId ? (currentUserName || "You") : (paidByUser?.name ?? "Someone");
                const friendPart = expense.expenseParticipants?.find((p) => p.userId === friend.id);
                const myPart = expense.expenseParticipants?.find((p) => p.userId === currentUserId);
                const friendOwesMe = expense.paidBy === currentUserId && friendPart && friendPart.amount > 0;
                const iOweFriend = expense.paidBy === friend.id && myPart && myPart.amount > 0;
                const shareAmount = friendOwesMe ? friendPart!.amount : iOweFriend ? myPart!.amount : 0;
                const shareLabel = friendOwesMe ? "Owes you" : iOweFriend ? "You owe" : null;
                const showShare = shareLabel && shareAmount > 0;

                return (
                  <div
                    key={expense.id}
                    className="flex items-center justify-between p-3 sm:p-4 rounded-xl text-left"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="h-8 w-8 sm:h-10 sm:w-10 overflow-hidden rounded-full flex-shrink-0">
                        <Image
                          src={
                            paidByUser?.image ||
                            `https://api.dicebear.com/9.x/identicon/svg?seed=${expense.paidBy}`
                          }
                          alt={paidByName}
                          width={40}
                          height={40}
                          className="h-full w-full object-cover"
                          onError={(e) => {
                            const t = e.target as HTMLImageElement;
                            t.src = `https://api.dicebear.com/9.x/identicon/svg?seed=${expense.paidBy}`;
                          }}
                        />
                      </div>
                      <div className="min-w-0">
                        <p className="text-mobile-base sm:text-base text-white">
                          <span className="font-medium">{paidByName}</span> paid for &quot;{expense.name}&quot;
                        </p>
                        <p className="text-mobile-xs sm:text-sm text-white/60">
                          {new Date(expense.createdAt).toLocaleString()}
                          {showShare && (
                            <span className={friendOwesMe ? " text-green-500/90" : " text-red-500/90"}>
                              {" · "}{shareLabel}{" "}
                              <span className="text-white/70">{formatCurrency(shareAmount, expense.currency)}</span>
                              <span className="text-white/50 text-mobile-xs"> (your share)</span>
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 ml-2">
                      <p className="text-mobile-xs sm:text-xs text-white/50 mb-0.5">Total</p>
                      <p className="text-mobile-base sm:text-base text-white font-medium">
                        {formatCurrency(expense.amount, expense.currency)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="px-3 sm:px-4 pt-1">
            <p className="text-mobile-xs sm:text-sm text-white/50 mb-1.5">Balance by currency</p>
            <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-mobile-sm sm:text-base text-white/70">
              {hasOwedBalances && (
                <span>
                  <span className="text-red-500/90">You owe: </span>
                  {owedBalances.map((b, i) => (
                    <span key={i}>
                      {formatCurrency(Math.abs(b.amount), b.currency)}
                      {i < owedBalances.length - 1 ? ", " : ""}
                    </span>
                  ))}
                </span>
              )}
              {hasOweBalances && (
                <span>
                  <span className="text-green-500/90">Owes you: </span>
                  {oweBalances.map((b, i) => (
                    <span key={i}>
                      {formatCurrency(Math.abs(b.amount), b.currency)}
                      {i < oweBalances.length - 1 ? ", " : ""}
                    </span>
                  ))}
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function GroupSplitsPage() {
  const { user } = useAuthStore();
  const {
    group,
    groupId,
    formatCurrency,
    defaultCurrency,
    handleSettleFriendClick,
    handleSendReminder,
    markAsPaidMutation,
    isSending,
    openAddExpense,
  } = useGroupLayout();

  if (!group || !user) return null;

  const expenses = group.expenses;
  const currentUserBalances = group.groupBalances.filter(
    (balance) => balance.userId === user.id && balance.amount !== 0
  );

  if (currentUserBalances.length === 0) {
    return (
      <div className="p-4 sm:p-6">
        <div className="text-center py-8 sm:py-12 text-mobile-base sm:text-base text-white/60">
          Start by adding your first expense
          <Button onClick={openAddExpense} className="mt-4">
            Add Expense
          </Button>
        </div>
      </div>
    );
  }

  const balancesByFriend = currentUserBalances.reduce(
    (acc, balance) => {
      if (!acc[balance.firendId]) acc[balance.firendId] = [];
      acc[balance.firendId].push(balance);
      return acc;
    },
    {} as Record<string, typeof currentUserBalances>
  );

  return (
    <div className="p-4 sm:p-6 space-y-3 sm:space-y-4">
      {Object.entries(balancesByFriend).map(([friendId, balances]) => {
        const friend = group.groupUsers.find((gu) => gu.user.id === friendId)?.user;
        if (!friend) return null;

        const owedBalances = balances.filter((b) => b.amount > 0);
        const oweBalances = balances.filter((b) => b.amount < 0);

        return (
          <FriendBalanceRow
            key={friendId}
            friend={friend}
            owedBalances={owedBalances.map((b) => ({ amount: b.amount, currency: b.currency }))}
            oweBalances={oweBalances.map((b) => ({ amount: b.amount, currency: b.currency }))}
            defaultCurrency={defaultCurrency}
            formatCurrency={formatCurrency}
            onNotify={() => {
              const latestExpense = expenses?.length ? expenses[0] : null;
              if (latestExpense) handleSendReminder(friend.id, latestExpense.id);
            }}
            onSettle={() => handleSettleFriendClick(friend.id)}
            onMarkAsPaid={(payload) =>
              markAsPaidMutation.mutate(
                { groupId, payload },
                {
                  onSuccess: () =>
                    toast.success(`Marked payment to ${friend.name} as paid`, {
                      description: "This will be recorded in your activity.",
                    }),
                  onError: () => toast.error("Failed to mark as paid"),
                }
              )
            }
            isSending={isSending}
            isMarkAsPaidPending={markAsPaidMutation.isPending}
            expenses={group.expenses ?? []}
            groupUsers={group.groupUsers}
            currentUserId={user.id}
            currentUserName={user.name ?? null}
          />
        );
      })}
    </div>
  );
}
